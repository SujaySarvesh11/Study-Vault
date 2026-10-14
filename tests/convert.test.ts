/** File → Markdown conversion and text chunking. Run with: npm test */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { makeDocx, makePdf, makePptx, makeXlsx } from "./fixtures.ts";
import { useTestEnv } from "./helpers.ts";

const dataDir = useTestEnv("http://127.0.0.1:9"); // embeddings are not needed here
const { toMarkdown } = await import("../src/server/convert.ts");
const { chunkMarkdown, ftsQuery } = await import("../src/server/search.ts");

const FID = "0".repeat(32);

async function convert(name: string, content: Buffer | string): Promise<string> {
  const file = path.join(dataDir, name);
  writeFileSync(file, content);
  return toMarkdown(file, FID, name, "application/octet-stream");
}

describe("convert to Markdown", () => {
  test("Word (.docx)", async () => {
    const md = await convert("notes.docx", await makeDocx(["Photosynthesis makes glucose.", "It needs light."]));
    assert.match(md, /Photosynthesis makes glucose\./);
    assert.match(md, /It needs light\./);
    assert.match(md, /Original file: \[notes\.docx\]\(\/files\/0{32}\?download=1\)/);
  });

  test("Excel (.xlsx) becomes one table per sheet", async () => {
    const md = await convert("marks.xlsx", makeXlsx({ Term1: [["Name", "Score"], ["Asha", 91]], Term2: [["Name"], ["Ravi"]] }));
    assert.match(md, /## Term1/);
    assert.match(md, /\| Name \| Score \|\n\| --- \| --- \|\n\| Asha \| 91 \|/);
    assert.match(md, /## Term2/);
  });

  test("CSV keeps UTF-8 and escapes pipes", async () => {
    const md = await convert("words.csv", "word,meaning\ncafé,a|b\n");
    assert.match(md, /\| café \| a\\\|b \|/);
  });

  test("PowerPoint (.pptx) with speaker notes", async () => {
    const md = await convert("deck.pptx", await makePptx([
      { lines: ["Cells", "Nucleus holds DNA", "Ribosomes make protein &amp; more"], notes: "Mention mitochondria" },
      { lines: ["Summary"] },
    ]));
    assert.match(md, /## Slide 1: Cells\n\n- Nucleus holds DNA\n- Ribosomes make protein & more/);
    assert.match(md, /### Notes\n\nMention mitochondria/);
    assert.doesNotMatch(md, /### Notes\n\nMention mitochondria\n\n1/); // slide number placeholder dropped
    assert.match(md, /## Slide 2: Summary/);
  });

  test("PDF gets a heading per page", async () => {
    const md = await convert("chapter.pdf", makePdf("Newton laws of motion"));
    assert.match(md, /## Page 1\n\nNewton laws of motion/);
  });

  test("HTML drops scripts and keeps tables", async () => {
    const md = await convert("page.html", "<html><head><title>T</title><script>alert(1)</script></head><body><h2>Verbs</h2><table><tr><th>a</th></tr><tr><td>b</td></tr></table></body></html>");
    assert.doesNotMatch(md, /alert/);
    assert.match(md, /## Verbs/);
    assert.match(md, /\| a \|/);
  });

  test("JSON is pretty-printed in a code block", async () => {
    const md = await convert("data.json", '{"a":1}');
    assert.match(md, /```json\n\{\n {2}"a": 1\n\}\n```/);
  });

  test("images and videos are embedded, not converted", async () => {
    assert.equal(await convert("diagram.png", "x"), `![diagram.png](/files/${FID})\n`);
    assert.match(await convert("lecture.mp4", "x"), new RegExp(`^!\\[video: lecture\\.mp4\\]\\(/files/${FID}\\?kind=video\\)`));
  });
});

describe("search helpers", () => {
  test("chunkMarkdown splits on headings and windows long sections", () => {
    const chunks = chunkMarkdown(`# Intro\nhello\n## Long\n${"x".repeat(2500)}\n![img](/files/a)`);
    assert.deepEqual(chunks[0], { heading: "Intro", text: "hello" });
    assert.equal(chunks.filter((c) => c.heading === "Long").length, 3); // 1200-char windows, 200 overlap
    assert.ok(chunks.every((c) => !c.text.includes("![img]")));
  });

  test("ftsQuery drops stop words and quotes every word", () => {
    assert.equal(ftsQuery("What is a while-loop in Python?"), '"while" OR "loop" OR "python"');
    assert.equal(ftsQuery('"; DROP TABLE pages; --'), '"drop" OR "table" OR "pages"');
    assert.equal(ftsQuery("the a an"), "");
  });
});
