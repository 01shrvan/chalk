import type { Metadata } from "next";
import { paths } from "@/lib/store";

export const metadata: Metadata = { title: "Paths" };

export default async function Paths() {
  const trails = await paths();

  return (
    <section className="card">
      <header className="cardbar">
        <span>Paths</span>
        <span>{trails.length}</span>
      </header>

      <div className="cardbody">
        <div className="pagehead">
          <h1>Subjects you went deeper on</h1>
          <p className="lede">
            A path is any conversation where you asked a follow-up. Not a
            generated curriculum — the order is the one your own questions took,
            which is the only order that reflects what you actually did not know.
          </p>
        </div>

        {trails.length === 0 ? (
          <div className="empty">
            <p>No paths yet.</p>
            <p className="lede">
              Ask a follow-up on any board and the pair becomes a path.
            </p>
          </div>
        ) : (
          <div className="grid">
            {trails.map((p) => (
              <a key={p.id} className="tile" href={`/c/${p.id}`}>
                <span className="tile__title">{p.title}</span>
                <span className="tile__meta">
                  <span className="pill">{p.turns} steps</span>
                  <span>{p.forms.join(" · ")}</span>
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
