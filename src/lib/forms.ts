import { z } from "zod";

export const FORMS = ["sequence", "dataflow", "comparison"] as const;
export type Form = (typeof FORMS)[number];

export const FORM_BLURB: Record<Form, string> = {
  sequence:
    "messages passing between named parties in time order — protocols, handshakes, request flows, auth exchanges",
  dataflow:
    "something moving through stages and being transformed — pipelines, architectures, model internals, build steps",
  comparison:
    "two approaches placed side by side so the difference is visible — this versus that, before and after",
};

const id = z.string().min(1).max(40);

const Step = z.object({
  say: z.string().min(1).max(400),
  add: z.array(id),
  emphasise: z.array(id),
  aside: z.string().max(160),
});

const base = {
  topic: z.string().min(1).max(80),
  summary: z.string().min(1).max(200),
  steps: z.array(Step).min(3).max(9),
};

export const SequenceSpec = z.object({
  form: z.literal("sequence"),
  ...base,
  lanes: z.array(z.string().min(1).max(24)).min(2).max(5),
  nodes: z.array(
    z.object({ id, label: z.string().min(1).max(24), lane: z.number().int().min(0).max(4) }),
  ),
  edges: z.array(
    z.object({
      id,
      from: id,
      to: id,
      label: z.string().max(48),
      kind: z.enum(["forward", "back"]),
    }),
  ),
});

export const DataflowSpec = z.object({
  form: z.literal("dataflow"),
  ...base,
  nodes: z.array(
    z.object({
      id,
      label: z.string().min(1).max(40),
      kind: z.enum(["io", "op", "main", "add"]),
    }),
  ),
  edges: z.array(
    z.object({
      id,
      from: id,
      to: id,
      label: z.string().max(24),
      kind: z.enum(["link", "skip"]),
    }),
  ),
});

export const ComparisonSpec = z.object({
  form: z.literal("comparison"),
  ...base,
  columns: z.tuple([z.string().min(1).max(24), z.string().min(1).max(24)]),
  nodes: z.array(
    z.object({
      id,
      label: z.string().min(1).max(12),
      kind: z.enum(["node", "result", "rewritten"]),
      col: z.number().int().min(0).max(1),
      row: z.number().int().min(0).max(6),
      track: z.number().int().min(0).max(2),
    }),
  ),
  edges: z.array(z.object({ id, from: id, to: id })),
});

export const SPEC_BY_FORM = {
  sequence: SequenceSpec,
  dataflow: DataflowSpec,
  comparison: ComparisonSpec,
} as const;

export type SequenceSpecT = z.infer<typeof SequenceSpec>;
export type DataflowSpecT = z.infer<typeof DataflowSpec>;
export type ComparisonSpecT = z.infer<typeof ComparisonSpec>;
export type Spec = SequenceSpecT | DataflowSpecT | ComparisonSpecT;

export type Referential = {
  ok: boolean;
  problems: string[];
};

export function checkReferences(spec: Spec): Referential {
  const problems: string[] = [];
  const nodeIds = new Set(spec.nodes.map((n) => n.id));
  const edgeIds = new Set(spec.edges.map((e) => e.id));
  const all = new Set([...nodeIds, ...edgeIds]);

  if (nodeIds.size !== spec.nodes.length) problems.push("duplicate node ids");
  if (edgeIds.size !== spec.edges.length) problems.push("duplicate edge ids");

  for (const e of spec.edges) {
    if (!nodeIds.has(e.from)) problems.push(`edge ${e.id} starts at unknown node ${e.from}`);
    if (!nodeIds.has(e.to)) problems.push(`edge ${e.id} ends at unknown node ${e.to}`);
  }

  const revealed = new Set<string>();
  spec.steps.forEach((s, i) => {
    for (const ref of s.add) {
      if (!all.has(ref)) problems.push(`step ${i + 1} adds unknown id ${ref}`);
      revealed.add(ref);
    }
    for (const ref of s.emphasise) {
      if (!all.has(ref)) problems.push(`step ${i + 1} emphasises unknown id ${ref}`);
      else if (!revealed.has(ref))
        problems.push(`step ${i + 1} emphasises ${ref} before any step adds it`);
    }
  });

  for (const nid of all) {
    if (!revealed.has(nid)) problems.push(`${nid} is never added by any step`);
  }

  if (spec.form === "sequence") {
    for (const e of spec.edges) {
      const from = spec.nodes.find((n) => n.id === e.from);
      const to = spec.nodes.find((n) => n.id === e.to);
      if (from && to && from.lane === to.lane)
        problems.push(`edge ${e.id} starts and ends in the same lane`);
    }
  }

  return { ok: problems.length === 0, problems };
}
