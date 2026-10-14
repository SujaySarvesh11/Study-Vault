/** Development mode: rebuilds the browser code and restarts the server whenever you save a file. */
import { spawn } from "node:child_process";

const run = (args: string[]) => spawn(process.execPath, args, { stdio: "inherit" });

const client = run(["scripts/build-client.ts", "--watch"]);
const server = run(["--watch", "--env-file-if-exists=.env", "src/server/main.ts"]);

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => { client.kill(); server.kill(); process.exit(0); });
}
