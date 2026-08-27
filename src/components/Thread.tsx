"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Turn } from "@/lib/store";
import Board from "./Board";
import Mark from "./Mark";

const EXAMPLES: { q: string; declines?: boolean }[] = [
  { q: "How does the TCP three-way handshake work?" },
  { q: "Walk me through the OAuth authorization code flow" },
  { q: "git rebase versus git merge" },
  { q: "How does a request move through a transformer block?" },
  { q: "Why did the First World War start?", declines: true },
];

function ArrowUp() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 13V3m0 0L3.5 7.5M8 3l4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Thread({
  conversationId,
  initialTurns,
  title,
}: {
  conversationId: string | null;
  initialTurns: Turn[];
  title?: string;
}) {
  const router = useRouter();
  const [turns, setTurns] = useState<Turn[]>(initialTurns);
  const [convId, setConvId] = useState(conversationId);
  const [question, setQuestion] = useState("");
  const [pendingQ, setPendingQ] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: turns.length > 1 ? "smooth" : "auto" });
  }, [turns.length, pendingQ]);

  async function send(q: string) {
    const text = q.trim();
    if (!text || pendingQ) return;

    setPendingQ(text);
    setQuestion("");

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, conversationId: convId }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "That did not go through.");
        return;
      }

      const turn = data.turn as Turn;
      setTurns((t) => [...t, turn]);

      if (turn.answer.kind === "declined") {
        toast("Answered in prose", { description: "That question has no structure to draw." });
      }

      if (!convId) {
        setConvId(data.conversationId);
        window.history.replaceState(null, "", `/c/${data.conversationId}`);
      }
      router.refresh();
    } catch {
      toast.error("Could not reach the server.", { description: "Check your connection." });
    } finally {
      setPendingQ(null);
    }
  }

  const empty = turns.length === 0 && !pendingQ;

  return (
    <section className="card">
      <header className="cardbar">
        <span>{title ?? "Ask Chalk"}</span>
        {turns.length > 0 && <span>{turns.length} drawn</span>}
      </header>

      <div className="thread">
        <div className="thread__scroll">
          {empty && (
            <div className="opening">
              <div className="opening__head">
                <Mark size={34} />
                <h1>
                  Answers that get <span className="hl">drawn</span>, not written
                </h1>
                <p className="lede">
                  Ask something with moving parts and it gets built one piece at a
                  time. Ask something without structure and Chalk says so.
                </p>
              </div>

              <div className="examples">
                {EXAMPLES.map((e) => (
                  <button
                    key={e.q}
                    type="button"
                    className="example"
                    data-declines={e.declines ? "yes" : undefined}
                    onClick={() => send(e.q)}
                  >
                    {e.q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {turns.map((turn) => (
            <article key={turn.id} className="turn">
              <p className="asked">{turn.question}</p>

              {turn.answer.kind === "declined" ? (
                <div className="refusal">
                  <span className="refusal__label">not a diagram question</span>
                  <p className="refusal__why">{turn.answer.reason}</p>
                  <p className="refusal__prose">{turn.answer.prose}</p>
                </div>
              ) : (
                <>
                  <div className="meta">
                    <span className="pill">{turn.answer.spec.form}</span>
                    <span>{turn.answer.spec.summary}</span>
                    {turn.answer.attempts > 1 && <span>· repaired once</span>}
                  </div>
                  <Board spec={turn.answer.spec} />
                </>
              )}
            </article>
          ))}

          {pendingQ && (
            <article className="turn">
              <p className="asked">{pendingQ}</p>
              <p className="thinking">working out whether this can be drawn…</p>
            </article>
          )}

          <div ref={endRef} />
        </div>

        <div className="composerwrap">
          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              send(question);
            }}
          >
            <textarea
              rows={2}
              value={question}
              placeholder={turns.length ? "Ask a follow-up…" : "how does a hash map handle collisions?"}
              aria-label="Your question"
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(question);
                }
              }}
              disabled={Boolean(pendingQ)}
            />
            <div className="composer__row">
              <span className="composer__hint">
                {pendingQ ? "thinking…" : "three forms · anything else is declined"}
              </span>
              <button
                className="go"
                type="submit"
                aria-label="Draw it"
                disabled={Boolean(pendingQ) || !question.trim()}
              >
                <ArrowUp />
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
