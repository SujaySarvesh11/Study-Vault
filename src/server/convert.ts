/**
 * Turn an uploaded file into Markdown.
 *
 * Word → mammoth, Excel/CSV → SheetJS, PDF → unpdf (Mozilla's pdf.js), PowerPoint/EPUB → unzip + read the XML,
 * HTML → turndown. Images and videos are embedded; video/audio can optionally be transcribed
 * by a Hugging Face speech-to-text model.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import mammoth from "mammoth";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { extractText, getDocumentProxy } from "unpdf";
import * as XLSX from "xlsx";
import { AUDIO_EXT, DOC_EXT, HF_BASE_URL, HF_TOKEN, IMAGE_EXT, TRANSCRIBE_MEDIA, VIDEO_EXT, WHISPER_MODEL } from "./config.ts";

export type { FileKind } from "../shared/files.ts";
import type { FileKind } from "../shared/files.ts";

export function kindOf(ext: string): FileKind {
  if (IMAGE_EXT.has(ext)) return "image";
  if (VIDEO_EXT.has(ext)) return "video";
  if (AUDIO_EXT.has(ext)) return "audio";
  return "doc";
}

// ---------------------------------------------------------------- HTML → Markdown
const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-" });
turndown.use(gfm);                                 // tables, strikethrough
turndown.remove(["script", "style", "img", "head"]); // embedded images would bloat the page

function htmlToMd(html: string): string {
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] ?? html;
  return turndown.turndown(body);
}

// ---------------------------------------------------------------- tables
const cell = (v: unknown) => String(v ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();

function mdTable(rows: unknown[][]): string {
  rows = rows.filter((r) => r.some((v) => cell(v) !== ""));
  if (!rows.length) return "_(empty)_";
  const width = Math.max(...rows.map((r) => r.length));
  const line = (r: unknown[]) => `| ${Array.from({ length: width }, (_, i) => cell(r[i])).join(" | ")} |`;
  const [head, ...rest] = rows;
  return [line(head!), `|${" --- |".repeat(width)}`, ...rest.map(line)].join("\n");
}

function spreadsheetToMd(wb: XLSX.WorkBook): string {
  const parts = wb.SheetNames.map((name) => {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name]!, { header: 1, defval: "", raw: false });
    return wb.SheetNames.length > 1 ? `## ${name}\n\n${mdTable(rows)}` : mdTable(rows);
  });
  return parts.join("\n\n");
}

// ---------------------------------------------------------------- XML helpers (PowerPoint, EPUB)
const decodeXml = (s: string) => s
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&amp;/g, "&");

/** Text of each <a:p> paragraph in a DrawingML part (slides and notes). */
function paragraphs(xml: string): string[] {
  return [...xml.matchAll(/<a:p>([\s\S]*?)<\/a:p>/g)]
    .map((p) => [...p[1]!.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((t) => decodeXml(t[1]!)).join("").trim())
    .filter(Boolean);
}

const slideNo = (name: string) => Number(/(\d+)\.xml$/.exec(name)?.[1] ?? 0);

async function pptxToMd(buf: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buf);
  const slides = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => slideNo(a) - slideNo(b));
  const out: string[] = [];
  for (const [i, file] of slides.entries()) {
    const [title, ...body] = paragraphs(await zip.file(file)!.async("string"));
    out.push(`## Slide ${i + 1}${title ? `: ${title}` : ""}`);
    if (body.length) out.push(body.map((p) => `- ${p}`).join("\n"));
    // Speaker notes live in a separate part, linked from the slide's .rels file.
    const rels = await zip.file(file.replace("slides/", "slides/_rels/") + ".rels")?.async("string");
    const notesTarget = rels && /Target="\.\.\/notesSlides\/([^"]+)"/.exec(rels)?.[1];
    if (notesTarget) {
      const notes = paragraphs(await zip.file(`ppt/notesSlides/${notesTarget}`)!.async("string"))
        .filter((p) => !/^\d+$/.test(p)); // drop the slide-number placeholder
      if (notes.length) out.push(`### Notes\n\n${notes.join("\n\n")}`);
    }
  }
  return out.join("\n\n");
}

async function epubToMd(buf: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buf);
  const container = await zip.file("META-INF/container.xml")?.async("string");
  const opfPath = container && /full-path="([^"]+)"/.exec(container)?.[1];
  if (!opfPath) throw new Error("Not a valid EPUB");
  const opf = await zip.file(opfPath)!.async("string");
  const dir = path.posix.dirname(opfPath);

  const manifest = new Map<string, string>();
  for (const m of opf.matchAll(/<item\b[^>]*>/g)) {
    const id = /\bid="([^"]+)"/.exec(m[0])?.[1], href = /\bhref="([^"]+)"/.exec(m[0])?.[1];
    if (id && href) manifest.set(id, href);
  }
  const out: string[] = [];
  for (const ref of opf.matchAll(/<itemref\b[^>]*idref="([^"]+)"/g)) {
    const href = manifest.get(ref[1]!);
    const file = href && zip.file(path.posix.join(dir, decodeURIComponent(href)));
    if (file) out.push(htmlToMd(await file.async("string")));
  }
  return out.filter((s) => s.trim()).join("\n\n---\n\n");
}

async function pdfToMd(buf: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: false });
  // A heading per page lets the assistant cite "Notes.pdf › Page 3".
  return text.map((t, i) => (t.trim() ? `## Page ${i + 1}\n\n${t.trim()}` : "")).filter(Boolean).join("\n\n");
}

async function docToMd(file: string, ext: string): Promise<string> {
  const buf = await readFile(file);
  switch (ext) {
    case ".docx": return htmlToMd((await mammoth.convertToHtml({ buffer: buf })).value);
    case ".xlsx": case ".xls": return spreadsheetToMd(XLSX.read(buf, { type: "buffer" }));
    case ".csv": return spreadsheetToMd(XLSX.read(buf.toString("utf8"), { type: "string" }));
    case ".pptx": return pptxToMd(buf);
    case ".pdf": return pdfToMd(buf);
    case ".epub": return epubToMd(buf);
    case ".html": case ".htm": return htmlToMd(buf.toString("utf8"));
    case ".json": {
      let text = buf.toString("utf8");
      try { text = JSON.stringify(JSON.parse(text), null, 2); } catch { /* keep as-is */ }
      return "```json\n" + text + "\n```";
    }
    case ".xml": return "```xml\n" + buf.toString("utf8") + "\n```";
    default: return buf.toString("utf8"); // .txt, .md
  }
}

// ---------------------------------------------------------------- transcripts
async function transcribe(file: string, mime: string): Promise<string> {
  if (!TRANSCRIBE_MEDIA || !HF_TOKEN) return "";
  try {
    const r = await fetch(`${HF_BASE_URL}/hf-inference/models/${WHISPER_MODEL}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${HF_TOKEN}`, "Content-Type": mime },
      body: await readFile(file),
      signal: AbortSignal.timeout(600_000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = (await r.json()) as { text?: string };
    return (data.text ?? "").trim();
  } catch (e) { // never fail an upload because transcription failed
    console.warn(`transcription failed: ${(e as Error).message}`);
    return "";
  }
}

// ---------------------------------------------------------------- entry point
export async function toMarkdown(file: string, fileId: string, origName: string, mime: string): Promise<string> {
  const ext = path.extname(file).toLowerCase();
  const url = `/files/${fileId}`;
  const kind = kindOf(ext);
  const safeName = origName.replace(/[[\]]/g, "");

  if (kind === "image") return `![${safeName}](${url})\n`;

  if (kind === "video" || kind === "audio") {
    let body = `![${kind}: ${safeName}](${url}?kind=${kind})\n`;
    const text = await transcribe(file, mime);
    body += text
      ? `\n## Transcript\n\n${text}\n`
      : "\n_Add your notes about this recording here. (Enable TRANSCRIBE_MEDIA for an automatic transcript.)_\n";
    return body;
  }

  if (!DOC_EXT.has(ext)) throw new Error("Unsupported file type");
  const text = (await docToMd(file, ext)).trim()
    || "_No text could be extracted (it may be a scanned PDF). The original file is attached below._";
  return `${text}\n\n---\n📎 Original file: [${safeName}](${url}?download=1)\n`;
}
