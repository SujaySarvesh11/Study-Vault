// StudyVault static site (GitHub Pages): theme, menu, copy buttons and search.
// Plain JavaScript so the site needs no bundler. The pages work without it, too.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.body.dataset.root || "";
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private window */ } },
  };

  /* ---------- theme ---------- */
  const prefersDark = () => matchMedia("(prefers-color-scheme: dark)").matches;
  function applyTheme(t) {
    const html = document.documentElement;
    if (t) html.dataset.theme = t; else delete html.dataset.theme;
    const dark = t ? t === "dark" : prefersDark();
    $("#hl-dark").media = dark ? "all" : "not all";
    $("#hl-light").media = dark ? "not all" : "all";
    $("#themeBtn").textContent = dark ? "☀" : "☾";
  }
  const saved = store.get("sv-theme");
  applyTheme(saved === "light" || saved === "dark" ? saved : null);
  $("#themeBtn").onclick = () => {
    const cur = document.documentElement.dataset.theme;
    const t = (cur ? cur === "dark" : prefersDark()) ? "light" : "dark";
    store.set("sv-theme", t);
    applyTheme(t);
  };

  /* ---------- sidebar ---------- */
  const sidebar = $("#sidebar");
  $("#menuBtn").onclick = (e) => { e.stopPropagation(); sidebar.classList.toggle("open"); };
  document.addEventListener("click", (e) => {
    if (sidebar.classList.contains("open") && !sidebar.contains(e.target)) sidebar.classList.remove("open");
  });
  const OPEN_KEY = "sv-open-sections";
  let open;
  try { open = new Set(JSON.parse(store.get(OPEN_KEY) || "[]")); } catch { open = new Set(); }
  $$("details.nav-section").forEach((d) => {
    if (open.has(d.dataset.section)) d.open = true;
    d.addEventListener("toggle", () => {
      if (d.open) open.add(d.dataset.section); else open.delete(d.dataset.section);
      store.set(OPEN_KEY, JSON.stringify([...open]));
    });
  });
  // Show the current lesson in the sidebar without scrolling the page itself.
  const active = $("#nav a.active");
  if (active) sidebar.scrollTop = active.offsetTop - sidebar.clientHeight / 2;

  /* ---------- copy buttons ---------- */
  $$(".prose pre > code").forEach((code) => {
    const btn = document.createElement("button");
    btn.className = "btn copy-btn"; btn.type = "button"; btn.textContent = "Copy";
    btn.onclick = async () => {
      try { await navigator.clipboard.writeText(code.innerText); btn.textContent = "Copied"; }
      catch { btn.textContent = "Select & copy"; }
      setTimeout(() => (btn.textContent = "Copy"), 1500);
    };
    code.parentElement.appendChild(btn);
  });

  /* ---------- search ---------- */
  let index = null;
  const loadIndex = () => index ??= fetch(root + "search-index.json").then((r) => r.json()).then((rows) =>
    rows.map((r) => ({ ...r, tl: r.t.toLowerCase(), hl: r.h.toLowerCase(), xl: r.x.toLowerCase() })));

  function search(rows, q) {
    const terms = q.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
    if (!terms.length) return [];
    const hits = [];
    for (const r of rows) {
      let score = 0;
      for (const t of terms) {
        const inTitle = r.tl.includes(t), inHead = r.hl.includes(t);
        const inText = inTitle || inHead ? 0 : r.xl.split(t).length - 1;
        if (!inTitle && !inHead && !inText) { score = 0; break; }
        score += (inTitle ? 20 : 0) + (inHead ? 6 : 0) + Math.min(inText, 10);
      }
      if (score) hits.push({ r, score });
    }
    return hits.sort((a, b) => b.score - a.score).map((h) => h.r);
  }

  function snippet(r, q) {
    const terms = q.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
    const at = Math.max(0, Math.min(...terms.map((t) => r.xl.indexOf(t)).filter((i) => i >= 0), r.x.length));
    const start = Math.max(0, at - 60);
    let s = esc((start ? "…" : "") + r.x.slice(start, start + 180) + "…");
    for (const t of terms) s = s.replace(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), (m) => `<mark>${m}</mark>`);
    return s;
  }

  const input = $("#searchInput"), pop = $("#searchPop");
  let timer;
  input.addEventListener("focus", loadIndex, { once: true });
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const q = input.value.trim();
      if (q.length < 2) { pop.classList.add("hidden"); return; }
      const hits = search(await loadIndex(), q);
      pop.innerHTML = hits.length
        ? hits.slice(0, 7).map((r) => `<a href="${root}${r.u}" role="option"><b>${esc(r.t)}</b><small>${esc(r.s)}</small></a>`).join("")
          + (hits.length > 7 ? `<a class="more" href="${root}search/?q=${encodeURIComponent(q)}">See all ${hits.length} results →</a>` : "")
        : `<div class="none">No lessons match “${esc(q)}”.</div>`;
      pop.classList.remove("hidden");
    }, 120);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { pop.classList.add("hidden"); input.blur(); }
    if (e.key === "ArrowDown") { e.preventDefault(); $("a", pop)?.focus(); }
  });
  pop.addEventListener("keydown", (e) => {
    const links = $$("a", pop), i = links.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); links[i + 1]?.focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); (links[i - 1] ?? input).focus(); }
    if (e.key === "Escape") { pop.classList.add("hidden"); input.focus(); }
  });
  document.addEventListener("click", (e) => { if (!$("#searchForm").contains(e.target)) pop.classList.add("hidden"); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) { e.preventDefault(); input.focus(); }
  });

  // Full results page: search/?q=...
  const results = $("#searchResults");
  if (results) {
    const q = new URLSearchParams(location.search).get("q")?.trim() ?? "";
    input.value = q;
    if (q) loadIndex().then((rows) => {
      const hits = search(rows, q);
      document.title = `${q} · Search · StudyVault`;
      results.innerHTML = `<p class="meta">${hits.length} result${hits.length === 1 ? "" : "s"} for “${esc(q)}”</p>`
        + hits.map((r) => `<div class="search-hit"><a href="${root}${r.u}">${esc(r.t)}</a> <small class="crumbs">${esc(r.s)}</small><p>${snippet(r, q)}</p></div>`).join("");
    });
  }
})();
