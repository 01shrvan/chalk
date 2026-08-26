import Anthropic from "@anthropic-ai/sdk";
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

const MODEL = "claude-opus-5";

export type Answer =
  | { kind: "drawn"; spec: Spec; attempts: number }
  | { kind: "declined"; reason: string; prose: string };

export class MissingKey extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not set");
  }
}

function client() {
  if (!process.env.ANTHROPIC_API_KEY) throw new MissingKey();
  return new Anthropic();
}

const Verdict = z.object({
  drawable: z.boolean(),
  form: z.enum([...FORMS, "none"]),
  because: z.string().min(1).max(240),
});

const CLASSIFY_SYSTEM = `You decide whether a question can honestly be answered with a diagram.

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

const GENERATE_SYSTEM = `You produce the structure of a diagram that gets drawn one
piece at a time, the way a teacher builds it at a whiteboard.

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
- Use "emphasise" for ids already added by an earlier step. Never emphasise
  something that has not appeared.
- Every node and edge must be added by exactly one step.
- Labels are terse. They sit inside shapes.
- 4 to 7 steps. Fewer than 4 is a picture, not an explanation.

Write plainly. No filler, no "let's dive in", no exclamation marks.`;

function schemaFor(form: Form) {
  const json = zodToJsonSchema(SPEC_BY_FORM[form], {
    target: "openApi3",
    $refStrategy: "none",
  });
  return json as Record<string, unknown>;
}

async function classify(question: string): Promise<z.infer<typeof Verdict>> {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 1000,
    system: CLASSIFY_SYSTEM,
    output_config: {
      effort: "low",
      format: {
        type: "json_schema",
        schema: zodToJsonSchema(Verdict, { target: "openApi3", $refStrategy: "none" }) as Record<
          string,
          unknown
        >,
      },
    },
    messages: [{ role: "user", content: question }],
  });

  const text = res.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("classifier returned no text");
  return Verdict.parse(JSON.parse(text.text));
}

async function draft(question: string, form: Form, priorProblems?: string[]): Promise<unknown> {
  const repair = priorProblems?.length
    ? `\n\nYour previous attempt was rejected. Fix exactly these and change nothing else:\n${priorProblems
        .map((p) => `- ${p}`)
        .join("\n")}`
    : "";

  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: GENERATE_SYSTEM,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: { type: "json_schema", schema: schemaFor(form) },
    },
    messages: [
      {
        role: "user",
        content: `Question: ${question}\n\nForm: ${form} — ${FORM_BLURB[form]}${repair}`,
      },
    ],
  });

  const text = res.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("generator returned no text");
  return JSON.parse(text.text);
}

async function prose(question: string, because: string): Promise<string> {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 1200,
    output_config: { effort: "low" },
    system: `Answer the question directly in two or three short paragraphs. Plain
prose, no headings, no lists, no preamble. The reader has just been told this
question does not suit a diagram, so do not apologise or mention diagrams.`,
    messages: [{ role: "user", content: question }],
  });

  const text = res.content.find((b) => b.type === "text");
  return text && text.type === "text" ? text.text : because;
}

export async function ask(question: string): Promise<Answer> {
  const verdict = await classify(question);

  if (!verdict.drawable || verdict.form === "none") {
    return {
      kind: "declined",
      reason: verdict.because,
      prose: await prose(question, verdict.because),
    };
  }

  const form = verdict.form;
  let problems: string[] | undefined;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const raw = await draft(question, form, problems);
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
