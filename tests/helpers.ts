/**
 * Test helpers: a fake Hugging Face server, a throw-away data folder, and a tiny HTTP client
 * that keeps the session cookie and CSRF token like a browser would.
 */
import { mkdtempSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

export const FAKE_ANSWER = ["A for loop ", "repeats code ", "for each item [1]."];

/** Turn text into a small "bag of words" vector, so similar texts get similar embeddings. */
function fakeEmbedding(text: string): number[] {
  const v = new Array<number>(32).fill(0);
  for (const w of text.toLowerCase().match(/[a-z]+/g) ?? []) {
    let h = 0;
    for (const c of w) h = (h * 31 + c.charCodeAt(0)) % 32;
    v[h]! += 1;
  }
  return v;
}

/** Pretends to be router.huggingface.co: chat completions (streamed) and embeddings. */
export async function startFakeHf(): Promise<{ url: string; requests: string[]; close: () => void }> {
  const requests: string[] = [];
  const server: Server = createServer((req, res) => {
    let body = "";
    req.on("data", (c: Buffer) => (body += c));
    req.on("end", () => {
      requests.push(`${req.method} ${req.url}`);
      if (req.headers.authorization !== "Bearer test-token") {
        res.writeHead(401).end();
      } else if (req.url?.endsWith("/pipeline/feature-extraction")) {
        const { inputs } = JSON.parse(body) as { inputs: string[] };
        res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(inputs.map(fakeEmbedding)));
      } else if (req.url === "/v1/chat/completions") {
        res.writeHead(200, { "Content-Type": "text/event-stream" });
        for (const t of FAKE_ANSWER) res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`);
        res.end("data: [DONE]\n\n");
      } else {
        res.writeHead(404).end();
      }
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}`, requests, close: () => server.close() };
}

/** Point the app at a fresh, empty data folder and the fake Hugging Face server. Call BEFORE importing the app. */
export function useTestEnv(hfUrl: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), "studyvault-test-"));
  Object.assign(process.env, {
    DATA_DIR: dir, HF_BASE_URL: hfUrl, HF_TOKEN: "test-token", COOKIE_SECURE: "false",
  });
  return dir;
}

/** Read a JSON response body and say what type it is: await json<Page>(r). */
export const json = <T>(r: Response): Promise<T> => r.json() as Promise<T>;

/** A logged-in "browser". */
export class Client {
  base: string;
  cookie = "";
  csrf = "";

  constructor(base: string) {
    this.base = base;
  }

  async request(method: string, url: string, body?: unknown, headers: Record<string, string> = {}): Promise<Response> {
    const h: Record<string, string> = { ...headers };
    if (this.cookie) h.Cookie = this.cookie;
    if (this.csrf) h["X-CSRF-Token"] = this.csrf;
    let payload: RequestInit["body"];
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) { h["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
    return fetch(this.base + url, { method, headers: h, body: payload });
  }

  get = (url: string) => this.request("GET", url);
  post = (url: string, body?: unknown) => this.request("POST", url, body);
  put = (url: string, body?: unknown) => this.request("PUT", url, body);
  del = (url: string) => this.request("DELETE", url);

  async login(username: string, password: string): Promise<Response> {
    const r = await this.post("/api/login", { username, password });
    if (r.ok) {
      this.cookie = (r.headers.get("set-cookie") ?? "").split(";")[0]!;
      this.csrf = ((await r.clone().json()) as { csrf: string }).csrf;
    }
    return r;
  }

  async upload(name: string, content: string | Buffer, fields: Record<string, string> = {}): Promise<Response> {
    const fd = new FormData();
    fd.append("file", new Blob([typeof content === "string" ? content : new Uint8Array(content)]), name);
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    return this.post("/api/upload", fd);
  }
}
