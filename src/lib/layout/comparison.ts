import type { ComparisonSpecT } from "../forms";
import { PAD, type Item, type Plan, type Variant } from "./types";

const NODE = 50;
const ROW = 82;
const TRACK = 104;
const TOP = 88;

export function comparison(spec: ComparisonSpecT): Plan {
  const maxTrack = Math.max(0, ...spec.nodes.map((n) => n.track));
  const colW = Math.max(280, (maxTrack + 1) * TRACK + 120);
  const items: Item[] = [];

  spec.columns.forEach((c, i) => {
    items.push({
      kind: "title",
      id: `__col${i}`,
      label: c,
      x: PAD + i * colW,
      y: 30,
      w: colW - 40,
      h: 28,
    });
  });

  const variantFor = (kind: string): Variant =>
    kind === "rewritten" ? "rewritten" : kind === "result" ? "result" : "plain";

  for (const n of spec.nodes) {
    items.push({
      kind: "circle",
      id: n.id,
      label: n.label,
      x: PAD + n.col * colW + 52 + n.track * TRACK,
      y: TOP + n.row * ROW,
      w: NODE,
      h: NODE,
      variant: variantFor(n.kind),
    });
  }

  for (const e of spec.edges) {
    const a = items.find((i) => i.id === e.from);
    const b = items.find((i) => i.id === e.to);
    if (!a || !b || !("w" in a) || !("w" in b)) continue;
    items.push({
      kind: "arrow",
      id: e.id,
      label: "",
      x1: a.x + a.w / 2,
      y1: a.y + a.h,
      x2: b.x + b.w / 2,
      y2: b.y,
      dashed: false,
    });
  }

  const maxRow = Math.max(0, ...spec.nodes.map((n) => n.row));
  return {
    items,
    width: PAD * 2 + spec.columns.length * colW,
    height: TOP + (maxRow + 1) * ROW + PAD,
  };
}
