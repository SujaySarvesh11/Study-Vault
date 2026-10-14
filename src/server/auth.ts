/** Authentication: Argon2 password hashing, server-side sessions, CSRF tokens, login throttling. */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import type { NextFunction, Request, Response } from "express";
import type { Role } from "../shared/api.ts";
import { SESSION_HOURS } from "./config.ts";
import { one, run } from "./db.ts";

export const COOKIE = "sv_session";
const MAX_ATTEMPTS = 5;          // per username+IP
const WINDOW_SEC = 15 * 60;

/** The signed-in user, attached to every authenticated request as req.user. */
export interface SessionUser {
  id: number;
  username: string;
  role: Role;
  csrf: string;
  expires_at: number;
}

export interface UserRecord {
  id: number;
  username: string;
  pw_hash: string;
  role: Role;
}

// Teach Express's Request type about req.user (TypeScript "declaration merging").
declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

/** Throw one of these anywhere in a route; the error handler turns it into { detail } JSON. */
export class HttpError extends Error {
  status: number;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
  }
}

const now = () => Math.floor(Date.now() / 1000);
const sha256 = (token: string) => createHash("sha256").update(token).digest("hex");

const DUMMY_HASH = await hash("timing-equaliser"); // argon2id with library defaults

export async function hashPassword(pw: string): Promise<string> {
  if (pw.length < 10) throw new Error("Password must be at least 10 characters");
  return hash(pw);
}

export function tooManyAttempts(key: string, limit = MAX_ATTEMPTS): boolean {
  run("DELETE FROM login_attempts WHERE ts < ?", now() - WINDOW_SEC);
  const row = one<{ n: number }>("SELECT COUNT(*) AS n FROM login_attempts WHERE key=?", key);
  return (row?.n ?? 0) >= limit;
}

export function recordFailure(key: string): void {
  run("INSERT INTO login_attempts(key, ts) VALUES (?,?)", key, now());
}

export function clearFailures(key: string): void {
  run("DELETE FROM login_attempts WHERE key=?", key);
}

export async function verifyLogin(username: string, password: string): Promise<UserRecord | null> {
  const row = one<UserRecord>("SELECT * FROM users WHERE username=?", username);
  // Always run one Argon2 check, so a wrong username takes as long as a wrong password.
  let ok = false;
  try {
    ok = await verify(row?.pw_hash ?? DUMMY_HASH, password);
  } catch {
    ok = false; // malformed hash
  }
  return ok && row ? row : null;
}

export function createSession(userId: number): { token: string; csrf: string } {
  const token = randomBytes(32).toString("base64url");
  const csrf = randomBytes(24).toString("base64url");
  run("DELETE FROM sessions WHERE expires_at < ?", now());
  run("INSERT INTO sessions VALUES (?,?,?,?)", sha256(token), userId, csrf, now() + SESSION_HOURS * 3600);
  return { token, csrf };
}

export function destroySession(token: string): void {
  run("DELETE FROM sessions WHERE token_hash=?", sha256(token));
}

export function readCookie(req: Request, name: string): string | undefined {
  for (const part of (req.headers.cookie ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

function getSession(req: Request): SessionUser | null {
  const token = readCookie(req, COOKIE);
  if (!token) return null;
  const row = one<SessionUser>(
    `SELECT u.id, u.username, u.role, s.csrf, s.expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash=?`, sha256(token));
  if (!row || row.expires_at < now()) return null;
  return row;
}

function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Express middleware: require a signed-in user (and a valid CSRF token on changes). */
export function currentUser(req: Request, _res: Response, next: NextFunction): void {
  const user = getSession(req);
  if (!user) throw new HttpError(401, "Not signed in");
  // CSRF: every state-changing request must echo the session's token in a header.
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    if (!sameSecret(req.get("x-csrf-token") ?? "", user.csrf)) throw new HttpError(403, "CSRF check failed");
  }
  req.user = user;
  next();
}

/** Express middleware: like currentUser, but only the owner may continue. */
export function ownerOnly(req: Request, res: Response, next: NextFunction): void {
  currentUser(req, res, () => {
    if (req.user?.role !== "owner") throw new HttpError(403, "Owner only");
    next();
  });
}

/** For route handlers that run after currentUser/ownerOnly: the user is guaranteed to exist. */
export function userOf(req: Request): SessionUser {
  if (!req.user) throw new HttpError(401, "Not signed in");
  return req.user;
}
