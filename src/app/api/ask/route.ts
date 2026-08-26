import { NextResponse } from "next/server";
import { ask, MissingKey } from "@/lib/ask";
import { save } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  let question: unknown;

  try {
    ({ question } = (await request.json()) as { question?: unknown });
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }

  if (typeof question !== "string" || question.trim().length < 3) {
    return NextResponse.json({ error: "Ask something first." }, { status: 400 });
  }
  if (question.length > 400) {
    return NextResponse.json(
      { error: "Keep it under 400 characters." },
      { status: 400 },
    );
  }

  try {
    const answer = await ask(question.trim());

    if (answer.kind === "declined") {
      return NextResponse.json(answer);
    }

    const slug = await save(question.trim(), answer.spec);
    return NextResponse.json({ ...answer, slug });
  } catch (error) {
    if (error instanceof MissingKey) {
      return NextResponse.json(
        {
          error:
            "No API key configured. Add ANTHROPIC_API_KEY to .env.local and restart.",
        },
        { status: 503 },
      );
    }
    console.error("ask failed", error);
    return NextResponse.json(
      { error: "That did not go through. Try again." },
      { status: 500 },
    );
  }
}
