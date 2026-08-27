"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { Stub } from "@/lib/store";
import Mark from "./Mark";

const NAV = [
  { href: "/", label: "Ask" },
  { href: "/library", label: "Library" },
  { href: "/paths", label: "Paths" },
];

function when(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "1d";
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
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
        {open ? "close" : "menu"}
      </button>

      <aside id="rail" className="rail" data-open={open || undefined}>
        <div className="rail__top">
          <a className="brand" href="/">
            <Mark />
            chalk
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

        <nav className="rail__nav" aria-label="Sections">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className={`rail__item${pathname === n.href ? " is-active" : ""}`}
              aria-current={pathname === n.href || undefined}
              onClick={() => setOpen(false)}
            >
              <span className="rail__title">{n.label}</span>
            </a>
          ))}
        </nav>

        <div className="rail__list">
          <p className="rail__label">Recent</p>
          {conversations.length === 0 && <p className="rail__empty">Nothing drawn yet.</p>}
          {conversations.slice(0, 20).map((c) => {
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
        </div>

        <p className="rail__foot">
          sequence · dataflow · comparison
          <br />
          anything else gets declined
        </p>
      </aside>

      {open && (
        <button
          type="button"
          className="rail__scrim"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
