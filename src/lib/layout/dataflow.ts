import dagre from "dagre";
import type { DataflowSpecT } from "../forms";
import { PAD, type Item, type Plan, type Variant } from "./types";

const SKIP_MARGIN = 90;

export function dataflow(spec: DataflowSpecT): Plan {
  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setGraph({ rankdir: "TB", nodesep: 44, ranksep: 48, marginx: PAD, marginy: PAD });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of spec.nodes) {
    const lines = n.label.split("\n");
    const longest = Math.max(...lines.map((l) => l.length));
    g.setNode(n.id, {
      width: n.kind === "add" ? 38 : Math.max(120, Math.min(longest * 8 + 32, 220)),
      height: n.kind === "add" ? 38 : 26 + lines.length * 18,
    });
  }

  for (const e of spec.edges) {
    if (e.kind === "skip") continue;
    g.setEdge(e.from, e.to, {}, e.id);
  }

  dagre.layout(g);

  const variantFor = (kind: string): Variant =>
    kind === "io" ? "muted" : kind === "add" ? "accent" : "plain";

  const items: Item[] = spec.nodes.map((n) => {
    const p = g.node(n.id);
    return {
      kind: n.kind === "add" ? "circle" : "box",
      id: n.id,
      label: n.label,
      x: p.x - p.width / 2,
      y: p.y - p.height / 2,
      w: p.width,
      h: p.height,
      variant: variantFor(n.kind),
    };
  });

  const rightEdge = Math.max(...items.map((i) => ("w" in i ? i.x + i.w : 0)));

  for (const e of spec.edges) {
    const a = items.find((i) => i.id === e.from);
    const b = items.find((i) => i.id === e.to);
    if (!a || !b || !("w" in a) || !("w" in b)) continue;

    if (e.kind === "skip") {
      items.push({
        kind: "curve",
        id: e.id,
        label: e.label,
        x1: a.x + a.w / 2,
        y1: a.y + a.h / 2,
        x2: b.x + b.w / 2,
        y2: b.y + b.h / 2,
        bend: rightEdge + SKIP_MARGIN,
      });
    } else {
      items.push({
        kind: "arrow",
        id: e.id,
        label: e.label,
        x1: a.x + a.w / 2,
        y1: a.y + a.h,
        x2: b.x + b.w / 2,
        y2: b.y,
        dashed: false,
      });
    }
  }

  const graph = g.graph();
  const hasSkip = spec.edges.some((e) => e.kind === "skip");
  return {
    items,
    width: (graph.width ?? 600) + (hasSkip ? SKIP_MARGIN + 80 : 0),
    height: (graph.height ?? 400) + PAD,
  };
}
