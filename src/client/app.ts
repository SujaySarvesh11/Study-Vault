/* StudyVault front end. Every Markdown render is sanitised by DOMPurify. */
import DOMPurify from "dompurify";
import hljs from "highlight.js/lib/common";
import { marked } from "marked";
import type {
  ChatEvent, ChatSource, ChatTurn, Me, Page, PageInput, PageSummary, SearchHit, UploadResult, UserRow,
} from "../shared/api.ts";
import { ALL_EXTENSIONS } from "../shared/files.ts";
import { $, $$, errorMessage, esc } from "./dom.ts";

interface State {
  me: Me | null;
  pages: PageSummary[];
  chat: ChatTurn[];
}
const state: State = { me: null, pages: [], chat: [] };
const main = $("#main");
const toc = $("#toc");

/** The signed-in user. Only called after boot has loaded it. */
function me(): Me {
  if (!state.me) throw new Error("Not signed in");
  return state.me;
}
const isOwner = () => me().role === "owner";

/* ---------------- theme ---------------- */
type Theme = "light" | "dark";

function applyTheme(t: Theme | null): void {
  const root = document.documentElement;
  if (t) root.dataset.theme = t; else delete root.dataset.theme;
  const dark = t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  $<HTMLLinkElement>("#hl-dark").media = dark ? "all" : "not all";
  $<HTMLLinkElement>("#hl-light").media = dark ? "not all" : "all";
  $("#themeBtn").textContent = dark ? "☀" : "☾";
}
function storedTheme(): Theme | null {
  try {
    const t = localStorage.getItem("sv-theme");
    return t === "light" || t === "dark" ? t : null;
  } catch { return null; }
}
applyTheme(storedTheme());
$("#themeBtn").onclick = () => {
  const current = document.documentElement.dataset.theme;
  const dark = current ? current === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  const t: Theme = dark ? "light" : "dark";
  try { localStorage.setItem("sv-theme", t); } catch { /* private window */ }
  applyTheme(t);
};

/* ---------------- api ---------------- */
interface ApiOptions extends Omit<RequestInit, "body"> {
  json?: unknown;
  body?: BodyInit;
}

async function api(path: string, opts: ApiOptions = {}): Promise<Response> {
  const { json, ...init } = opts;
  const headers = new Headers(init.headers);
  if (state.me) headers.set("X-CSRF-Token", state.me.csrf);
  if (json !== undefined) {
    headers.set("Content-Type", "application/json");
    init.body = JSON.stringify(json);
  }
  const r = await fetch(path, { ...init, headers, credentials: "same-origin" });
  if (r.status === 401) { location.href = "/login"; throw new Error("signed out"); }
  if (!r.ok) throw new Error(await errorMessage(r));
  return r;
}

/** GET a URL and say what type the JSON is: getJSON<Page>("/api/pages/1"). */
const getJSON = async <T>(path: string): Promise<T> => (await api(path)).json() as Promise<T>;
const sendJSON = async <T>(path: string, opts: ApiOptions): Promise<T> => (await api(path, opts)).json() as Promise<T>;

function toast(msg: string): void {
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/* ---------------- markdown ---------------- */
marked.setOptions({ gfm: true, breaks: false });

function slugify(s: string, used: Set<string>): string {
  const base = s.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-") || "section";
  let id = base, i = 2;
  while (used.has(id)) id = `${base}-${i++}`;
  used.add(id);
  return id;
}

function renderMarkdown(md: string, el: HTMLElement, { withToc = false } = {}): void {
  el.innerHTML = DOMPurify.sanitize(marked.parse(md || "", { async: false }), { USE_PROFILES: { html: true } });

  // Media embeds: ![video: name](/files/id?kind=video)
  $$<HTMLImageElement>("img", el).forEach((img) => {
    const src = img.getAttribute("src") ?? "";
    const m = /^\/files\/[0-9a-f]{32}\?kind=(video|audio)$/.exec(src);
    if (m) {
      const media = document.createElement(m[1] as "video" | "audio");
      media.controls = true; media.preload = "metadata";
      media.src = src.split("?")[0]!;
      img.replaceWith(media);
    } else {
      img.loading = "lazy";
    }
  });

  // External links open in a new tab, without leaking anything.
  $$<HTMLAnchorElement>("a[href]", el).forEach((a) => {
    if (/^https?:\/\//i.test(a.getAttribute("href") ?? "")) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
  });

  $$("table", el).forEach((t) => {
    const w = document.createElement("div"); w.className = "table-wrap";
    t.replaceWith(w); w.appendChild(t);
  });

  $$("pre code", el).forEach((code) => {
    try { hljs.highlightElement(code); } catch { /* unknown language */ }
    const btn = document.createElement("button");
    btn.className = "btn copy-btn"; btn.type = "button"; btn.textContent = "Copy";
    btn.onclick = async () => {
      try { await navigator.clipboard.writeText(code.innerText); btn.textContent = "Copied"; }
      catch { btn.textContent = "Select & copy"; }
      setTimeout(() => (btn.textContent = "Copy"), 1500);
    };
    code.parentElement?.appendChild(btn);
  });

  const used = new Set<string>();
  const heads = $$("h2, h3", el);
  heads.forEach((h) => (h.id = slugify(h.textContent ?? "", used)));
  if (withToc) {
    toc.innerHTML = heads.length > 1
      ? `<h4>On this page</h4>` + heads.map((h) => `<a class="${h.tagName.toLowerCase()}" href="#" data-target="${esc(h.id)}">${esc(h.textContent)}</a>`).join("")
      : "";
    $$<HTMLAnchorElement>("a[data-target]", toc).forEach((a) => (a.onclick = (e) => {
      e.preventDefault();
      document.getElementById(a.dataset.target ?? "")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }));
  }
}

/* ---------------- sidebar ---------------- */
function grouped(): Map<string, PageSummary[]> {
  const map = new Map<string, PageSummary[]>();
  for (const p of state.pages) {
    const list = map.get(p.section) ?? [];
    list.push(p);
    map.set(p.section, list);
  }
  return map;
}
const orderedPages = () => [...grouped().values()].flat();
const sections = () => [...grouped().keys()];

async function loadPages(): Promise<void> {
  state.pages = await getJSON<PageSummary[]>("/api/pages");
  renderNav();
}

function renderNav(): void {
  const nav = $("#nav");
  if (!state.pages.length) {
    nav.innerHTML = `<div class="section-title">No pages yet</div>`;
    return;
  }
  const open = openSections();
  let html = "";
  for (const [sec, pages] of grouped()) {
    // <details>/<summary> is the browser's built-in collapsible box (works with the keyboard too).
    html += `<details class="nav-section" data-section="${esc(sec)}"${open.has(sec) ? " open" : ""}>
      <summary class="section-title"><span>${esc(sec)}</span><span class="count">${pages.length}</span></summary>`;
    pages.forEach((p, i) => {
      html += `<a href="#/page/${p.id}" data-id="${p.id}"><span class="num">${String(i + 1).padStart(2, "0")}</span><span>${esc(p.title)}</span>${isOwner() && !p.shared ? '<span class="lock" title="Private">●</span>' : ""}</a>`;
    });
    html += `</details>`;
  }
  nav.innerHTML = html;
  $$<HTMLDetailsElement>("details.nav-section", nav).forEach((d) => {
    d.addEventListener("toggle", () => {
      const sections = openSections();
      const name = d.dataset.section ?? "";
      if (d.open) sections.add(name); else sections.delete(name);
      saveOpenSections(sections);
    });
  });
  markActive();
}

/* Which sidebar sections are expanded, remembered in this browser. */
const OPEN_KEY = "sv-open-sections";
function openSections(): Set<string> {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(OPEN_KEY) ?? "[]");
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  } catch { return new Set(); }
}
function saveOpenSections(sections: Set<string>): void {
  try { localStorage.setItem(OPEN_KEY, JSON.stringify([...sections])); } catch { /* private window */ }
}

function markActive(): void {
  const m = /^#\/page\/(\d+)/.exec(location.hash);
  $$<HTMLAnchorElement>("#nav a").forEach((a) => {
    const active = !!m && a.dataset.id === m[1];
    a.classList.toggle("active", active);
    // Always show the page you're reading: open its section.
    const section = a.closest("details");
    if (active && section && !section.open) section.open = true;
  });
}

$("#menuBtn").onclick = () => $("#sidebar").classList.toggle("open");

/* ---------------- views ---------------- */
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function viewHome(): void {
  toc.innerHTML = "";
  const g = grouped();
  if (!g.size) {
    main.innerHTML = `<div class="home-hero"><h1>Your notebook is empty</h1>
      <p>${isOwner() ? "Upload a Word file, spreadsheet, PDF, slides, images or a video, and each one becomes a readable lesson page. Or write a page from scratch." : "Nothing has been shared with you yet."}</p></div>
      ${isOwner() ? `<div class="row"><a class="btn primary" href="#/upload">⇪ Upload study material</a><a class="btn" href="#/new">＋ Write a page</a></div>` : ""}`;
    return;
  }
  main.innerHTML = `<div class="home-hero"><h1>Welcome back${me().username ? ", " + esc(me().username) : ""}</h1>
    <p>${plural(state.pages.length, "page")} across ${plural(g.size, "section")}. Pick up where you left off, or ask your notes a question.</p></div>
    <div class="cards">${[...g].map(([sec, pages]) => `
      <div class="card"><h3>${esc(sec)}</h3><small>${plural(pages.length, "lesson")}</small>
      <ol>${pages.slice(0, 8).map((p) => `<li><a href="#/page/${p.id}">${esc(p.title)}</a></li>`).join("")}${pages.length > 8 ? `<li>…</li>` : ""}</ol></div>`).join("")}
    </div>`;
}

async function viewPage(id: number): Promise<void> {
  const p = await getJSON<Page>(`/api/pages/${id}`);
  const list = orderedPages();
  const idx = list.findIndex((x) => x.id === p.id);
  const prev = list[idx - 1], next = list[idx + 1];
  main.innerHTML = `
    <div class="crumbs">${esc(p.section)}</div>
    <div class="page-head"><h1>${esc(p.title)} ${isOwner() ? `<span class="badge ${p.shared ? "" : "private"}">${p.shared ? "shared" : "private"}</span>` : ""}</h1>
      <div class="page-tools">
        <a class="btn" href="/api/pages/${p.id}/download.md" download>↓ .md</a>
        ${isOwner() ? `<a class="btn" href="#/edit/${p.id}">✎ Edit</a>` : ""}
      </div></div>
    <article class="prose" id="article"></article>
    <nav class="pager">
      ${prev ? `<a class="prev" href="#/page/${prev.id}"><small>← Previous</small><b>${esc(prev.title)}</b></a>` : ""}
      ${next ? `<a class="next" href="#/page/${next.id}"><small>Next →</small><b>${esc(next.title)}</b></a>` : ""}
    </nav>
    <div class="meta">Last updated ${esc(p.updated_at)} UTC</div>`;
  renderMarkdown(p.content_md, $("#article"), { withToc: true });
  document.title = `${p.title} · StudyVault`;
}

async function viewEditor(id: number | null): Promise<void> {
  toc.innerHTML = "";
  const p: Pick<Page, "title" | "section" | "content_md" | "shared"> = id
    ? await getJSON<Page>(`/api/pages/${id}`)
    : { title: "", section: sections()[0] ?? "General", content_md: "", shared: 0 };
  main.innerHTML = `
    <div class="editor-head">
      <div class="field"><label>Title</label><input id="edTitle" maxlength="200" value="${esc(p.title)}" placeholder="e.g. Python: list comprehensions"></div>
      <div class="field"><label>Section</label><input id="edSection" maxlength="100" list="secList" value="${esc(p.section)}">
        <datalist id="secList">${sections().map((s) => `<option value="${esc(s)}">`).join("")}</datalist></div>
      <label class="check"><input type="checkbox" id="edShared" ${p.shared ? "checked" : ""}> Share with viewers</label>
    </div>
    <div class="editor-tools">
      <button class="btn primary" id="edSave">Save</button>
      ${id ? `<a class="btn" href="#/page/${id}">Cancel</a>` : `<a class="btn" href="#/">Cancel</a>`}
      ${id ? `<label class="btn" title="Insert an image, video or file into this page">⇪ Insert file<input type="file" id="edFile" class="visually-hidden" accept="${ALL_EXTENSIONS.join(",")}"></label>` : ""}
      <span class="grow"></span>
      ${id ? `<button class="btn danger" id="edDelete">Delete page</button>` : ""}
    </div>
    <div class="editor">
      <textarea id="edBody" spellcheck="true" placeholder="Write in Markdown. # Heading, **bold**, \`code\`, \`\`\`python … \`\`\` for code blocks">${esc(p.content_md)}</textarea>
      <div class="preview prose" id="edPreview"></div>
    </div>`;
  const body = $<HTMLTextAreaElement>("#edBody"), preview = $("#edPreview");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const refresh = () => renderMarkdown(body.value, preview);
  body.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(refresh, 200); });
  body.addEventListener("keydown", (e) => {
    if (e.key === "Tab") { e.preventDefault(); body.setRangeText("  ", body.selectionStart, body.selectionEnd, "end"); }
    if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); $("#edSave").click(); }
  });
  refresh();

  $("#edSave").onclick = async () => {
    const payload: PageInput = {
      title: $<HTMLInputElement>("#edTitle").value.trim(),
      section: $<HTMLInputElement>("#edSection").value.trim() || "General",
      content_md: body.value,
      shared: $<HTMLInputElement>("#edShared").checked,
    };
    if (!payload.title) return toast("Give the page a title");
    try {
      const r = await sendJSON<{ id: number }>(id ? `/api/pages/${id}` : "/api/pages", { method: id ? "PUT" : "POST", json: payload });
      await loadPages();
      location.hash = `#/page/${r.id}`;
      toast("Saved");
    } catch (e) { toast(errText(e)); }
  };
  if (id) {
    $("#edDelete").onclick = async () => {
      if (!confirm("Delete this page and its attached files? This can't be undone.")) return;
      await api(`/api/pages/${id}`, { method: "DELETE" });
      await loadPages();
      location.hash = "#/";
    };
    const fileInput = $<HTMLInputElement>("#edFile");
    fileInput.onchange = async () => {
      const f = fileInput.files?.[0]; if (!f) return;
      const fd = new FormData(); fd.append("file", f); fd.append("page_id", String(id));
      toast("Uploading…");
      try {
        const r = await sendJSON<UploadResult>("/api/upload", { method: "POST", body: fd });
        body.setRangeText("\n" + (r.markdown ?? "") + "\n", body.selectionStart, body.selectionEnd, "end");
        refresh(); toast("Inserted. Remember to save.");
      } catch (err) { toast(errText(err)); }
      fileInput.value = "";
    };
  }
}

function viewUpload(): void {
  toc.innerHTML = "";
  main.innerHTML = `
    <h1 class="prose">Add study material</h1>
    <p class="meta">Word, Excel, PowerPoint, PDF, CSV, HTML, text, images, video and audio. Documents are converted to Markdown pages; media is embedded with room for notes.</p>
    <div class="upload-grid">
      <div class="field"><label>Section (like a course or chapter)</label><input id="upSection" list="secList2" maxlength="100" value="${esc(sections()[0] ?? "Uploads")}">
        <datalist id="secList2">${sections().map((s) => `<option value="${esc(s)}">`).join("")}</datalist></div>
      <label class="check"><input type="checkbox" id="upShared"> Share these pages with viewers</label>
    </div>
    <label class="dropzone" id="drop">
      <input type="file" id="upFiles" multiple class="visually-hidden" accept="${ALL_EXTENSIONS.join(",")}">
      <span class="dropzone-icon" aria-hidden="true">⇪</span>
      <span class="dropzone-title"><strong>Drop files here</strong> or click to choose</span>
      <span class="dropzone-hint">One page is created per file</span>
    </label>
    <div class="upload-list" id="upList"></div>`;
  const drop = $("#drop");
  const go = async (files: File[]) => {
    for (const f of files) {
      const row = document.createElement("div");
      row.innerHTML = `<span>${esc(f.name)}</span><span>converting…</span>`;
      $("#upList").prepend(row);
      const status = row.lastElementChild as HTMLElement;
      const fd = new FormData();
      fd.append("file", f);
      fd.append("section", $<HTMLInputElement>("#upSection").value.trim() || "Uploads");
      fd.append("shared", $<HTMLInputElement>("#upShared").checked ? "true" : "false");
      try {
        const r = await sendJSON<UploadResult>("/api/upload", { method: "POST", body: fd });
        status.innerHTML = `<a class="ok" href="#/page/${r.page_id}">✓ open page</a>`;
      } catch (e) {
        status.className = "err"; status.textContent = errText(e);
      }
    }
    await loadPages();
  };
  const picker = $<HTMLInputElement>("#upFiles");
  picker.onchange = () => go([...(picker.files ?? [])]);
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("over"); go([...(e.dataTransfer?.files ?? [])]); });
}

async function viewSearch(q: string): Promise<void> {
  toc.innerHTML = "";
  $<HTMLInputElement>("#searchInput").value = q;
  const hits = await getJSON<SearchHit[]>(`/api/search?q=${encodeURIComponent(q)}`);
  main.innerHTML = `<h1 class="prose">Results for “${esc(q)}”</h1>` + (hits.length
    ? hits.map((h) => `<div class="search-hit"><a href="#/page/${h.id}">${esc(h.title)}</a> <small class="meta">· ${esc(h.section)}</small>
        <p>${esc(h.snip).replace(/\[\[/g, "<mark>").replace(/\]\]/g, "</mark>")}</p></div>`).join("")
    : `<p class="meta">Nothing matched. Try fewer or different words, or ask the notes assistant.</p>`);
}

async function viewSettings(): Promise<void> {
  toc.innerHTML = "";
  main.innerHTML = `
    <h1 class="prose">Settings</h1>
    <div class="panel"><h2>Change password</h2>
      <div class="row">
        <div class="field"><label>Current</label><input type="password" id="pwCur" autocomplete="current-password"></div>
        <div class="field"><label>New (10+ characters)</label><input type="password" id="pwNew" autocomplete="new-password"></div>
        <button class="btn primary" id="pwSave">Update</button>
      </div></div>
    ${isOwner() ? `
    <div class="panel"><h2>Viewers</h2>
      <p class="meta">Viewers can read pages marked “shared” and ask the assistant about them. They can't edit, upload or see private pages.</p>
      <div id="userList"></div>
      <div class="row">
        <div class="field"><label>Username</label><input id="nuName" maxlength="32"></div>
        <div class="field"><label>Password (10+ characters)</label><input id="nuPw" type="password" autocomplete="new-password"></div>
        <button class="btn" id="nuAdd">Add viewer</button>
      </div></div>
    <div class="panel"><h2>AI index</h2>
      <p class="meta">Rebuild the assistant's search index, for example after changing the embedding model.</p>
      <button class="btn" id="reindex">Rebuild index</button></div>` : ""}`;
  $("#pwSave").onclick = async () => {
    try {
      await api("/api/password", { method: "POST", json: { current: $<HTMLInputElement>("#pwCur").value, new: $<HTMLInputElement>("#pwNew").value } });
      toast("Password changed. Please sign in again."); setTimeout(() => (location.href = "/login"), 1200);
    } catch (e) { toast(errText(e)); }
  };
  if (!isOwner()) return;
  const loadUsers = async () => {
    const users = await getJSON<UserRow[]>("/api/users");
    $("#userList").innerHTML = users.map((u) => `<div class="list-row"><span>${esc(u.username)} <span class="badge ${u.role === "owner" ? "" : "private"}">${esc(u.role)}</span></span>
      ${u.role === "viewer" ? `<button class="btn danger" data-del="${u.id}">Remove</button>` : ""}</div>`).join("");
    $$<HTMLButtonElement>("[data-del]").forEach((b) => (b.onclick = async () => {
      if (!confirm("Remove this viewer?")) return;
      await api(`/api/users/${b.dataset.del}`, { method: "DELETE" }); void loadUsers();
    }));
  };
  void loadUsers();
  $("#nuAdd").onclick = async () => {
    const name = $<HTMLInputElement>("#nuName"), pw = $<HTMLInputElement>("#nuPw");
    try {
      await api("/api/users", { method: "POST", json: { username: name.value.trim(), password: pw.value } });
      name.value = pw.value = ""; toast("Viewer added"); void loadUsers();
    } catch (e) { toast(errText(e)); }
  };
  const reindex = $<HTMLButtonElement>("#reindex");
  reindex.onclick = async () => {
    reindex.disabled = true; toast("Rebuilding…");
    try { const r = await sendJSON<{ pages: number }>("/api/reindex", { method: "POST" }); toast(`Indexed ${r.pages} pages`); }
    catch (e) { toast(errText(e)); }
    reindex.disabled = false;
  };
}

/* ---------------- router ---------------- */
async function route(): Promise<void> {
  const h = location.hash || "#/";
  $("#sidebar").classList.remove("open");
  markActive();
  document.title = "StudyVault";
  try {
    let m: RegExpExecArray | null;
    if ((m = /^#\/page\/(\d+)/.exec(h))) await viewPage(Number(m[1]));
    else if ((m = /^#\/edit\/(\d+)/.exec(h)) && isOwner()) await viewEditor(Number(m[1]));
    else if (h === "#/new" && isOwner()) await viewEditor(null);
    else if (h === "#/upload" && isOwner()) viewUpload();
    else if ((m = /^#\/search\/(.*)/.exec(h))) await viewSearch(decodeURIComponent(m[1]!));
    else if (h === "#/settings") await viewSettings();
    else viewHome();
    main.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  } catch (e) {
    main.innerHTML = `<div class="empty">${esc(errText(e))}</div>`;
  }
}
window.addEventListener("hashchange", () => void route());
$<HTMLFormElement>("#searchForm").onsubmit = (e) => {
  e.preventDefault();
  const q = $<HTMLInputElement>("#searchInput").value.trim();
  if (q) location.hash = `#/search/${encodeURIComponent(q)}`;
};

async function logout(): Promise<void> {
  try { await api("/api/logout", { method: "POST" }); } catch { /* signed out anyway */ }
  location.href = "/login";
}
$("#logoutBtn").onclick = logout;
$("#logoutBtn2").onclick = logout;

/* ---------------- chat ---------------- */
const chat = $("#chat"), log = $("#chatLog"), fab = $("#chatFab");
const chatInput = $<HTMLTextAreaElement>("#chatInput");
const chatForm = $<HTMLFormElement>("#chatForm");
fab.onclick = () => { chat.classList.remove("hidden"); fab.classList.add("hidden"); chatInput.focus(); };
$("#chatClose").onclick = () => { chat.classList.add("hidden"); fab.classList.remove("hidden"); };
$("#chatClear").onclick = () => { state.chat = []; log.innerHTML = ""; greet(); };
function greet(): void {
  const d = document.createElement("div");
  d.className = "msg bot";
  d.textContent = "Ask me about anything in your notes. I only answer from pages on this site and I'll show which pages I used.";
  log.appendChild(d);
}
greet();

chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); chatForm.requestSubmit(); }
});

/** Read the NDJSON stream from /api/chat one event at a time. */
async function* chatEvents(r: Response): AsyncGenerator<ChatEvent> {
  if (!r.body) return;
  const reader = r.body.getReader(), dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
      if (line.trim()) yield JSON.parse(line) as ChatEvent;
    }
  }
}

chatForm.onsubmit = async (e) => {
  e.preventDefault();
  const q = chatInput.value.trim();
  if (!q) return;
  chatInput.value = "";
  const u = document.createElement("div"); u.className = "msg user"; u.textContent = q; log.appendChild(u);
  const b = document.createElement("div"); b.className = "msg bot prose typing"; log.appendChild(b);
  log.scrollTop = log.scrollHeight;

  let answer = "", sources: ChatSource[] = [];
  const history = state.chat.slice(-6);
  try {
    const r = await api("/api/chat", { method: "POST", json: { question: q, history } });
    for await (const msg of chatEvents(r)) {
      // `"key" in msg` narrows the ChatEvent union to the matching kind.
      if ("sources" in msg) sources = msg.sources;
      if ("t" in msg) { answer += msg.t; renderMarkdown(answer, b); log.scrollTop = log.scrollHeight; }
      if ("error" in msg) { answer = "⚠ " + msg.error; renderMarkdown(answer, b); }
    }
  } catch (err) {
    answer = "⚠ " + errText(err); renderMarkdown(answer, b);
  }
  b.classList.remove("typing");
  const cited = sources.filter((s) => answer.includes(`[${s.n}]`));
  const show = cited.length ? cited : (answer.startsWith("⚠") || answer.startsWith("I couldn't") ? [] : sources.slice(0, 3));
  if (show.length) {
    const s = document.createElement("div"); s.className = "sources";
    s.innerHTML = "Sources:" + show.map((x) => `<a href="#/page/${x.page_id}">[${x.n}] ${esc(x.title)} › ${esc(x.heading)}</a>`).join("");
    b.appendChild(s);
  }
  state.chat.push({ role: "user", content: q }, { role: "assistant", content: answer });
  log.scrollTop = log.scrollHeight;
};

/* ---------------- boot ---------------- */
void (async () => {
  try {
    const r = await fetch("/api/me", { credentials: "same-origin" });
    if (!r.ok) { location.href = "/login"; return; }
    state.me = (await r.json()) as Me;
  } catch { location.href = "/login"; return; }
  if (!isOwner()) $$(".owner-only").forEach((el) => el.classList.add("hidden"));
  await loadPages();
  await route();
})();
