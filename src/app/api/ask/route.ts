import { NextResponse } from "next/server";
import { ask, MissingKey } from "@/lib/ask";
import { append } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  let body: { question?: unknown; conversationId?: unknown };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }

  const { question, conversationId } = body;

  if (typeof question !== "string" || question.trim().length < 3) {
    return NextResponse.json({ error: "Ask something first." }, { status: 400 });
  }
  if (question.length > 400) {
    return NextResponse.json({ error: "Keep it under 400 characters." }, { status: 400 });
  }

  try {
    const answer = await ask(question.trim());
    const conversation = await append(
      typeof conversationId === "string" ? conversationId : null,
      question.trim(),
      answer,
    );

    return NextResponse.json({
      conversationId: conversation.id,
      turn: conversation.turns[conversation.turns.length - 1],
    });
  } catch (error) {
    if (error instanceof MissingKey) {
      return NextResponse.json(
        { error: "No API key yet. Add ANTHROPIC_API_KEY to .env.local and restart." },
        { status: 503 },
      );
    }
    console.error("ask failed", error);
    return NextResponse.json({ error: "That did not go through. Try again." }, { status: 500 });
  }
}
