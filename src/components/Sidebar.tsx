"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { Stub } from "@/lib/store";

function when(iso: string): string {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function Sidebar({ conversations }: { conversations: Stub[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="rail__toggle"
        aria-expanded={open}
        aria-controls="rail"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "close" : "history"}
      </button>

      <aside id="rail" className="rail" data-open={open || undefined}>
        <div className="rail__top">
          <a className="brand" href="/">
            chalk<em>.</em>
          </a>
          <button
            type="button"
            className="rail__new"
            onClick={() => {
              setOpen(false);
              router.push("/");
            }}
          >
            new
          </button>
        </div>

        <nav className="rail__list" aria-label="Past conversations">
          {conversations.length === 0 && (
            <p className="rail__empty">Nothing drawn yet.</p>
          )}
          {conversations.map((c) => {
            const active = pathname === `/c/${c.id}`;
            return (
              <a
                key={c.id}
                href={`/c/${c.id}`}
                className={`rail__item${active ? " is-active" : ""}`}
                aria-current={active || undefined}
                onClick={() => setOpen(false)}
              >
                <span className="rail__title">{c.title}</span>
                <span className="rail__when">{when(c.updatedAt)}</span>
              </a>
            );
          })}
        </nav>

        <p className="rail__foot">
          sequence · dataflow · comparison
          <br />
          anything else is declined
        </p>
      </aside>

      {open && <button type="button" className="rail__scrim" aria-label="Close history" onClick={() => setOpen(false)} />}
    </>
  );
}
