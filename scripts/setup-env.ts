/** First run: create .env from .env.example, set up for this PC (http://localhost). */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const envFile = path.join(root, ".env");

if (!existsSync(envFile)) {
  const example = readFileSync(path.join(root, ".env.example"), "utf8");
  // Plain http://localhost can't use Secure-only cookies. Set it back to true before going online.
  writeFileSync(envFile, example.replace(/^COOKIE_SECURE=true$/m, "COOKIE_SECURE=false"));
  console.log("Created .env for local use. Add your Hugging Face token (HF_TOKEN=...) to it to switch on the AI assistant.");
}
