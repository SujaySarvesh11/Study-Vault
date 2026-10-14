/** Chunking, indexing and hybrid retrieval (keyword BM25 + optional Hugging Face embeddings). */
import { EMBED_MODEL, HF_BASE_URL, HF_TOKEN } from "./config.ts";
import { all, run, transaction } from "./db.ts";

const CHUNK_CHARS = 1200;
const OVERLAP = 200;
const EMBED_BATCH = 32;

export interface Chunk {
  heading: string;
  text: string;
}

export interface Hit {
  id: number;
  page_id: number;
  title: string;
  heading: string;
  text: string;
  score: number;
}

/** Split on headings, then window long sections. */
export function chunkMarkdown(md: string): Chunk[] {
  md = md.replace(/!\[[^\]]*\]\([^)]*\)/g, ""); // drop media embeds
  const out: Chunk[] = [];
  let heading = "";
  let buf: string[] = [];

  const flush = () => {
    const text = buf.join("\n").trim();
    for (let i = 0; i < text.length; i += CHUNK_CHARS - OVERLAP) {
      out.push({ heading, text: text.slice(i, i + CHUNK_CHARS) });
      if (i + CHUNK_CHARS >= text.length) break;
    }
  };

  for (const line of md.split(/\r?\n/)) {
    const m = /^(#{1,6})\s+(.*)/.exec(line);
    if (m) {
      flush();
      heading = m[2]!.trim();
      buf = [];
    } else {
      buf.push(line);
    }
  }
  flush();
  return out;
}

/** Scale a vector to length 1, so a dot product equals cosine similarity. */
function normalise(v: Float32Array): Float32Array {
  let sum = 0;
  for (const x of v) sum += x * x;
  const len = Math.sqrt(sum) + 1e-9;
  return v.map((x) => x / len);
}

/** One vector per text, or null if Hugging Face / the embed model isn't available. */
export async function embed(texts: string[]): Promise<Float32Array[] | null> {
  if (!texts.length || !HF_TOKEN) return null;
  const url = `${HF_BASE_URL}/hf-inference/models/${EMBED_MODEL}/pipeline/feature-extraction`;
  try {
    const out: Float32Array[] = [];
    for (let i = 0; i < texts.length; i += EMBED_BATCH) {
      const r = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${HF_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: texts.slice(i, i + EMBED_BATCH) }),
        signal: AbortSignal.timeout(120_000),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // Either one vector per text (number[][]) or, for non-pooling models, one per token (number[][][]).
      const data = (await r.json()) as number[][] | number[][][];
      for (const item of data) out.push(normalise(Float32Array.from(meanPool(item))));
    }
    return out;
  } catch (e) {
    console.warn(`embeddings unavailable (${(e as Error).message}); keyword search only`);
    return null;
  }
}

function meanPool(item: number[] | number[][]): number[] {
  if (typeof item[0] === "number") return item as number[];
  const rows = item as number[][];
  const sum = new Array<number>(rows[0]?.length ?? 0).fill(0);
  for (const row of rows) row.forEach((x, j) => (sum[j]! += x));
  return sum.map((x) => x / rows.length);
}

export async function indexPage(pageId: number, title: string, md: string): Promise<void> {
  const chunks = chunkMarkdown(`# ${title}\n${md}`);
  const vecs = await embed(chunks.map((c) => `${c.heading}\n${c.text}`));
  transaction(() => {
    run("DELETE FROM chunks WHERE page_id=?", pageId);
    chunks.forEach((c, i) => {
      const v = vecs?.[i];
      run("INSERT INTO chunks(page_id, heading, text, embedding) VALUES (?,?,?,?)",
        pageId, c.heading || title, c.text, v ? new Uint8Array(v.buffer) : null);
    });
  });
}

const STOP = new Set(["the", "a", "an", "is", "are", "what", "how", "why", "do", "does", "of", "to", "in",
  "and", "or", "for", "on", "with", "me", "my", "i", "it", "explain", "tell", "about", "can", "you"]);

/** Turn free text into a safe SQLite full-text query: "word1" OR "word2" ... */
export function ftsQuery(q: string): string {
  const words = (q.toLowerCase().match(/[\p{L}\p{N}_]+/gu) ?? [])
    .filter((w) => !STOP.has(w) && w.length > 1);
  return words.slice(0, 20).map((w) => `"${w}"`).join(" OR ");
}

type ChunkRow = Omit<Hit, "score">;

/** Hybrid search: keyword and meaning-based results merged by rank (reciprocal rank fusion). */
export async function retrieve(question: string, canSeePrivate: boolean, k = 6): Promise<Hit[]> {
  const vis = canSeePrivate ? "" : "AND p.shared = 1";
  const results = new Map<number, Hit>();

  const fq = ftsQuery(question);
  if (fq) {
    const rows = all<ChunkRow>(
      `SELECT ch.id, ch.page_id, ch.heading, ch.text, p.title
       FROM chunks_fts JOIN chunks ch ON ch.id = chunks_fts.rowid
       JOIN pages p ON p.id = ch.page_id
       WHERE chunks_fts MATCH ? ${vis} ORDER BY bm25(chunks_fts) LIMIT 20`, fq);
    rows.forEach((r, rank) => results.set(r.id, { ...r, score: 1 / (60 + rank) }));
  }

  const qv = (await embed([question]))?.[0];
  if (qv) {
    const rows = all<ChunkRow & { embedding: Uint8Array }>(
      `SELECT ch.id, ch.page_id, ch.heading, ch.text, ch.embedding, p.title
       FROM chunks ch JOIN pages p ON p.id = ch.page_id
       WHERE ch.embedding IS NOT NULL ${vis}`)
      .filter((r) => r.embedding.byteLength === qv.length * 4); // skip vectors from another model

    const scored = rows.map((r) => {
      const v = new Float32Array(r.embedding.slice().buffer); // copy: Float32Array needs aligned memory
      let sim = 0;
      for (let j = 0; j < v.length; j++) sim += v[j]! * qv[j]!;
      return { r, sim };
    }).sort((a, b) => b.sim - a.sim).slice(0, 20);

    for (const [rank, { r, sim }] of scored.entries()) {
      if (sim < 0.45) break; // too dissimilar to count as evidence
      const { embedding: _, ...row } = r;
      const hit = results.get(r.id) ?? { ...row, score: 0 };
      hit.score += 1 / (60 + rank);
      results.set(r.id, hit);
    }
  }
  return [...results.values()].sort((a, b) => b.score - a.score).slice(0, k);
}
