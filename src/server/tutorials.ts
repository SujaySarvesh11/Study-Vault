/**
 * Built-in tutorials: Markdown files in tutorials/<Section>/NN-name.md become pages.
 * The folder name is the section, NN is the lesson's position, and the first "# Heading" is the title.
 * Importing again updates the existing pages instead of making copies.
 */
import { one, run } from "./db.ts";
import { indexPage } from "./search.ts";
import { loadTutorials } from "./tutorial-files.ts";

// Reading the files lives in tutorial-files.ts (no database), so the GitHub Pages build can share it.
export { loadTutorials, TUTORIALS_DIR, type Tutorial } from "./tutorial-files.ts";

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
