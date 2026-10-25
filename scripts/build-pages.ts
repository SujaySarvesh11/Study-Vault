/**
 * Builds a static, read-only copy of the tutorials for GitHub Pages.
 *   node scripts/build-pages.ts            writes the site to _site/
 *   node scripts/build-pages.ts out-dir    writes it somewhere else
 *
 * Every lesson in tutorials/<Section>/NN-name.md becomes _site/<section>/<NN-name>/index.html,
 * rendered at build time with the same look as the app (static/style.css). Links are relative,
 * so the site works under https://<user>.github.io/<repo>/ and when opened from disk.
 * GitHub Pages can't run the server, so there is no sign-in, editing, upload or AI assistant here.
 */
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import hljs from "highlight.js/lib/common";
import { Marked, type Tokens } from "marked";
import { loadTutorials, TUTORIALS_DIR, type Tutorial } from "../src/server/tutorial-files.ts";

const root = path.resolve(import.meta.dirname, "..");
const out = path.resolve(root, process.argv[2] ?? "_site");
const REPO_URL = "https://github.com/SujaySarvesh11/Study-Vault";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const slug = (s: string) => s.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-") || "section";
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/* ---------------- pages ---------------- */
interface Lesson extends Tutorial { url: string; num: number }

const bySection = new Map<string, Lesson[]>();
for (const t of loadTutorials(TUTORIALS_DIR)) {
  const list = bySection.get(t.section) ?? [];
  list.push({ ...t, url: `${slug(t.section)}/${path.basename(t.file, ".md")}/`, num: 0 });
  bySection.set(t.section, list);
}
for (const list of bySection.values()) {
  list.sort((a, b) => a.position - b.position);
  list.forEach((l, i) => (l.num = i + 1));
}
const lessons = [...bySection.values()].flat();

/* ---------------- markdown ---------------- */
interface Heading { id: string; text: string; depth: number }
let headings: Heading[] = [];
let usedIds = new Set<string>();

const md = new Marked({ gfm: true, breaks: false });
md.use({
  renderer: {
    heading({ tokens, depth }: Tokens.Heading) {
      const html = this.parser.parseInline(tokens);
      const text = html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      let id = slug(text), i = 2;
      while (usedIds.has(id)) id = `${slug(text)}-${i++}`;
      usedIds.add(id);
      if (depth === 2 || depth === 3) headings.push({ id, text, depth });
      return `<h${depth} id="${id}">${html}</h${depth}>\n`;
    },
    code({ text, lang }: Tokens.Code) {
      const language = (lang ?? "").trim().split(/\s+/)[0]!.toLowerCase();
      const body = language && hljs.getLanguage(language)
        ? hljs.highlight(text, { language, ignoreIllegals: true }).value
        : esc(text);
      return `<pre><code class="hljs${language ? ` language-${esc(language)}` : ""}">${body}</code></pre>\n`;
    },
    table(token: Tokens.Table) {
      const cell = (c: Tokens.TableCell, tag: "th" | "td") =>
        `<${tag}${c.align ? ` style="text-align:${c.align}"` : ""}>${this.parser.parseInline(c.tokens)}</${tag}>`;
      return `<div class="table-wrap"><table><thead><tr>${token.header.map((c) => cell(c, "th")).join("")}</tr></thead>`
        + `<tbody>${token.rows.map((r) => `<tr>${r.map((c) => cell(c, "td")).join("")}</tr>`).join("")}</tbody></table></div>\n`;
    },
    link({ href, title, tokens }: Tokens.Link) {
      const external = /^https?:\/\//i.test(href);
      return `<a href="${esc(href)}"${title ? ` title="${esc(title)}"` : ""}${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${this.parser.parseInline(tokens)}</a>`;
    },
  },
});

function render(markdown: string): { html: string; toc: Heading[] } {
  headings = []; usedIds = new Set();
  const html = md.parse(markdown, { async: false });
  return { html, toc: headings };
}

/** Plain text for the search index: no code fences, markup or extra spaces. */
const plain = (markdown: string) => markdown
  .replace(/```[\s\S]*?```/g, " ")
  .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
  .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
  .replace(/[#>*_`|~-]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();

/* ---------------- layout ---------------- */
function nav(rel: string, current?: Lesson): string {
  return [...bySection].map(([sec, list]) => `
    <details class="nav-section" data-section="${esc(sec)}"${current?.section === sec ? " open" : ""}>
      <summary class="section-title"><span>${esc(sec)}</span><span class="count">${list.length}</span></summary>
      ${list.map((l) => `<a href="${rel}${l.url}"${l === current ? ' class="active" aria-current="page"' : ""}><span class="num">${String(l.num).padStart(2, "0")}</span><span>${esc(l.title)}</span></a>`).join("\n      ")}
    </details>`).join("");
}

function layout(opts: { title: string; description: string; rel: string; main: string; toc?: Heading[]; current?: Lesson }): string {
  const { title, description, rel, main, toc = [], current } = opts;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="icon" href="${rel}static/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${rel}static/style.css">
  <link rel="stylesheet" href="${rel}static/pages.css">
  <link rel="stylesheet" href="${rel}static/hl-light.css" id="hl-light">
  <link rel="stylesheet" href="${rel}static/hl-dark.css" id="hl-dark" media="(prefers-color-scheme: dark)">
  <script>try{var t=localStorage.getItem("sv-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}</script>
</head>
<body data-root="${rel}">
  <header class="topbar">
    <button class="btn icon-btn ghost menu-toggle" id="menuBtn" aria-label="Menu" aria-controls="sidebar">☰</button>
    <a class="brand" href="${rel}">Study<span>Vault</span></a>
    <form class="search" id="searchForm" role="search" action="${rel}search/">
      <input id="searchInput" name="q" type="search" placeholder="Search the tutorials…" autocomplete="off" aria-label="Search">
      <div class="search-pop hidden" id="searchPop" role="listbox"></div>
    </form>
    <button class="btn icon-btn ghost" id="themeBtn" aria-label="Toggle theme" title="Toggle theme">☾</button>
    <a class="btn ghost hide-sm" href="${REPO_URL}" target="_blank" rel="noopener noreferrer">GitHub</a>
  </header>
  <div class="layout">
    <aside class="sidebar" id="sidebar">
      <nav class="nav" id="nav" aria-label="Lessons">${nav(rel, current)}
      </nav>
    </aside>
    <main id="main" tabindex="-1">
${main}
    </main>
    <aside class="toc" id="toc">${toc.length > 1
      ? `<h4>On this page</h4>${toc.map((h) => `<a class="h${h.depth}" href="#${h.id}">${esc(h.text)}</a>`).join("")}`
      : ""}</aside>
  </div>
  <script src="${rel}static/pages.js"></script>
</body>
</html>
`;
}

/* ---------------- write ---------------- */
rmSync(out, { recursive: true, force: true });
const write = (rel: string, content: string) => {
  const file = path.join(out, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
};

// Assets: the app's own stylesheet and icon, highlight.js themes, and the small Pages-only extras.
const assets = path.join(out, "static");
mkdirSync(assets, { recursive: true });
copyFileSync(path.join(root, "static/style.css"), path.join(assets, "style.css"));
copyFileSync(path.join(root, "static/favicon.svg"), path.join(assets, "favicon.svg"));
const hlStyles = path.join(root, "node_modules/highlight.js/styles");
copyFileSync(path.join(hlStyles, "github.min.css"), path.join(assets, "hl-light.css"));
copyFileSync(path.join(hlStyles, "github-dark.min.css"), path.join(assets, "hl-dark.css"));
copyFileSync(path.join(root, "scripts/pages/pages.css"), path.join(assets, "pages.css"));
copyFileSync(path.join(root, "scripts/pages/pages.js"), path.join(assets, "pages.js"));
write(".nojekyll", ""); // serve files as they are; don't run Jekyll

// Lessons
lessons.forEach((l, i) => {
  const { html, toc } = render(l.content_md);
  const prev = lessons[i - 1], next = lessons[i + 1];
  const rel = "../../";
  write(path.join(l.url, "index.html"), layout({
    title: `${l.title} · ${l.section} · StudyVault`,
    description: plain(l.content_md).slice(0, 160),
    rel, toc, current: l,
    main: `      <div class="crumbs">${esc(l.section)} · Lesson ${l.num} of ${bySection.get(l.section)!.length}</div>
      <div class="page-head"><h1>${esc(l.title)}</h1>
        <div class="page-tools"><a class="btn" href="${REPO_URL}/blob/main/tutorials/${encodeURIComponent(l.section)}/${encodeURIComponent(path.basename(l.file))}" target="_blank" rel="noopener noreferrer">View source</a></div></div>
      <article class="prose" id="article">
${html}
      </article>
      <nav class="pager" aria-label="Lesson navigation">
        ${prev ? `<a class="prev" href="${rel}${prev.url}"><small>← Previous</small><b>${esc(prev.title)}</b></a>` : ""}
        ${next ? `<a class="next" href="${rel}${next.url}"><small>Next →</small><b>${esc(next.title)}</b></a>` : ""}
      </nav>`,
  }));
});

// Home
write("index.html", layout({
  title: "StudyVault Tutorials",
  description: `Free tutorials: ${[...bySection.keys()].join(", ")}.`,
  rel: "",
  main: `      <div class="home-hero"><h1>StudyVault Tutorials</h1>
        <p>${plural(lessons.length, "lesson")} across ${plural(bySection.size, "section")}. Pick a section and start at lesson 1, or search for a topic.</p></div>
      <div class="cards">${[...bySection].map(([sec, list]) => `
        <div class="card"><h3><a class="card-link" href="${list[0]!.url}">${esc(sec)}</a></h3><small>${plural(list.length, "lesson")}</small>
          <ol>${list.map((l) => `<li><a href="${l.url}">${esc(l.title)}</a></li>`).join("")}</ol></div>`).join("")}
      </div>
      <p class="meta">This is a read-only copy of the tutorials. To run StudyVault yourself, with your own notes, uploads and the AI assistant, see the <a href="${REPO_URL}#readme" target="_blank" rel="noopener noreferrer">README on GitHub</a>.</p>`,
}));

// Search results page (works without the pop-up, e.g. after pressing Enter)
write("search/index.html", layout({
  title: "Search · StudyVault",
  description: "Search the StudyVault tutorials.",
  rel: "../",
  main: `      <div class="page-head"><h1>Search</h1></div>
      <div id="searchResults" aria-live="polite"><p class="meta">Type in the search box above.</p></div>`,
}));

// 404
write("404.html", layout({
  title: "Page not found · StudyVault",
  description: "Page not found.",
  rel: "/Study-Vault/",
  main: `      <div class="home-hero"><h1>Page not found</h1><p>That lesson may have moved.</p></div>
      <a class="btn primary" href="/Study-Vault/">Go to all tutorials</a>`,
}));

// Search index
write("search-index.json", JSON.stringify(lessons.map((l) => ({
  t: l.title, s: l.section, u: l.url, h: render(l.content_md).toc.map((h) => h.text).join(" · "), x: plain(l.content_md),
}))));

console.log(`Built ${lessons.length} lessons in ${bySection.size} sections → ${path.relative(root, out) || "."}`);
