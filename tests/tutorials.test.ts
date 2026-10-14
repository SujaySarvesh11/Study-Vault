/** The built-in tutorials load, are numbered without gaps, and have well-formed Markdown. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { useTestEnv } from "./helpers.ts";

useTestEnv("http://127.0.0.1:9");
const { loadTutorials } = await import("../src/server/tutorials.ts");

const tutorials = loadTutorials();

test("both courses are present and numbered 1..n", () => {
  for (const section of ["TypeScript", "SQL Server"]) {
    const positions = tutorials.filter((t) => t.section === section).map((t) => t.position);
    assert.ok(positions.length >= 15, `${section} has ${positions.length} lessons`);
    assert.deepEqual(positions, positions.map((_, i) => i + 1), `${section} lessons are numbered without gaps`);
  }
});

test("every lesson has a title, headings and balanced code fences", () => {
  for (const t of tutorials) {
    assert.ok(t.title.length > 3, t.file);
    assert.match(t.content_md, /^## /m, `${t.file} has section headings`);
    assert.equal((t.content_md.match(/^```/gm) ?? []).length % 2, 0, `${t.file} has an unclosed code block`);
    assert.doesNotMatch(t.content_md, /^# /m, `${t.file} should only have one "# Title" line`);
  }
});

test("titles are unique within a section (import updates pages by title)", () => {
  const keys = tutorials.map((t) => `${t.section}|${t.title}`);
  assert.equal(new Set(keys).size, keys.length);
});
