"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Turn } from "@/lib/store";
import Board from "./Board";

const EXAMPLES: { q: string; declines?: boolean }[] = [
  { q: "How does the TCP three-way handshake work?" },
  { q: "Walk me through the OAuth authorization code flow" },
  { q: "git rebase versus git merge" },
  { q: "How does a request move through a transformer block?" },
  { q: "Why did the First World War start?", declines: true },
];

export default function Thread({
  conversationId,
  initialTurns,
}: {
  conversationId: string | null;
  initialTurns: Turn[];
}) {
  const router = useRouter();
  const [turns, setTurns] = useState<Turn[]>(initialTurns);
  const [convId, setConvId] = useState(conversationId);
  const [question, setQuestion] = useState("");
  const [pendingQ, setPendingQ] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: turns.length > 1 ? "smooth" : "auto" });
  }, [turns.length, pendingQ]);

  async function send(q: string) {
    const text = q.trim();
    if (!text || pendingQ) return;

    setPendingQ(text);
    setError(null);
    setQuestion("");

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, conversationId: convId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "That did not go through.");
        return;
      }

      setTurns((t) => [...t, data.turn as Turn]);

      if (!convId) {
        setConvId(data.conversationId);
        window.history.replaceState(null, "", `/c/${data.conversationId}`);
        router.refresh();
      } else {
        router.refresh();
      }
    } catch {
      setError("Could not reach the server. Check your connection.");
    } finally {
      setPendingQ(null);
    }
  }

  const empty = turns.length === 0 && !pendingQ;

  return (
    <div className="thread">
      <div className="thread__scroll">
        {empty && (
          <section className="opening">
            <h1>Answers that get drawn, not written.</h1>
            <p className="lede">
              Ask something with moving parts and it gets built one piece at a
              time, with a line per step. Ask something without structure and
              Chalk tells you so instead of drawing a shrug.
            </p>
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
          </section>
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
                  <span className="pill pill--form">{turn.answer.spec.form}</span>
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

        {error && <p className="error">{error}</p>}

        <div ref={endRef} />
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          send(question);
        }}
      >
        <textarea
          rows={1}
          value={question}
          placeholder={turns.length ? "Ask a follow-up…" : "Ask how something works…"}
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
        <button className="go" type="submit" disabled={Boolean(pendingQ) || !question.trim()}>
          {pendingQ ? "…" : "draw it"}
        </button>
      </form>
    </div>
  );
}
