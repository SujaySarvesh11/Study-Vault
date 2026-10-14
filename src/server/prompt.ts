/** Ask questions in the terminal. Passwords are hidden while typing. */
import { emitKeypressEvents } from "node:readline";
import { createInterface } from "node:readline/promises";

// When input is piped in (scripts, tests), every answer comes from one shared line reader,
// because a fresh reader per question could swallow the lines meant for the next one.
let piped: AsyncIterator<string> | undefined;

async function nextPipedLine(): Promise<string> {
  piped ??= createInterface({ input: process.stdin })[Symbol.asyncIterator]();
  const r = await piped.next();
  if (r.done) throw new Error("No more input");
  return r.value;
}

export async function ask(question: string): Promise<string> {
  if (!process.stdin.isTTY) {
    console.log(question);
    return (await nextPipedLine()).trim();
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

export function askHidden(question: string): Promise<string> {
  const stdin = process.stdin;
  if (!stdin.isTTY) { // piped input: nothing to hide
    console.log(question);
    return nextPipedLine();
  }
  process.stdout.write(question);
  emitKeypressEvents(stdin); // turn raw input into named keys ("return", "backspace", ...)
  stdin.setRawMode(true);
  stdin.resume();
  return new Promise((resolve) => {
    let value = "";
    const onKey = (str: string | undefined, key: { name?: string; ctrl?: boolean } = {}) => {
      if (key.ctrl && key.name === "c") process.exit(130);
      if (key.name === "return" || key.name === "enter") {
        stdin.off("keypress", onKey);
        stdin.setRawMode(false);
        stdin.pause();
        process.stdout.write("\n");
        resolve(value);
      } else if (key.name === "backspace") {
        if (value) { value = value.slice(0, -1); process.stdout.write("\b \b"); }
      } else if (str && str.length === 1 && str >= " ") { // ignore arrows, Tab, etc.
        value += str;
        process.stdout.write("*"); // show that the key was received, without showing it
      }
    };
    stdin.on("keypress", onKey);
  });
}

export async function askNewPassword(): Promise<string> {
  for (;;) {
    const pw = await askHidden("Password (min 10 chars, shown as *): ");
    if (pw.length < 10) { console.log("Too short."); continue; }
    if (pw !== await askHidden("Repeat: ")) { console.log("Didn't match."); continue; }
    return pw;
  }
}
