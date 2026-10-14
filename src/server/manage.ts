/**
 * Admin commands.
 *
 *   npm run manage create-owner          create (or replace) the owner account
 *   npm run manage reset-password NAME   reset any user's password
 *   npm run manage reindex               rebuild the search / AI index
 *   npm run manage import-tutorials     add the TypeScript and SQL Server lessons (add --shared to share with viewers)
 *   npm run manage ensure-owner          create the owner only if there isn't one yet (used by start.bat)
 */
import { hashPassword } from "./auth.ts";
import { all, one, run, transaction } from "./db.ts";
import { ask, askNewPassword } from "./prompt.ts";
import { indexPage } from "./search.ts";
import { importTutorials } from "./tutorials.ts";

const [cmd, arg] = process.argv.slice(2);

async function createOwner(): Promise<void> {
  let name = await ask("Owner username (3-32 letters/numbers, no spaces): ");
  while (!/^[A-Za-z0-9_.-]{3,32}$/.test(name)) {
    console.log("Use 3-32 letters, numbers, _ . or - (no spaces). For example: SujaySarvesh or sujay.sarvesh");
    name = await ask("Owner username: ");
  }
  const pw = await hashPassword(await askNewPassword());
  transaction(() => {
    run("DELETE FROM users WHERE role='owner'");
    run("INSERT INTO users(username, pw_hash, role) VALUES (?,?, 'owner')", name, pw);
    run("DELETE FROM sessions");
  });
  console.log(`Owner '${name}' ready.`);
}

switch (cmd) {
  case "create-owner":
    await createOwner();
    break;
  case "ensure-owner": {
    const owner = one<{ username: string }>("SELECT username FROM users WHERE role='owner'");
    if (owner) {
      console.log(`Sign in as '${owner.username}'.`);
    } else {
      console.log("\nWelcome to StudyVault! First, create your owner account (you'll sign in with it).\n");
      await createOwner();
    }
    break;
  }
  case "reset-password": {
    if (!arg) { console.log("Usage: npm run manage reset-password NAME"); process.exit(1); }
    const pw = await hashPassword(await askNewPassword());
    const { changes } = run("UPDATE users SET pw_hash=? WHERE username=?", pw, arg);
    run("DELETE FROM sessions");
    console.log(changes ? "Updated." : "No such user.");
    break;
  }
  case "reindex": {
    const pages = all<{ id: number; title: string; content_md: string }>("SELECT id, title, content_md FROM pages");
    for (const p of pages) await indexPage(p.id, p.title, p.content_md);
    console.log(`Reindexed ${pages.length} pages.`);
    break;
  }
  case "import-tutorials": {
    const { added, updated } = await importTutorials(process.argv.includes("--shared"));
    console.log(`Done: ${added} added, ${updated} updated.`);
    break;
  }
  default:
    console.log(`Commands:
  npm run manage create-owner
  npm run manage reset-password NAME
  npm run manage reindex
  npm run manage import-tutorials [--shared]`);
}
