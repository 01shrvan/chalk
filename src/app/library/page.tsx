import type { Metadata } from "next";
import { allBoards } from "@/lib/store";

export const metadata: Metadata = { title: "Library" };

export default async function Library() {
  const boards = await allBoards();

  return (
    <section className="card">
      <header className="cardbar">
        <span>Library</span>
        <span>{boards.length} drawn</span>
      </header>

      <div className="cardbody">
        <div className="pagehead">
          <h1>Everything you have had drawn</h1>
          <p className="lede">
            Every board Chalk has made for you, newest first. Refusals are not
            kept here — only what actually got drawn.
          </p>
        </div>

        {boards.length === 0 ? (
          <div className="empty">
            <p>Nothing drawn yet.</p>
            <a className="example" href="/">
              Ask the first question
            </a>
          </div>
        ) : (
          <div className="grid">
            {boards.map((b) => (
              <a key={b.turnId} className="tile" href={`/c/${b.conversationId}`}>
                <span className="tile__title">{b.topic}</span>
                <span className="tile__meta">
                  <span className="pill">{b.form}</span>
                  <span>{b.steps} steps</span>
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
