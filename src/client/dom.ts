/** Small DOM and network helpers shared by the browser pages. */
import type { ApiError } from "../shared/api.ts";

/**
 * Find one element. The type parameter says what kind it is, so TypeScript knows its properties:
 *   $<HTMLInputElement>("#title").value
 * Throws if it isn't on the page, so a typo in a selector fails loudly instead of silently.
 */
export function $<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`Element not found: ${selector}`);
  return el;
}

/** Find all matching elements, as a real array. */
export function $$<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T[] {
  return [...root.querySelectorAll<T>(selector)];
}

/** Escape text before putting it inside an HTML template string. */
export function esc(s: unknown): string {
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(s ?? "").replace(/[&<>"']/g, (c) => map[c]!);
}

/** Read the server's error message from a failed response. */
export async function errorMessage(r: Response): Promise<string> {
  const d = (await r.json().catch(() => ({}))) as Partial<ApiError>;
  return typeof d.detail === "string" ? d.detail : `Error ${r.status}`;
}
