/**
 * Built-in tutorials: Markdown files in tutorials/<Section>/NN-name.md become pages.
 * The folder name is the section, NN is the lesson's position, and the first "# Heading" is the title.
 * Importing again updates the existing pages instead of making copies.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { BASE_DIR } from "./config.ts";
import { one, run } from "./db.ts";
import { indexPage } from "./search.ts";

export const TUTORIALS_DIR = path.join(BASE_DIR, "tutorials");

export interface Tutorial {
  section: string;
  position: number;
  title: string;
  content_md: string;
  file: string;
}

/** Read every lesson file. Throws if a file has no number prefix or no "# Title" line. */
export function loadTutorials(dir = TUTORIALS_DIR): Tutorial[] {
  const out: Tutorial[] = [];
  for (const section of readdirSync(dir).sort()) {
    const sectionDir = path.join(dir, section);
    if (!statSync(sectionDir).isDirectory()) continue;
    for (const name of readdirSync(sectionDir).filter((f) => f.endsWith(".md")).sort()) {
      const file = path.join(sectionDir, name);
      const position = Number(/^(\d+)-/.exec(name)?.[1]);
      if (!position) throw new Error(`${file}: name must start with a number, like 01-intro.md`);
      const text = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
      const m = /^# (.+)\n/.exec(text);
      if (!m) throw new Error(`${file}: the first line must be "# Title"`);
      out.push({ section, position, title: m[1]!.trim(), content_md: text.slice(m[0].length).trim() + "\n", file });
    }
  }
  return out;
}

/** Add (or update) every tutorial as a page. Returns how many were added and updated. */
export async function importTutorials(shared: boolean): Promise<{ added: number; updated: number }> {
  let added = 0, updated = 0;
  for (const t of loadTutorials()) {
    const existing = one<{ id: number }>("SELECT id FROM pages WHERE section=? AND title=?", t.section, t.title);
    let id: number;
    if (existing) {
      id = existing.id;
      run(`UPDATE pages SET content_md=?, position=?, shared=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        t.content_md, t.position, shared ? 1 : 0, id);
      updated++;
    } else {
      id = run("INSERT INTO pages(title, section, position, content_md, shared) VALUES (?,?,?,?,?)",
        t.title, t.section, t.position, t.content_md, shared ? 1 : 0).lastId;
      added++;
    }
    await indexPage(id, t.title, t.content_md);
    console.log(`  ${existing ? "updated" : "added  "}  ${t.section} › ${t.title}`);
  }
  return { added, updated };
}
