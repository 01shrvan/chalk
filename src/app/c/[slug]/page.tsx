import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Thread from "@/components/Thread";
import { get } from "@/lib/store";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const conversation = await get(slug);
  if (!conversation) return { title: "Not found" };
  return { title: conversation.title };
}

export default async function Conversation({ params }: Props) {
  const { slug } = await params;
  const conversation = await get(slug);
  if (!conversation) notFound();

  return (
    <>
      <Thread conversationId={conversation.id} initialTurns={conversation.turns} />

      <noscript>
        <div className="fallback">
          {conversation.turns.map((turn) => (
            <section key={turn.id}>
              <h2>{turn.question}</h2>
              {turn.answer.kind === "declined" ? (
                <p>{turn.answer.prose}</p>
              ) : (
                <ol>
                  {turn.answer.spec.steps.map((s, i) => (
                    <li key={i}>
                      {s.say}
                      {s.aside ? ` — ${s.aside}` : ""}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ))}
        </div>
      </noscript>
    </>
  );
}
