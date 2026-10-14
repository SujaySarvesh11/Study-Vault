/** SQLite database (Node's built-in node:sqlite) plus small typed query helpers. */
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { DB_PATH } from "./config.ts";

const SCHEMA = `
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL COLLATE NOCASE,
  pw_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','viewer')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS login_attempts (
  key TEXT NOT NULL,
  ts INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  section TEXT NOT NULL DEFAULT 'General',
  position INTEGER NOT NULL DEFAULT 0,
  content_md TEXT NOT NULL DEFAULT '',
  shared INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  page_id INTEGER REFERENCES pages(id) ON DELETE SET NULL,
  orig_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS chunks (
  id INTEGER PRIMARY KEY,
  page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  heading TEXT,
  text TEXT NOT NULL,
  embedding BLOB
);
CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
  text, heading, content='chunks', content_rowid='id', tokenize='porter unicode61'
);
CREATE TRIGGER IF NOT EXISTS chunks_ai AFTER INSERT ON chunks BEGIN
  INSERT INTO chunks_fts(rowid, text, heading) VALUES (new.id, new.text, new.heading);
END;
CREATE TRIGGER IF NOT EXISTS chunks_ad AFTER DELETE ON chunks BEGIN
  INSERT INTO chunks_fts(chunks_fts, rowid, text, heading) VALUES ('delete', old.id, old.text, old.heading);
END;
`;

// One connection for the whole app. node:sqlite is synchronous, so queries never interleave.
export const db = new DatabaseSync(DB_PATH, { timeout: 30_000 });
db.exec(SCHEMA);

type Params = SQLInputValue[];

/** First matching row, or undefined. The caller says what shape the row has: one<User>(...). */
export function one<T>(sql: string, ...params: Params): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined;
}

/** All matching rows. */
export function all<T>(sql: string, ...params: Params): T[] {
  return db.prepare(sql).all(...params) as T[];
}

/** INSERT / UPDATE / DELETE. Returns how many rows changed and the new row id. */
export function run(sql: string, ...params: Params): { changes: number; lastId: number } {
  const r = db.prepare(sql).run(...params);
  return { changes: Number(r.changes), lastId: Number(r.lastInsertRowid) };
}

/** Run several statements as one unit: all of them succeed, or none do. */
export function transaction<T>(fn: () => T): T {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
