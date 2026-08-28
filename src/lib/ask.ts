import { GoogleGenAI } from "@google/genai";
import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";
import {
  FORMS,
  FORM_BLURB,
  SPEC_BY_FORM,
  checkReferences,
  type Form,
  type Spec,
} from "./forms";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";

export type Answer =
  | { kind: "drawn"; spec: Spec; attempts: number }
  | { kind: "declined"; reason: string; prose: string };

export class MissingKey extends Error {
  constructor() {
    super("GEMINI_API_KEY is not set");
  }
}

function client() {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new MissingKey();
  return new GoogleGenAI({ apiKey });
}

const DROP = new Set([
  "$schema",
  "additionalProperties",
  "default",
  "definitions",
  "$ref",
  "allOf",
  "oneOf",
  "anyOf",
  "not",
  "const",
  "minLength",
  "maxLength",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "pattern",
]);

function forGemini(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(forGemini);
  if (node === null || typeof node !== "object") return node;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (DROP.has(key)) continue;
    if (key === "properties" && value && typeof value === "object") {
      const props: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        props[k] = forGemini(v);
      }
      out[key] = props;
      continue;
    }
    out[key] = forGemini(value);
  }
  return out;
}

function schemaFor(shape: z.ZodTypeAny) {
  return forGemini(
    zodToJsonSchema(shape, { target: "openApi3", $refStrategy: "none" }),
  ) as Record<string, unknown>;
}

async function json<T>(
  systemInstruction: string,
  prompt: string,
  shape: z.ZodType<T>,
): Promise<T> {
  const res = await client().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: schemaFor(shape),
      temperature: 0.4,
    },
  });

  const text = res.text;
  if (!text) throw new Error("model returned no text");
  return shape.parse(JSON.parse(text));
}

const Verdict = z.object({
  drawable: z.boolean(),
  form: z.enum([...FORMS, "none"]),
  because: z.string(),
});

const CLASSIFY = `You decide whether a question can honestly be answered with a diagram.

Most questions cannot. A diagram needs named parts and a relationship between them:
things passing messages, something moving through stages, or two approaches placed
side by side. A question about causes, opinions, values, definitions, recipes or
history has no such structure, and drawing boxes for it produces something that
looks explanatory and teaches nothing.

The available forms are the only ones that exist. There is no generic flowchart.

${FORMS.map((f) => `- ${f}: ${FORM_BLURB[f]}`).join("\n")}

Set drawable true only when one of those three genuinely fits. If the subject is
technical but the question is about motivation, tradeoffs in the abstract, or
"why does X matter", that is prose, not a diagram.

Being wrong in either direction is costly. Refusing a real protocol question makes
the product look broken. Drawing a shrug makes it look stupid.

"because" is one sentence, addressed to the person asking, explaining your call.`;

const GENERATE = `You produce the structure of a diagram that gets drawn one piece
at a time, the way a teacher builds it at a whiteboard.

You never place anything. No coordinates, no sizes, no positions — a layout engine
does that. You choose what exists and the order it appears in.

The order is the explanation. Rules:

- Step 1 establishes the participants or the starting state, and says why they
  matter. Never open with a detail.
- Each later step adds the smallest meaningful piece and says one sentence about it.
- Every step's "say" must describe what appears in THAT step. If the narration and
  the drawing disagree, the whole thing is worthless.
- The final step earns its place by changing what the reader thought. Circle
  something already drawn with "emphasise" and explain the thing people get wrong —
  why a step is not a formality, what a name hides, which part is load-bearing. Put
  the sharp version in "aside" as a short line.
- Use "emphasise" only for ids an earlier step already added.
- Every node and edge must be added by exactly one step.
- Labels are terse. They sit inside shapes. Keep node labels under 24 characters
  and edge labels under 40.
- 4 to 7 steps. Fewer than 4 is a picture, not an explanation.

Write plainly. No filler, no "let's dive in", no exclamation marks.`;

const PROSE = `Answer the question directly in two or three short paragraphs. Plain
prose, no headings, no lists, no preamble. The reader has just been told this
question does not suit a diagram, so do not apologise or mention diagrams.`;

async function prose(question: string, fallback: string): Promise<string> {
  try {
    const res = await client().models.generateContent({
      model: MODEL,
      contents: question,
      config: { systemInstruction: PROSE, temperature: 0.6 },
    });
    return res.text ?? fallback;
  } catch {
    return fallback;
  }
}

export async function ask(question: string): Promise<Answer> {
  const verdict = await json(CLASSIFY, question, Verdict);

  if (!verdict.drawable || verdict.form === "none") {
    return {
      kind: "declined",
      reason: verdict.because,
      prose: await prose(question, verdict.because),
    };
  }

  const form: Form = verdict.form;
  let problems: string[] | undefined;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const repair = problems?.length
      ? `\n\nYour previous attempt was rejected. Fix exactly these and change nothing else:\n${problems
          .map((p) => `- ${p}`)
          .join("\n")}`
      : "";

    let raw: unknown;
    try {
      const res = await client().models.generateContent({
        model: MODEL,
        contents: `Question: ${question}\n\nForm: ${form} — ${FORM_BLURB[form]}${repair}`,
        config: {
          systemInstruction: GENERATE,
          responseMimeType: "application/json",
          responseSchema: schemaFor(SPEC_BY_FORM[form]),
          temperature: 0.5,
        },
      });
      if (!res.text) throw new Error("empty response");
      raw = JSON.parse(res.text);
    } catch (error) {
      problems = [String(error instanceof Error ? error.message : error)];
      continue;
    }

    const parsed = SPEC_BY_FORM[form].safeParse(raw);
    if (!parsed.success) {
      problems = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
      continue;
    }

    const spec = parsed.data as Spec;
    const refs = checkReferences(spec);
    if (refs.ok) return { kind: "drawn", spec, attempts: attempt };
    problems = refs.problems;
  }

  return {
    kind: "declined",
    reason: "The diagram came back malformed twice, so it is not worth showing you.",
    prose: await prose(question, verdict.because),
  };
}
