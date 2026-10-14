/**
 * Bundles the browser TypeScript (src/client) into static/build/ with esbuild.
 *   node scripts/build-client.ts           build once
 *   node scripts/build-client.ts --watch   rebuild on every save
 */
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import * as esbuild from "esbuild";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "static", "build");
mkdirSync(out, { recursive: true });

// Code-highlighting themes come straight from the highlight.js package.
const styles = path.join(root, "node_modules", "highlight.js", "styles");
copyFileSync(path.join(styles, "github.min.css"), path.join(out, "hl-light.css"));
copyFileSync(path.join(styles, "github-dark.min.css"), path.join(out, "hl-dark.css"));

const options: esbuild.BuildOptions = {
  entryPoints: [path.join(root, "src/client/app.ts"), path.join(root, "src/client/login.ts")],
  outdir: out,
  bundle: true,
  format: "iife",
  target: "es2022",
  minify: true,
  sourcemap: "linked",   // browser dev tools show your original .ts files
  legalComments: "linked", // library licenses go to *.LEGAL.txt
  logLevel: "info",
};

if (process.argv.includes("--watch")) {
  await (await esbuild.context(options)).watch();
} else {
  await esbuild.build(options);
}
