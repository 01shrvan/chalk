import rough from "roughjs";
import type { Item, Plan } from "./layout";

const NS = "http://www.w3.org/2000/svg";
const SEED = 7;

type Palette = {
  hand: string;
  ink: string;
  ink2: string;
  faint: string;
  accent: string;
  accentFill: string;
  paper: string;
};

function palette(): Palette {
  const s = getComputedStyle(document.documentElement);
  const v = (n: string) => s.getPropertyValue(n).trim();
  return {
    hand: v("--font-sans") || "sans-serif",
    ink: v("--ink"),
    ink2: v("--ink-2"),
    faint: v("--faint"),
    accent: v("--accent"),
    accentFill: v("--accent-fill"),
    paper: v("--card"),
  };
}

function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

function text(
  label: string,
  cx: number,
  cy: number,
  colour: string,
  size: number,
  hand: string,
  weight = 400,
) {
  const lines = label.split("\n");
  const lh = size + 4;
  const start = cy - ((lines.length - 1) * lh) / 2;
  const group = el("g", { class: "ch-text" });

  lines.forEach((line, i) => {
    const t = el("text", {
      x: cx,
      y: start + i * lh,
      fill: colour,
      "font-size": size,
      "font-family": hand,
      "font-weight": weight,
      "text-anchor": "middle",
      "dominant-baseline": "central",
    });
    t.textContent = line;
    group.append(t);
  });

  return group;
}

function arrowHead(x1: number, y1: number, x2: number, y2: number, colour: string) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p = (o: number) =>
    `${x2 - 10 * Math.cos(a + o)},${y2 - 10 * Math.sin(a + o)}`;
  return el("path", {
    d: `M ${p(-0.4)} L ${x2},${y2} L ${p(0.4)}`,
    stroke: colour,
    "stroke-width": 1.7,
    "stroke-linecap": "round",
    fill: "none",
  });
}

export function build(
  plan: Plan,
  visible: Set<string>,
  hot: Set<string>,
  fresh: Set<string>,
): SVGSVGElement {
  const c = palette();
  const svg = el("svg", {
    viewBox: `0 0 ${plan.width} ${plan.height}`,
    width: plan.width,
    height: plan.height,
    role: "img",
  });
  const rc = rough.svg(svg as SVGSVGElement);

  const shown = (item: Item) =>
    visible.has(item.id) || ("owner" in item && item.owner ? visible.has(item.owner) : false);
  const lit = (item: Item) =>
    hot.has(item.id) || ("owner" in item && item.owner ? hot.has(item.owner) : false);
  const isNew = (item: Item) =>
    fresh.has(item.id) || ("owner" in item && item.owner ? fresh.has(item.owner) : false);

  for (const item of plan.items) {
    if (!shown(item)) continue;

    const on = lit(item);
    const stroke = on ? c.accent : c.ink;
    const width = on ? 2.3 : 1.5;
    const group = el("g", { "data-id": item.id });
    if (isNew(item)) group.setAttribute("data-fresh", "1");

    if (item.kind === "lifeline") {
      group.append(
        rc.line(item.x1, item.y1, item.x2, item.y2, {
          stroke: c.faint,
          strokeWidth: 1,
          strokeLineDash: [6, 8],
          seed: SEED,
        }),
      );
    } else if (item.kind === "arrow") {
      group.append(
        rc.line(item.x1, item.y1, item.x2, item.y2, {
          stroke,
          strokeWidth: width,
          strokeLineDash: item.dashed ? [8, 5] : undefined,
          seed: SEED,
        }),
        arrowHead(item.x1, item.y1, item.x2, item.y2, stroke),
      );
      if (item.label) {
        const mx = (item.x1 + item.x2) / 2;
        const my = (item.y1 + item.y2) / 2;
        const w = item.label.length * 6.4 + 14;
        group.append(
          el("rect", {
            x: mx - w / 2,
            y: my - 22,
            width: w,
            height: 18,
            fill: c.paper,
            class: "ch-text",
          }),
          text(item.label, mx, my - 13, on ? c.accent : c.ink2, 12, c.hand),
        );
      }
    } else if (item.kind === "curve") {
      group.append(
        rc.path(
          `M ${item.x1} ${item.y1} C ${item.bend} ${item.y1}, ${item.bend} ${item.y2}, ${item.x2} ${item.y2}`,
          { stroke: on ? c.accent : c.ink2, strokeWidth: on ? 2.4 : 1.5, seed: SEED },
        ),
        arrowHead(item.bend, item.y2, item.x2, item.y2, on ? c.accent : c.ink2),
      );
      if (item.label)
        group.append(
          text(item.label, item.bend + 6, (item.y1 + item.y2) / 2, on ? c.accent : c.faint, 11, c.hand),
        );
    } else if (item.kind === "title") {
      group.append(
        text(item.label, item.x + item.w / 2, item.y + item.h / 2, c.ink2, 15, c.hand, 600),
      );
    } else {
      const fill = on ? c.accentFill : undefined;
      const shapeStroke = item.variant === "rewritten" ? c.accent : stroke;
      const opts = {
        stroke: shapeStroke,
        strokeWidth: width,
        fill,
        fillStyle: "solid" as const,
        seed: SEED,
      };

      group.append(
        item.kind === "circle"
          ? rc.circle(item.x + item.w / 2, item.y + item.h / 2, item.w, opts)
          : rc.rectangle(item.x, item.y, item.w, item.h, { ...opts, roughness: 1.3 }),
      );

      const colour =
        on || item.variant === "rewritten"
          ? c.accent
          : item.variant === "muted"
            ? c.ink2
            : c.ink;
      group.append(
        text(item.label, item.x + item.w / 2, item.y + item.h / 2, colour, item.w < 60 ? 16 : 12.5, c.hand),
      );
    }

    svg.append(group);
  }

  return svg as SVGSVGElement;
}

export function animate(svg: SVGSVGElement, reduced: boolean): number {
  const groups = svg.querySelectorAll<SVGGElement>("g[data-fresh]");
  if (!groups.length) return 0;

  if (reduced) {
    groups.forEach((g) => g.removeAttribute("data-fresh"));
    return 0;
  }

  type Pending = { path: SVGPathElement; len: number; ms: number; delay: number };
  const strokes: Pending[] = [];
  const labels: { node: SVGElement; delay: number }[] = [];
  let delay = 0;

  groups.forEach((group) => {
    let longest = 0;

    group.querySelectorAll<SVGPathElement>("path").forEach((path) => {
      if (path.closest(".ch-text")) return;
      let len = 0;
      try {
        len = path.getTotalLength();
      } catch {
        return;
      }
      if (!len || !Number.isFinite(len)) return;

      const ms = Math.min(160 + len * 1.4, 640);
      longest = Math.max(longest, ms);
      strokes.push({ path, len, ms, delay });

      path.style.strokeDasharray = String(len);
      path.style.strokeDashoffset = String(len);
    });

    group.querySelectorAll<SVGElement>(".ch-text").forEach((node) => {
      node.style.opacity = "0";
      labels.push({ node, delay: delay + Math.max(longest - 120, 0) });
    });

    delay += 110;
    group.removeAttribute("data-fresh");
  });

  if (!strokes.length && !labels.length) return 0;

  void svg.getBoundingClientRect();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      for (const s of strokes) {
        s.path.style.transition = `stroke-dashoffset ${s.ms}ms cubic-bezier(0.16, 1, 0.3, 1) ${s.delay}ms`;
        s.path.style.strokeDashoffset = "0";
      }
      for (const l of labels) {
        l.node.style.transition = `opacity 220ms ease ${l.delay}ms`;
        l.node.style.opacity = "1";
      }
    });
  });
  return strokes.reduce((max, s) => Math.max(max, s.delay + s.ms), 0);
}
