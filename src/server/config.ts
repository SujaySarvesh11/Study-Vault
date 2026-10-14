/** All settings come from environment variables (see .env.example). */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { ALL_EXTENSIONS, FILE_TYPES } from "../shared/files.ts";

const env = process.env;
const bool = (v: string | undefined, fallback: boolean): boolean =>
  v === undefined || v === "" ? fallback : v.toLowerCase() === "true";

export const BASE_DIR = path.resolve(import.meta.dirname, "..", "..");
export const STATIC_DIR = path.join(BASE_DIR, "static");
export const DATA_DIR = path.resolve(env.DATA_DIR || path.join(BASE_DIR, "data"));
export const FILES_DIR = path.join(DATA_DIR, "files");
export const DB_PATH = path.join(DATA_DIR, "studyvault.db");

export const SITE_NAME = env.SITE_NAME || "StudyVault";
export const HOST = env.HOST || "127.0.0.1";
export const PORT = Number(env.PORT || 8000);

// Set to "true" when served over HTTPS (Cloudflare Tunnel) so cookies are Secure-only.
export const COOKIE_SECURE = bool(env.COOKIE_SECURE, true);
export const SESSION_HOURS = Number(env.SESSION_HOURS || 72);

export const MAX_UPLOAD_MB = Number(env.MAX_UPLOAD_MB || 500);

// Hugging Face Inference Providers (https://huggingface.co/settings/tokens, "Make calls to Inference Providers")
export const HF_TOKEN = env.HF_TOKEN || "";
export const HF_BASE_URL = (env.HF_BASE_URL || "https://router.huggingface.co").replace(/\/+$/, "");
export const CHAT_MODEL = env.CHAT_MODEL || "meta-llama/Llama-3.1-8B-Instruct";
export const EMBED_MODEL = env.EMBED_MODEL || "sentence-transformers/all-MiniLM-L6-v2";

// Optional: transcribe uploaded videos/audio with a Hugging Face speech-to-text model.
export const TRANSCRIBE_MEDIA = bool(env.TRANSCRIBE_MEDIA, false);
export const WHISPER_MODEL = env.WHISPER_MODEL || "openai/whisper-large-v3";

// Extension allowlist → kind (the list itself lives in src/shared/files.ts)
export const DOC_EXT: ReadonlySet<string> = new Set(FILE_TYPES.doc);
export const IMAGE_EXT: ReadonlySet<string> = new Set(FILE_TYPES.image);
export const VIDEO_EXT: ReadonlySet<string> = new Set(FILE_TYPES.video);
export const AUDIO_EXT: ReadonlySet<string> = new Set(FILE_TYPES.audio);
export const ALLOWED_EXT: ReadonlySet<string> = new Set(ALL_EXTENSIONS);

mkdirSync(FILES_DIR, { recursive: true });
