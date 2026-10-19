/** Starts the web server. Run with: npm start (or double-click start.bat). */
import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";
import { createApp } from "./app.ts";
import { HF_TOKEN, HOST, PORT } from "./config.ts";

const url = `http://localhost:${PORT}`;

createApp().listen(PORT, HOST, (err?: Error) => {
  if (err) {
    console.error(`Could not start on port ${PORT}: ${err.message}`);
    console.error("Is StudyVault already running in another window? Close it, or set PORT in .env.");
    process.exit(1);
  }
  console.log(`StudyVault is running at ${url}  (press Ctrl+C to stop)`);
  if (HOST === "0.0.0.0") {
    for (const ip of lanAddresses()) console.log(`Other devices on your network: http://${ip}:${PORT}`);
  }
  if (!HF_TOKEN) console.warn("HF_TOKEN is not set: search works, but the AI assistant can't answer yet. See README.");
  if (process.env.OPEN_BROWSER === "1") openBrowser(url);
});

/** This PC's IPv4 addresses on the local network, e.g. 192.168.1.105. */
function lanAddresses(): string[] {
  return Object.values(networkInterfaces()).flat()
    .filter((a) => a !== undefined && a.family === "IPv4" && !a.internal && !a.address.startsWith("169.254."))
    .map((a) => a!.address);
}

function openBrowser(target: string): void {
  const [cmd, args] = process.platform === "win32" ? ["cmd", ["/c", "start", "", target]]
    : process.platform === "darwin" ? ["open", [target]] : ["xdg-open", [target]];
  spawn(cmd, args, { stdio: "ignore", detached: true }).on("error", () => {}).unref();
}
