/** The web server: routes, security headers, uploads and file access rules. */
import { randomUUID } from "node:crypto";
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { z } from "zod";
import type { Me, Page, PageSummary, SearchHit, UploadResult, UserRow } from "../shared/api.ts";
import { answerStream } from "./ai.ts";
import {
  clearFailures, COOKIE, createSession, currentUser, destroySession, hashPassword, HttpError,
  ownerOnly, readCookie, recordFailure, tooManyAttempts, userOf, verifyLogin, type SessionUser,
} from "./auth.ts";
import { ALLOWED_EXT, COOKIE_SECURE, FILES_DIR, MAX_UPLOAD_MB, SESSION_HOURS, SITE_NAME, STATIC_DIR } from "./config.ts";
import { kindOf, toMarkdown } from "./convert.ts";
import { all, one, run, transaction } from "./db.ts";
import { ftsQuery, indexPage } from "./search.ts";

const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; " +
  "media-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; " +
  "base-uri 'none'; form-action 'self'; frame-ancestors 'none'";

const MIME: Record<string, string> = {
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".pdf": "application/pdf", ".csv": "text/csv", ".txt": "text/plain", ".md": "text/markdown",
  ".html": "text/html", ".htm": "text/html", ".json": "application/json", ".xml": "application/xml",
  ".epub": "application/epub+zip",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp",
  ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime", ".m4v": "video/x-m4v",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4", ".ogg": "audio/ogg",
};

// ---------------------------------------------------------------- request validation (zod)
const LoginIn = z.object({ username: z.string().max(64), password: z.string().max(256) });
const PasswordIn = z.object({ current: z.string().max(256), new: z.string().min(10).max(256) });
const UserIn = z.object({
  username: z.string().min(3).max(32).regex(/^[A-Za-z0-9_.-]+$/, "Use only letters, numbers, _ . -"),
  password: z.string().min(10).max(256),
});
const PageIn = z.object({
  title: z.string().trim().min(1).max(200),
  section: z.string().trim().min(1).max(100).default("General"),
  content_md: z.string().max(5_000_000).default(""),
  shared: z.boolean().default(false),
  position: z.number().int().nullish(),
});
const ChatIn = z.object({
  question: z.string().min(1).max(2000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).max(20).default([]),
});
const Id = z.coerce.number().int().positive();

/** Check untrusted input against a schema. The return value has the schema's TypeScript type. */
function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data);
  if (!r.success) {
    throw new HttpError(422, r.error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; "));
  }
  return r.data;
}

// ---------------------------------------------------------------- helpers
const visible = (user: SessionUser) => (user.role === "owner" ? "" : "WHERE shared = 1");

function getPage(pid: number, user: SessionUser): Page {
  const row = one<Page>("SELECT * FROM pages WHERE id=?", pid);
  if (!row || (user.role !== "owner" && !row.shared)) throw new HttpError(404, "Page not found");
  return row;
}

const nextPosition = (section: string) =>
  one<{ n: number }>("SELECT COALESCE(MAX(position), 0) + 1 AS n FROM pages WHERE section=?", section)!.n;

/** Content-Disposition that works for any file name, including non-English ones. */
function disposition(type: "inline" | "attachment", filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]|["\\]/g, "_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

// ---------------------------------------------------------------- uploads (multer)
const upload = multer({
  storage: multer.diskStorage({
    destination: FILES_DIR,
    // Stored under a random name; the original name is only kept in the database.
    filename: (_req, file, cb) => cb(null, randomUUID().replace(/-/g, "") + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: 1, fields: 10 },
  defParamCharset: "utf8",
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXT.has(ext)) cb(null, true);
    else cb(new HttpError(400, `File type ${ext || "(none)"} is not allowed`));
  },
} as multer.Options);

export function createApp(): express.Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("query parser", "simple");

  app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", CSP); // the file route replaces this with a stricter one
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    if (COOKIE_SECURE) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    if (req.path.startsWith("/api/") || req.path.startsWith("/files/")) res.setHeader("Cache-Control", "private, no-store");
    next();
  });
  app.use(express.json({ limit: "6mb" }));

  // ---------------------------------------------------------------- auth
  app.post("/api/login", async (req, res) => {
    const body = parse(LoginIn, req.body);
    const ip = req.get("cf-connecting-ip") || req.socket.remoteAddress || "?";
    const key = `${body.username.toLowerCase()}|${ip}`;
    const ipKey = `*|${ip}`;
    if (tooManyAttempts(key) || tooManyAttempts(ipKey, 20)) throw new HttpError(429, "Too many attempts. Wait 15 minutes.");
    const user = await verifyLogin(body.username, body.password);
    if (!user) {
      recordFailure(key);
      recordFailure(ipKey);
      throw new HttpError(401, "Wrong username or password");
    }
    clearFailures(key);
    const { token, csrf } = createSession(user.id);
    res.cookie(COOKIE, token, {
      maxAge: SESSION_HOURS * 3600 * 1000, httpOnly: true, secure: COOKIE_SECURE, sameSite: "strict", path: "/",
    });
    res.json({ username: user.username, role: user.role, csrf });
  });

  app.post("/api/logout", currentUser, (req, res) => {
    destroySession(readCookie(req, COOKIE) ?? "");
    res.clearCookie(COOKIE, { path: "/" });
    res.json({ ok: true });
  });

  app.get("/api/me", currentUser, (req, res) => {
    const u = userOf(req);
    const me: Me = { username: u.username, role: u.role, csrf: u.csrf, site: SITE_NAME };
    res.json(me);
  });

  app.post("/api/password", currentUser, async (req, res) => {
    const body = parse(PasswordIn, req.body);
    const u = userOf(req);
    if (!(await verifyLogin(u.username, body.current))) throw new HttpError(400, "Current password is wrong");
    const pwHash = await hashPassword(body.new);
    transaction(() => {
      run("UPDATE users SET pw_hash=? WHERE id=?", pwHash, u.id);
      run("DELETE FROM sessions WHERE user_id=?", u.id); // sign out everywhere
    });
    res.json({ ok: true });
  });

  // ---------------------------------------------------------------- users (owner)
  app.get("/api/users", ownerOnly, (_req, res) => {
    res.json(all<UserRow>("SELECT id, username, role, created_at FROM users ORDER BY id"));
  });

  app.post("/api/users", ownerOnly, async (req, res) => {
    const body = parse(UserIn, req.body);
    const pwHash = await hashPassword(body.password);
    try {
      run("INSERT INTO users(username, pw_hash, role) VALUES (?,?, 'viewer')", body.username, pwHash);
    } catch {
      throw new HttpError(400, "That username already exists");
    }
    res.json({ ok: true });
  });

  app.delete("/api/users/:uid", ownerOnly, (req, res) => {
    run("DELETE FROM users WHERE id=? AND role='viewer'", parse(Id, req.params.uid));
    res.json({ ok: true });
  });

  // ---------------------------------------------------------------- pages
  app.get("/api/pages", currentUser, (req, res) => {
    res.json(all<PageSummary>(`SELECT id, title, section, position, shared, updated_at FROM pages
                               ${visible(userOf(req))} ORDER BY section COLLATE NOCASE, position, id`));
  });

  app.get("/api/pages/:pid", currentUser, (req, res) => {
    res.json(getPage(parse(Id, req.params.pid), userOf(req)));
  });

  app.get("/api/pages/:pid/download.md", currentUser, (req, res) => {
    const p = getPage(parse(Id, req.params.pid), userOf(req));
    const name = p.title.replace(/[^A-Za-z0-9_.-]+/g, "_").slice(0, 80) || "page";
    res.setHeader("Content-Disposition", `attachment; filename="${name}.md"`);
    res.type("text/markdown; charset=utf-8").send(`# ${p.title}\n\n${p.content_md}`);
  });

  app.post("/api/pages", ownerOnly, async (req, res) => {
    const body = parse(PageIn, req.body);
    const { lastId } = run("INSERT INTO pages(title, section, position, content_md, shared) VALUES (?,?,?,?,?)",
      body.title, body.section, body.position ?? nextPosition(body.section), body.content_md, body.shared ? 1 : 0);
    await indexPage(lastId, body.title, body.content_md);
    res.json({ id: lastId });
  });

  app.put("/api/pages/:pid", ownerOnly, async (req, res) => {
    const pid = parse(Id, req.params.pid);
    const body = parse(PageIn, req.body);
    const old = getPage(pid, userOf(req));
    let pos = body.position ?? old.position;
    if (body.section !== old.section && body.position == null) pos = nextPosition(body.section);
    run(`UPDATE pages SET title=?, section=?, position=?, content_md=?, shared=?,
         updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      body.title, body.section, pos, body.content_md, body.shared ? 1 : 0, pid);
    await indexPage(pid, body.title, body.content_md);
    res.json({ id: pid });
  });

  app.delete("/api/pages/:pid", ownerOnly, (req, res) => {
    const pid = parse(Id, req.params.pid);
    const files = transaction(() => {
      const rows = all<{ stored_name: string }>("SELECT stored_name FROM files WHERE page_id=?", pid);
      run("DELETE FROM files WHERE page_id=?", pid);
      run("DELETE FROM pages WHERE id=?", pid);
      return rows;
    });
    for (const f of files) {
      try { unlinkSync(path.join(FILES_DIR, f.stored_name)); } catch { /* already gone */ }
    }
    res.json({ ok: true });
  });

  // ---------------------------------------------------------------- uploads
  /** Without page_id: convert the file into a NEW page.
   *  With page_id: attach the file to that page and return a Markdown snippet to insert. */
  app.post("/api/upload", ownerOnly, upload.single("file"), async (req, res) => {
    const file = req.file;
    if (!file) throw new HttpError(400, "No file was sent");
    const stored = file.path;
    try {
      const fields = req.body as Record<string, string | undefined>;
      const section = (fields.section ?? "").trim().slice(0, 100) || "Uploads";
      const shared = fields.shared === "true";
      const pageId = fields.page_id ? parse(Id, fields.page_id) : null;
      if (pageId !== null) getPage(pageId, userOf(req));

      const orig = path.basename(file.originalname || "file").slice(0, 200);
      const ext = path.extname(orig).toLowerCase();
      const fid = path.parse(file.filename).name;
      const mime = MIME[ext] ?? "application/octet-stream";

      let md: string;
      try {
        md = await toMarkdown(stored, fid, orig, mime);
      } catch (e) {
        console.error("conversion failed:", e);
        throw new HttpError(422, `Could not convert this file: ${(e as Error).name}`);
      }

      let target: number;
      let title = "";
      if (pageId === null) {
        title = (fields.title?.trim() || path.parse(orig).name.replace(/[_-]/g, " ").trim()).slice(0, 200) || "Untitled";
        title = title[0]!.toUpperCase() + title.slice(1);
        target = run("INSERT INTO pages(title, section, position, content_md, shared) VALUES (?,?,?,?,?)",
          title, section, nextPosition(section), md, shared ? 1 : 0).lastId;
      } else {
        target = pageId;
      }
      run("INSERT INTO files(id, page_id, orig_name, stored_name, mime, size) VALUES (?,?,?,?,?,?)",
        fid, target, orig, file.filename, mime, file.size);

      if (pageId === null) {
        await indexPage(target, title, md);
        res.json({ page_id: target } satisfies UploadResult);
      } else {
        res.json({ page_id: target, markdown: md } satisfies UploadResult);
      }
    } catch (e) {
      try { unlinkSync(stored); } catch { /* already gone */ }
      throw e;
    }
  });

  app.get("/files/:fid", currentUser, (req, res) => {
    const fid = req.params.fid as string;
    if (!/^[0-9a-f]{32}$/.test(fid)) throw new HttpError(404, "Not found");
    const row = one<{ stored_name: string; orig_name: string; mime: string; shared: number | null }>(
      "SELECT f.stored_name, f.orig_name, f.mime, p.shared FROM files f LEFT JOIN pages p ON p.id = f.page_id WHERE f.id=?", fid);
    if (!row || (userOf(req).role !== "owner" && !row.shared)) throw new HttpError(404, "Not found");
    const file = path.join(FILES_DIR, row.stored_name);
    if (!existsSync(file)) throw new HttpError(404, "Not found");

    const kind = kindOf(path.extname(file).toLowerCase());
    const inline = (kind !== "doc" || row.mime === "application/pdf") && req.query.download !== "1";
    // Uploaded files get a locked-down CSP so nothing in them can run scripts.
    // (Browsers refuse to show PDFs under 'sandbox', so PDFs get the strict policy without it.)
    let csp = "default-src 'none'; style-src 'unsafe-inline'";
    if (row.mime !== "application/pdf") csp += "; sandbox";
    res.setHeader("Content-Security-Policy", csp);
    res.setHeader("Content-Type", row.mime);
    res.setHeader("Content-Disposition", disposition(inline ? "inline" : "attachment", row.orig_name));
    // sendFile supports HTTP Range requests, so videos can be scrubbed.
    res.sendFile(file);
  });

  // ---------------------------------------------------------------- search + AI
  app.get("/api/search", currentUser, (req, res) => {
    const fq = ftsQuery(String(req.query.q ?? "").slice(0, 300));
    if (!fq) return void res.json([]);
    const vis = userOf(req).role === "owner" ? "" : "AND p.shared = 1";
    const rows = all<SearchHit>(
      `SELECT p.id, p.title, p.section, snippet(chunks_fts, 0, '[[', ']]', '…', 14) AS snip
       FROM chunks_fts JOIN chunks ch ON ch.id = chunks_fts.rowid JOIN pages p ON p.id = ch.page_id
       WHERE chunks_fts MATCH ? ${vis} ORDER BY bm25(chunks_fts) LIMIT 40`, fq);
    const seen = new Set<number>();
    res.json(rows.filter((r) => !seen.has(r.id) && seen.add(r.id)).slice(0, 15));
  });

  app.post("/api/chat", currentUser, async (req, res) => {
    const body = parse(ChatIn, req.body);
    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    for await (const event of answerStream(body.question, body.history, userOf(req).role === "owner")) {
      res.write(JSON.stringify(event) + "\n");
    }
    res.end();
  });

  app.post("/api/reindex", ownerOnly, async (_req, res) => {
    const pages = all<{ id: number; title: string; content_md: string }>("SELECT id, title, content_md FROM pages");
    for (const p of pages) await indexPage(p.id, p.title, p.content_md);
    res.json({ pages: pages.length });
  });

  app.get("/healthz", (_req, res) => void res.json({ ok: true }));

  // ---------------------------------------------------------------- frontend
  app.get("/", (_req, res) => res.sendFile(path.join(STATIC_DIR, "index.html")));
  app.get("/login", (_req, res) => res.sendFile(path.join(STATIC_DIR, "login.html")));
  app.use("/static", express.static(STATIC_DIR, { index: false }));

  app.use((_req, _res, next) => next(new HttpError(404, "Not found")));

  // Every error ends up here and becomes { detail: "..." }, which the browser shows.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    let status = 500, detail = "Something went wrong on the server";
    if (err instanceof HttpError) {
      status = err.status; detail = err.message;
    } else if (err instanceof multer.MulterError) {
      status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      detail = err.code === "LIMIT_FILE_SIZE" ? `File is larger than ${MAX_UPLOAD_MB} MB` : err.message;
    } else if (err instanceof SyntaxError || (err as { type?: string }).type === "entity.too.large") {
      status = 400; detail = "Request body is not valid";
    } else {
      console.error(err);
    }
    if (res.headersSent) return void res.end();
    res.status(status).json({ detail });
  });

  return app;
}
