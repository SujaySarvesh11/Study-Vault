/**
 * End-to-end tests: start the real server on a random port and use it like a browser would.
 * Hugging Face is replaced by a fake local server, so no internet or token is needed.
 * Run with: npm test
 */
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import type { ApiError, ChatEvent, Me, Page, PageSummary, SearchHit, UploadResult } from "../src/shared/api.ts";
import { makeDocx } from "./fixtures.ts";
import { Client, FAKE_ANSWER, json, startFakeHf, useTestEnv } from "./helpers.ts";

const hf = await startFakeHf();
const dataDir = useTestEnv(hf.url);
// Import AFTER setting the environment, because config.ts reads it once at import time.
const { createApp } = await import("../src/server/app.ts");
const { hashPassword } = await import("../src/server/auth.ts");
const { run } = await import("../src/server/db.ts");

const OWNER_PW = "owner-password-1";
let server: Server;
let base = "";
const owner = () => { const c = new Client(base); return c.login("owner", OWNER_PW).then(() => c); };

before(async () => {
  run("INSERT INTO users(username, pw_hash, role) VALUES (?,?, 'owner')", "owner", await hashPassword(OWNER_PW));
  server = createApp().listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => { server.close(); hf.close(); });

describe("pages and the website", () => {
  test("serves the site with security headers", async () => {
    const r = await fetch(`${base}/`);
    assert.equal(r.status, 200);
    assert.match(await r.text(), /\/static\/build\/app\.js/);
    assert.match(r.headers.get("content-security-policy") ?? "", /script-src 'self'/);
    assert.equal(r.headers.get("x-frame-options"), "DENY");
    assert.equal(r.headers.get("x-powered-by"), null);
    assert.equal((await fetch(`${base}/static/build/app.js`)).status, 200);
    assert.equal((await fetch(`${base}/healthz`)).status, 200);
  });

  test("API needs a session", async () => {
    const r = await fetch(`${base}/api/pages`);
    assert.equal(r.status, 401);
    assert.deepEqual(await r.json(), { detail: "Not signed in" });
  });

  test("login: wrong password is refused, right password gets an HttpOnly cookie", async () => {
    const c = new Client(base);
    assert.equal((await c.login("owner", "wrong-password")).status, 401);
    const r = await c.login("OWNER", OWNER_PW); // usernames are case-insensitive
    assert.equal(r.status, 200);
    assert.match(r.headers.get("set-cookie") ?? "", /sv_session=.+HttpOnly; SameSite=Strict/);
    const me = await json<Me>(await c.get("/api/me"));
    assert.equal(me.role, "owner");
  });

  test("changes without the CSRF token are refused", async () => {
    const c = await owner();
    c.csrf = "";
    const r = await c.post("/api/pages", { title: "x" });
    assert.equal(r.status, 403);
  });

  test("create, read, update, search and delete a page", async () => {
    const c = await owner();
    const { id } = await json<{ id: number }>(await c.post("/api/pages", { title: "Loops", section: "Python", content_md: "## For loops\nA for loop iterates over a list." }));

    const page = await json<Page>(await c.get(`/api/pages/${id}`));
    assert.equal(page.title, "Loops");
    assert.equal(page.position, 1);

    assert.equal((await c.put(`/api/pages/${id}`, { ...page, shared: true, content_md: "## While loops\nA while loop repeats." })).status, 200);
    const hits = await json<SearchHit[]>(await c.get("/api/search?q=repeats"));
    assert.equal(hits[0]?.id, id);
    assert.match(hits[0]!.snip, /\[\[repeats\]\]/);

    const md = await c.get(`/api/pages/${id}/download.md`);
    assert.match(md.headers.get("content-disposition") ?? "", /Loops\.md/);
    assert.match(await md.text(), /^# Loops\n\n## While loops/);

    assert.equal((await c.del(`/api/pages/${id}`)).status, 200);
    assert.equal((await c.get(`/api/pages/${id}`)).status, 404);
  });

  test("invalid input gets a readable 422", async () => {
    const c = await owner();
    const r = await c.post("/api/pages", { title: "" });
    assert.equal(r.status, 422);
    assert.match((await json<ApiError>(r)).detail, /title/);
  });
});

describe("uploads", () => {
  test("a Word file becomes a page; its original is downloadable", async () => {
    const c = await owner();
    const r = await c.upload("cell_biology.docx", await makeDocx(["Mitochondria make energy."]), { section: "Biology" });
    assert.equal(r.status, 200);
    const { page_id } = await json<UploadResult>(r);
    const page = await json<Page>(await c.get(`/api/pages/${page_id}`));
    assert.equal(page.title, "Cell biology");
    assert.equal(page.section, "Biology");
    assert.match(page.content_md, /Mitochondria make energy\./);

    const fid = /\/files\/([0-9a-f]{32})\?download=1/.exec(page.content_md)![1];
    const f = await c.get(`/files/${fid}?download=1`);
    assert.equal(f.status, 200);
    assert.match(f.headers.get("content-disposition") ?? "", /^attachment; filename="cell_biology\.docx"/);
    assert.match(f.headers.get("content-security-policy") ?? "", /sandbox/);
  });

  test("videos stream with HTTP range requests", async () => {
    const c = await owner();
    const { page_id } = await json<UploadResult>(await c.upload("lecture.mp4", "0123456789"));
    const page = await json<Page>(await c.get(`/api/pages/${page_id}`));
    const fid = /\/files\/([0-9a-f]{32})\?kind=video/.exec(page.content_md)![1];
    const r = await c.request("GET", `/files/${fid}`, undefined, { Range: "bytes=2-5" });
    assert.equal(r.status, 206);
    assert.equal(await r.text(), "2345");
    assert.equal(r.headers.get("content-type"), "video/mp4");
  });

  test("insert a file into an existing page returns a Markdown snippet", async () => {
    const c = await owner();
    const { id } = await json<{ id: number }>(await c.post("/api/pages", { title: "Diagrams" }));
    const r = await json<UploadResult>(await c.upload("cell.png", "png-bytes", { page_id: String(id) }));
    assert.equal(r.page_id, id);
    assert.match(r.markdown ?? "", /^!\[cell\.png\]\(\/files\/[0-9a-f]{32}\)/);
  });

  test("blocked file types are refused and not kept on disk", async () => {
    const c = await owner();
    const before = readdirSync(path.join(dataDir, "files")).length;
    const r = await c.upload("virus.exe", "MZ");
    assert.equal(r.status, 400);
    assert.match((await json<ApiError>(r)).detail, /\.exe is not allowed/);
    assert.equal(readdirSync(path.join(dataDir, "files")).length, before);
  });

  test("a broken document is refused and its file removed", async () => {
    const c = await owner();
    const before = readdirSync(path.join(dataDir, "files")).length;
    const r = await c.upload("broken.docx", "not really a zip");
    assert.equal(r.status, 422);
    assert.equal(readdirSync(path.join(dataDir, "files")).length, before);
  });
});

describe("viewers only see shared pages", () => {
  let viewer: Client;
  let privateId = 0, sharedId = 0;

  before(async () => {
    const c = await owner();
    assert.equal((await c.post("/api/users", { username: "friend", password: "viewer-password-1" })).status, 200);
    privateId = (await json<{ id: number }>(await c.post("/api/pages", { title: "Diary", content_md: "secret zebra plans" }))).id;
    sharedId = (await json<{ id: number }>(await c.post("/api/pages", { title: "Algebra", content_md: "zebra equations are shared", shared: true }))).id;
    viewer = new Client(base);
    await viewer.login("friend", "viewer-password-1");
  });

  test("page list, page, search", async () => {
    const pages = await json<PageSummary[]>(await viewer.get("/api/pages"));
    assert.ok(pages.some((p) => p.id === sharedId));
    assert.ok(!pages.some((p) => p.id === privateId));
    assert.equal((await viewer.get(`/api/pages/${privateId}`)).status, 404);
    const hits = await json<SearchHit[]>(await viewer.get("/api/search?q=zebra"));
    assert.deepEqual(hits.map((h) => h.id), [sharedId]);
  });

  test("owner-only actions are refused", async () => {
    assert.equal((await viewer.post("/api/pages", { title: "Hack" })).status, 403);
    assert.equal((await viewer.get("/api/users")).status, 403);
    assert.equal((await viewer.upload("a.txt", "x")).status, 403);
  });

  test("the assistant never uses private pages for a viewer", async () => {
    const events = await chat(viewer, "zebra");
    const sources = events.find((e) => "sources" in e);
    assert.ok(sources && "sources" in sources);
    assert.ok(sources.sources.every((s) => s.page_id === sharedId));
  });
});

/** Send a question and collect every streamed event. */
async function chat(c: Client, question: string): Promise<ChatEvent[]> {
  const r = await c.post("/api/chat", { question, history: [] });
  assert.equal(r.headers.get("content-type"), "application/x-ndjson; charset=utf-8");
  return (await r.text()).trim().split("\n").map((l) => JSON.parse(l) as ChatEvent);
}

describe("AI assistant (fake Hugging Face)", () => {
  test("answers from notes, streaming tokens and citing sources", async () => {
    const c = await owner();
    await c.post("/api/pages", { title: "Python loops", content_md: "## For loop\nA for loop repeats code for each item in a list." });
    const events = await chat(c, "How does a for loop work?");
    const sources = events[0]!;
    assert.ok("sources" in sources && sources.sources[0]?.title === "Python loops");
    const text = events.filter((e) => "t" in e).map((e) => ("t" in e ? e.t : "")).join("");
    assert.equal(text, FAKE_ANSWER.join(""));
    assert.deepEqual(events.at(-1), { done: true });
    assert.ok(hf.requests.includes("POST /v1/chat/completions"));
    assert.ok(hf.requests.some((r) => r.includes("/pipeline/feature-extraction")), "embeddings were requested");
  });

  test("says it doesn't know when nothing matches, without calling the model", async () => {
    const c = await owner();
    const calls = hf.requests.filter((r) => r.includes("chat")).length;
    const events = await chat(c, "quantum chromodynamics");
    assert.match(JSON.stringify(events), /couldn't find anything/);
    assert.equal(hf.requests.filter((r) => r.includes("chat")).length, calls);
  });
});

describe("login throttling", () => {
  test("5 wrong passwords lock that username for 15 minutes", async () => {
    const c = new Client(base);
    for (let i = 0; i < 5; i++) assert.equal((await c.login("friend", "nope-nope-nope")).status, 401);
    assert.equal((await c.login("friend", "viewer-password-1")).status, 429);
  });
});
