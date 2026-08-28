"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Spec } from "@/lib/forms";
import { layout } from "@/lib/layout";
import { animate, build } from "@/lib/render";

export default function Board({ spec }: { spec: Spec }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const prevStep = useRef<number>(-1);
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [inkMs, setInkMs] = useState(0);

  const plan = useMemo(() => layout(spec), [spec]);
  const step = spec.steps[at];

  const paint = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;

    const visible = new Set<string>();
    for (let i = 0; i <= at; i++) for (const id of spec.steps[i].add) visible.add(id);

    const movedForward = at > prevStep.current;
    const fresh = new Set<string>(movedForward ? spec.steps[at].add : []);
    prevStep.current = at;

    const svg = build(plan, visible, new Set(spec.steps[at].emphasise), fresh);
    host.replaceChildren(svg);

    if (fresh.size) {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setInkMs(animate(svg, reduced));
    } else {
      setInkMs(0);
    }
  }, [at, plan, spec]);

  useEffect(() => {
    paint();
  }, [paint]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", paint);
    return () => mq.removeEventListener("change", paint);
  }, [paint]);

  useEffect(() => {
    if (!playing) return;
    if (at >= spec.steps.length - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setAt((v) => v + 1), 3600);
    return () => clearTimeout(t);
  }, [playing, at, spec.steps.length]);

  const go = (i: number) => {
    setPlaying(false);
    setAt(Math.max(0, Math.min(spec.steps.length - 1, i)));
  };

  return (
    <figure className="board">
      <div className="board__scroll">
        <div
          ref={hostRef}
          className="board__svg"
          role="img"
          aria-label={`${spec.topic}, step ${at + 1} of ${spec.steps.length}`}
        />
      </div>

      <figcaption className="say" aria-live="polite">
        <p className="say__text" key={`${at}-say`}>
          {step.say.split(" ").map((w, i, all) => (
            <span
              className="w"
              key={i}
              style={{ animationDelay: `${Math.round((inkMs / Math.max(all.length, 1)) * i)}ms` }}
            >
              {w}{i < all.length - 1 ? " " : ""}
            </span>
          ))}
        </p>
        {step.aside ? <p className="say__aside">{step.aside}</p> : null}
      </figcaption>

      <div className="transport">
        <button type="button" onClick={() => go(at - 1)} disabled={at === 0}>
          back
        </button>
        <button type="button" onClick={() => go(at + 1)} disabled={at === spec.steps.length - 1}>
          next
        </button>
        <button
          type="button"
          onClick={() => {
            if (at >= spec.steps.length - 1) {
              prevStep.current = -1;
              setAt(0);
            }
            setPlaying((p) => !p);
          }}
        >
          {playing ? "pause" : "replay"}
        </button>

        <div className="ticks" role="group" aria-label="steps">
          {spec.steps.map((s, i) => (
            <button
              key={i}
              type="button"
              className={`tick${i <= at ? " is-on" : ""}${i === at ? " is-at" : ""}`}
              onClick={() => go(i)}
              aria-label={`step ${i + 1}: ${s.say.slice(0, 60)}`}
              aria-current={i === at || undefined}
            />
          ))}
        </div>

        <span className="counter">
          {at + 1} / {spec.steps.length}
        </span>
      </div>
    </figure>
  );
}
