/**
 * Shapes of the JSON the server sends and receives.
 * Both the server (src/server) and the browser (src/client) import these,
 * so TypeScript catches it when one side changes and the other doesn't.
 */

export type Role = "owner" | "viewer";

export interface Me {
  username: string;
  role: Role;
  csrf: string;
  site: string;
}

/** A page as listed in the sidebar (no body). */
export interface PageSummary {
  id: number;
  title: string;
  section: string;
  position: number;
  shared: 0 | 1;
  updated_at: string;
}

export interface Page extends PageSummary {
  content_md: string;
  created_at: string;
}

/** Body of POST /api/pages and PUT /api/pages/:id. */
export interface PageInput {
  title: string;
  section: string;
  content_md: string;
  shared: boolean;
  position?: number | null;
}

export interface UserRow {
  id: number;
  username: string;
  role: Role;
  created_at: string;
}

export interface SearchHit {
  id: number;
  title: string;
  section: string;
  /** Matching text; the matched words are wrapped in [[ ]]. */
  snip: string;
}

export interface UploadResult {
  page_id: number;
  /** Only when the file was inserted into an existing page. */
  markdown?: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatSource {
  n: number;
  page_id: number;
  title: string;
  heading: string;
}

/**
 * /api/chat streams one of these per line (NDJSON):
 * first the sources, then answer tokens, then done (or an error).
 * This is a "discriminated union": check which key exists to know which kind it is.
 */
export type ChatEvent =
  | { sources: ChatSource[] }
  | { t: string }
  | { error: string }
  | { done: true };

/** Every error response looks like this. */
export interface ApiError {
  detail: string;
}
