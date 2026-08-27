import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { SPEC_BY_FORM, type Spec } from "./forms";

export type Turn = {
  id: string;
  question: string;
  answer:
    | { kind: "drawn"; spec: Spec; attempts: number }
    | { kind: "declined"; reason: string; prose: string };
  at: string;
};

export type Conversation = {
  id: string;
  title: string;
  turns: Turn[];
  createdAt: string;
  updatedAt: string;
};

export type Stub = Pick<Conversation, "id" | "title" | "updatedAt">;

const DIR = path.join(process.cwd(), ".data", "conversations");

function titleFrom(question: string): string {
  const t = question.trim().replace(/\s+/g, " ");
  return t.length > 58 ? `${t.slice(0, 56)}…` : t;
}

function valid(c: unknown): c is Conversation {
  const v = c as Conversation;
  if (!v || typeof v.id !== "string" || !Array.isArray(v.turns)) return false;
  for (const turn of v.turns) {
    if (turn.answer?.kind !== "drawn") continue;
    const form = turn.answer.spec?.form;
    if (!form || !(form in SPEC_BY_FORM)) return false;
    if (!SPEC_BY_FORM[form].safeParse(turn.answer.spec).success) return false;
  }
  return true;
}

export async function get(id: string): Promise<Conversation | null> {
  if (!/^[a-z0-9-]{8,64}$/i.test(id)) return null;
  try {
    const raw = await fs.readFile(path.join(DIR, `${id}.json`), "utf8");
    const parsed = JSON.parse(raw);
    return valid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function list(limit = 40): Promise<Stub[]> {
  try {
    const files = await fs.readdir(DIR);
    const all = await Promise.all(
      files.filter((f) => f.endsWith(".json")).map((f) => get(f.replace(/\.json$/, ""))),
    );
    return all
      .filter((c): c is Conversation => c !== null)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit)
      .map(({ id, title, updatedAt }) => ({ id, title, updatedAt }));
  } catch {
    return [];
  }
}

export async function append(
  conversationId: string | null,
  question: string,
  answer: Turn["answer"],
): Promise<Conversation> {
  await fs.mkdir(DIR, { recursive: true });
  const now = new Date().toISOString();

  const existing = conversationId ? await get(conversationId) : null;

  const conversation: Conversation = existing ?? {
    id: randomUUID(),
    title: titleFrom(question),
    turns: [],
    createdAt: now,
    updatedAt: now,
  };

  conversation.turns.push({ id: randomUUID(), question, answer, at: now });
  conversation.updatedAt = now;

  await fs.writeFile(
    path.join(DIR, `${conversation.id}.json`),
    JSON.stringify(conversation, null, 2),
    "utf8",
  );

  return conversation;
}

export async function remove(id: string): Promise<boolean> {
  if (!/^[a-z0-9-]{8,64}$/i.test(id)) return false;
  try {
    await fs.unlink(path.join(DIR, `${id}.json`));
    return true;
  } catch {
    return false;
  }
}

export type BoardStub = {
  turnId: string;
  conversationId: string;
  topic: string;
  form: string;
  steps: number;
  at: string;
};

async function all(): Promise<Conversation[]> {
  try {
    const files = await fs.readdir(DIR);
    const loaded = await Promise.all(
      files.filter((f) => f.endsWith(".json")).map((f) => get(f.replace(/\.json$/, ""))),
    );
    return loaded.filter((c): c is Conversation => c !== null);
  } catch {
    return [];
  }
}

export async function allBoards(): Promise<BoardStub[]> {
  const conversations = await all();
  const boards: BoardStub[] = [];

  for (const c of conversations) {
    for (const t of c.turns) {
      if (t.answer.kind !== "drawn") continue;
      boards.push({
        turnId: t.id,
        conversationId: c.id,
        topic: t.answer.spec.topic,
        form: t.answer.spec.form,
        steps: t.answer.spec.steps.length,
        at: t.at,
      });
    }
  }

  return boards.sort((a, b) => b.at.localeCompare(a.at));
}

export type Path = {
  id: string;
  title: string;
  turns: number;
  forms: string[];
  updatedAt: string;
};

export async function paths(): Promise<Path[]> {
  const conversations = await all();

  return conversations
    .filter((c) => c.turns.length > 1)
    .map((c) => ({
      id: c.id,
      title: c.title,
      turns: c.turns.length,
      forms: [
        ...new Set(
          c.turns
            .filter((t) => t.answer.kind === "drawn")
            .map((t) => (t.answer as { spec: { form: string } }).spec.form),
        ),
      ],
      updatedAt: c.updatedAt,
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
