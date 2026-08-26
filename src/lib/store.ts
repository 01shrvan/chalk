import { promises as fs } from "node:fs";
import path from "node:path";
import { SPEC_BY_FORM, type Spec } from "./forms";

export type Saved = {
  slug: string;
  question: string;
  spec: Spec;
  createdAt: string;
};

const DIR = path.join(process.cwd(), ".data", "answers");

function slugify(question: string): string {
  const base = question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 7)
    .join("-")
    .slice(0, 60);
  return base || "answer";
}

export async function save(question: string, spec: Spec): Promise<string> {
  await fs.mkdir(DIR, { recursive: true });

  const base = slugify(question);
  let slug = base;
  let n = 2;
  while (
    await fs
      .access(path.join(DIR, `${slug}.json`))
      .then(() => true)
      .catch(() => false)
  ) {
    slug = `${base}-${n++}`;
    if (n > 50) break;
  }

  const record: Saved = {
    slug,
    question,
    spec,
    createdAt: new Date().toISOString(),
  };
  await fs.writeFile(path.join(DIR, `${slug}.json`), JSON.stringify(record, null, 2), "utf8");
  return slug;
}

export async function load(slug: string): Promise<Saved | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  try {
    const raw = await fs.readFile(path.join(DIR, `${slug}.json`), "utf8");
    const parsed = JSON.parse(raw) as Saved;
    const form = parsed.spec?.form;
    if (!form || !(form in SPEC_BY_FORM)) return null;
    const check = SPEC_BY_FORM[form].safeParse(parsed.spec);
    return check.success ? { ...parsed, spec: check.data as Spec } : null;
  } catch {
    return null;
  }
}

export async function recent(limit = 12): Promise<Saved[]> {
  try {
    const files = await fs.readdir(DIR);
    const all = await Promise.all(
      files.filter((f) => f.endsWith(".json")).map((f) => load(f.replace(/\.json$/, ""))),
    );
    return all
      .filter((a): a is Saved => a !== null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  } catch {
    return [];
  }
}
