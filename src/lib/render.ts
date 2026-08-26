import rough from "roughjs";
import type { Item, Plan } from "./layout";

type Palette = {
  hand: string;
  ink: string;
  ink2: string;
  faint: string;
  accent: string;
  accentFill: string;
  paper: string;
  warn: string;
};

function palette(): Palette {
  const s = getComputedStyle(document.documentElement);
  const v = (n: string) => s.getPropertyValue(n).trim();
  return {
    hand: v("--font-hand") || "cursive",
    ink: v("--ink"),
    ink2: v("--ink-2"),
    faint: v("--faint"),
    accent: v("--accent"),
    accentFill: v("--accent-fill"),
    paper: v("--panel"),
    warn: v("--warn"),
  };
}

function write(
  ctx: CanvasRenderingContext2D,
  hand: string,
  label: string,
  cx: number,
  cy: number,
  colour: string,
  size: number,
  weight = 400,
) {
  const lines = label.split("\n");
  ctx.fillStyle = colour;
  ctx.font = `${weight} ${size}px ${hand}, cursive`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lh = size + 4;
  const start = cy - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => ctx.fillText(l, cx, start + i * lh));
}

function head(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  colour: string,
) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 10 * Math.cos(a - 0.4), y2 - 10 * Math.sin(a - 0.4));
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 10 * Math.cos(a + 0.4), y2 - 10 * Math.sin(a + 0.4));
  ctx.stroke();
}

const SEED = 7;

export function draw(
  canvas: HTMLCanvasElement,
  plan: Plan,
  visible: Set<string>,
  hot: Set<string>,
) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(plan.width * dpr);
  canvas.height = Math.round(plan.height * dpr);
  canvas.style.width = `${plan.width}px`;
  canvas.style.height = `${plan.height}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, plan.width, plan.height);

  const rc = rough.canvas(canvas);
  const c = palette();

  const shown = (item: Item) =>
    visible.has(item.id) || ("owner" in item && item.owner ? visible.has(item.owner) : false);

  const lit = (item: Item) =>
    hot.has(item.id) || ("owner" in item && item.owner ? hot.has(item.owner) : false);

  for (const item of plan.items) {
    if (!shown(item)) continue;
    const on = lit(item);
    const stroke = on ? c.accent : c.ink;
    const width = on ? 2.3 : 1.5;

    if (item.kind === "lifeline") {
      rc.line(item.x1, item.y1, item.x2, item.y2, {
        stroke: c.faint,
        strokeWidth: 1,
        strokeLineDash: [6, 8],
        seed: SEED,
      });
      continue;
    }

    if (item.kind === "arrow") {
      rc.line(item.x1, item.y1, item.x2, item.y2, {
        stroke,
        strokeWidth: width,
        strokeLineDash: item.dashed ? [8, 5] : undefined,
        seed: SEED,
      });
      head(ctx, item.x1, item.y1, item.x2, item.y2, stroke);
      if (item.label) {
        const mx = (item.x1 + item.x2) / 2;
        const my = (item.y1 + item.y2) / 2;
        ctx.font = `400 13px ${c.hand}, cursive`;
        const w = ctx.measureText(item.label).width;
        ctx.fillStyle = c.paper;
        ctx.fillRect(mx - w / 2 - 7, my - 22, w + 14, 18);
        write(ctx, c.hand, item.label, mx, my - 13, on ? c.accent : c.ink2, 13);
      }
      continue;
    }

    if (item.kind === "curve") {
      rc.path(
        `M ${item.x1} ${item.y1} C ${item.bend} ${item.y1}, ${item.bend} ${item.y2}, ${item.x2} ${item.y2}`,
        { stroke: on ? c.accent : c.ink2, strokeWidth: on ? 2.4 : 1.5, seed: SEED },
      );
      head(ctx, item.bend, item.y2, item.x2, item.y2, on ? c.accent : c.ink2);
      if (item.label)
        write(ctx, c.hand, item.label, item.bend + 6, (item.y1 + item.y2) / 2, on ? c.accent : c.faint, 12);
      continue;
    }

    if (item.kind === "title") {
      write(ctx, c.hand, item.label, item.x + item.w / 2, item.y + item.h / 2, c.ink2, 16, 700);
      continue;
    }

    const fill = on ? c.accentFill : undefined;
    const shapeStroke = item.variant === "rewritten" ? c.accent : stroke;

    if (item.kind === "circle") {
      rc.circle(item.x + item.w / 2, item.y + item.h / 2, item.w, {
        stroke: shapeStroke,
        strokeWidth: width,
        fill,
        fillStyle: "solid",
        seed: SEED,
      });
    } else {
      rc.rectangle(item.x, item.y, item.w, item.h, {
        stroke: shapeStroke,
        strokeWidth: width,
        fill,
        fillStyle: "solid",
        roughness: 1.3,
        seed: SEED,
      });
    }

    const labelColour =
      on || item.variant === "rewritten" ? c.accent : item.variant === "muted" ? c.ink2 : c.ink;
    write(ctx, c.hand, item.label, item.x + item.w / 2, item.y + item.h / 2, labelColour, item.w < 60 ? 17 : 13);
  }
}
