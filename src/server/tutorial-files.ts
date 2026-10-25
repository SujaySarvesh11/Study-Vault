/**
 * Reads the built-in tutorial files: Markdown in tutorials/<Section>/NN-name.md.
 * The folder name is the section, NN is the lesson's position, and the first "# Heading" is the title.
 * No database or config here, so the static GitHub Pages build (scripts/build-pages.ts) can use it too.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export const TUTORIALS_DIR = path.resolve(import.meta.dirname, "..", "..", "tutorials");

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
