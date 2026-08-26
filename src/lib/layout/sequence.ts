import type { SequenceSpecT } from "../forms";
import { PAD, type Item, type Plan } from "./types";

const HEAD_H = 44;
const HEAD_Y = 40;
const FIRST = 118;
const GAP = 68;
const MIN_LANE = 168;

export function sequence(spec: SequenceSpecT): Plan {
  const longest = Math.max(...spec.edges.map((e) => e.label.length), 8);
  const laneGap = Math.max(MIN_LANE, Math.min(longest * 8 + 60, 290));
  const headW = Math.max(110, Math.min(laneGap - 28, 170));

  const laneX = spec.lanes.map((_, i) => PAD + headW / 2 + i * laneGap);
  const items: Item[] = [];

  for (const n of spec.nodes) {
    const x = laneX[n.lane] ?? laneX[0];
    items.push({
      kind: "box",
      id: n.id,
      label: n.label,
      x: x - headW / 2,
      y: HEAD_Y - HEAD_H / 2,
      w: headW,
      h: HEAD_H,
      variant: "plain",
    });
  }

  const bottom = FIRST + spec.edges.length * GAP + 16;

  for (const n of spec.nodes) {
    const x = laneX[n.lane] ?? laneX[0];
    items.push({
      kind: "lifeline",
      id: `${n.id}__life`,
      owner: n.id,
      x1: x,
      y1: HEAD_Y + HEAD_H / 2,
      x2: x,
      y2: bottom,
    });
  }

  spec.edges.forEach((e, i) => {
    const from = spec.nodes.find((n) => n.id === e.from);
    const to = spec.nodes.find((n) => n.id === e.to);
    if (!from || !to) return;
    const y = FIRST + i * GAP;
    items.push({
      kind: "arrow",
      id: e.id,
      label: e.label,
      x1: laneX[from.lane] ?? laneX[0],
      y1: y,
      x2: laneX[to.lane] ?? laneX[0],
      y2: y,
      dashed: e.kind === "back",
    });
  });

  return {
    items,
    width: PAD * 2 + headW + (spec.lanes.length - 1) * laneGap,
    height: bottom + PAD,
  };
}
