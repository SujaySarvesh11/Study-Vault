# StudyVault

A private, self-hosted study notebook. Upload Word, Excel, PowerPoint, PDF, images, video and audio. Each file becomes a readable Markdown lesson in a tutorial-style site. An AI assistant answers **only** from your pages.

The whole project is **TypeScript**, the server and the browser code alike. It runs on Node.js with Express, Node's built-in SQLite, Hugging Face Inference Providers (free monthly credits) and, optionally, Cloudflare Tunnel's free tier.

## What you get

| Feature | How it works |
|---|---|
| Upload → Markdown | `.docx .xlsx .xls .pptx .pdf .csv .html .txt .json .xml .epub` files become pages (see [convert.ts](src/server/convert.ts)). The original file stays attached. |
| Images, video, audio | Embedded on a page and playable in the browser, with space for your notes. Optional automatic transcript (see below). |
| Tutorial layout | Sections in the sidebar with numbered lessons, an "On this page" contents list, Previous/Next buttons, code highlighting with a Copy button, and light/dark themes. Works on phones. |
| Editing | Markdown editor with live preview. Ctrl+S saves. **Insert file** adds an image or video at the cursor. Any page downloads as `.md`. |
| Search | Full-text search across all pages. |
| AI assistant | Retrieves the most relevant passages from your pages, then a Hugging Face–hosted model answers using only those passages and cites them as `[1]`, `[2]`. If nothing relevant is found, it says so instead of guessing. |
| Sharing | You are the **owner**. You can add **viewers** who read only pages you mark "shared". The assistant never shows them private pages. |

## 1. Start it on your PC (one click)

1. Install **Node.js 24 LTS or newer** from <https://nodejs.org> (once).
2. Double-click **`start.bat`**.

The first time, it installs the packages, creates `.env`, and asks you in the black window to choose an owner username and password. Then it opens <http://localhost:8000> in your browser. Keep the window open while you use the site. Close it, or press Ctrl+C, to stop.

**Switch on the AI assistant:** sign in at <https://huggingface.co>, open **Settings → Access Tokens → Create new token → Fine-grained**, tick **Make calls to Inference Providers**, and paste the token into `.env` as `HF_TOKEN=hf_...`. Then restart `start.bat`. Search and everything else work without it.

**Choosing a model:** the default `meta-llama/Llama-3.1-8B-Instruct` is cheap and fast. Larger models such as `Qwen/Qwen2.5-72B-Instruct` or `meta-llama/Llama-3.3-70B-Instruct` give better answers but use more of your monthly credits. Change `CHAT_MODEL` in `.env` and restart. If you change `EMBED_MODEL`, click **Settings → Rebuild index** afterwards.

**Privacy note:** the AI runs on Hugging Face's servers, so the passages retrieved for each question (and the text of pages, when they are indexed) are sent to Hugging Face. Your files and database stay on your PC.

**Open it from other devices at home (phone, tablet, another PC):**

1. In `.env`, set `HOST=0.0.0.0` (keep `COOKIE_SECURE=false`) and restart `start.bat`. The window prints the address to use, e.g. `http://192.168.1.105:8000`.
2. In Windows, set your home Wi-Fi to **Private** (Settings → Network & internet → Wi-Fi → your network → Private network).
3. Allow the port, from PowerShell run as administrator:
   ```powershell
   New-NetFirewallRule -DisplayName "StudyVault (port 8000, home network)" -Direction Inbound -Protocol TCP -LocalPort 8000 -Profile Private -RemoteAddress LocalSubnet -Action Allow
   ```

The rule only applies on Private networks, so on public Wi-Fi the site stays hidden. Traffic at home is plain HTTP, so only do this on a network you trust. If the address changes, reserve a fixed IP for the PC in your router's settings.

## 2. Test it (one click)

Double-click **`test.bat`**. It checks the types in every TypeScript file, then runs the automated tests in [tests/](tests/).

The tests start the real server on a temporary localhost port with an empty, throw-away database. A fake Hugging Face server stands in for the real one, so no internet or token is needed. They cover:

- signing in, CSRF protection and login throttling
- creating, editing and searching pages
- uploading every file type
- video range requests
- viewers not seeing private pages
- the assistant's streamed, cited answers

From a terminal it's `npm run typecheck` and `npm test`.

## 3. Learning TypeScript with this project

| Where | What it shows |
|---|---|
| [src/shared/api.ts](src/shared/api.ts) | `interface`, union types, and a **discriminated union** (`ChatEvent`). The server and browser both import these types, so if one side changes, the other gets a type error. |
| [src/server/db.ts](src/server/db.ts) | **Generics**: `one<Page>(sql)` returns a `Page`. |
| [src/server/app.ts](src/server/app.ts) | Checking untrusted input at runtime with **zod**. `z.infer` turns a schema into a TypeScript type. |
| [src/server/auth.ts](src/server/auth.ts) | A custom `Error` class, Express middleware, and **declaration merging** (adding `req.user` to Express's `Request` type). |
| [src/server/ai.ts](src/server/ai.ts) | **Async generators** (`async function*`) for streaming the answer token by token. |
| [src/client/dom.ts](src/client/dom.ts) | Typed DOM helpers: `$<HTMLInputElement>("#title").value`. |
| [src/client/app.ts](src/client/app.ts) | Narrowing a union with `"key" in msg`, typed `fetch` results, DOM events. |
| [tsconfig.json](tsconfig.json) | Strict settings, explained in comments. |

**How it runs:** Node 24 runs `.ts` files directly by stripping out the types, so the server has no build step. That's why the imports end in `.ts`. The browser can't run TypeScript, so [scripts/build-client.ts](scripts/build-client.ts) bundles `src/client` into `static/build/` with esbuild. Source maps let your browser's dev tools show the original `.ts` files. `tsc` only *checks* types; it never produces files.

**Development mode:** `npm run dev` rebuilds the browser code and restarts the server whenever you save a file. Run it with `COOKIE_SECURE=false` in `.env`, which `start.bat` sets for you.

## Built-in courses: TypeScript and SQL Server

The [tutorials/](tutorials/) folder holds two full courses as Markdown lessons:

- **TypeScript**: 19 lessons, from basic types to generics, Express and tooling.
- **SQL Server**: 21 lessons on the sample **SchoolDB** database, from SELECT to window functions, transactions, security, backups and using SQL Server from TypeScript.

Each lesson has examples, key points and practice exercises. Add them to your site with:

```bash
npm run import-tutorials             # private pages
npm run manage import-tutorials --shared   # also visible to viewers
```

Run it again after editing a lesson file: it updates the existing pages instead of making copies. To add your own lesson, create `tutorials/<Section>/NN-name.md` starting with a `# Title` line.

## Read the tutorials online (GitHub Pages)

The built-in courses are also published as a free, read-only website: **<https://sujaysarvesh11.github.io/Study-Vault/>**

It has the same look as the app (sidebar, "On this page", Previous/Next, code highlighting, light/dark theme, search) but none of the private parts: no sign-in, uploads, editing or AI assistant, because GitHub Pages can only host plain files. Your own notes in `data/` are never published.

- **Updating it:** edit or add a lesson in `tutorials/` and push to `main`. The workflow in [.github/workflows/pages.yml](.github/workflows/pages.yml) rebuilds and republishes the site in about a minute.
- **Preview it locally:** `npm run build:pages`, then serve the folder, for example `npx serve _site`, and open the address it prints.
- **How it's built:** [scripts/build-pages.ts](scripts/build-pages.ts) turns each lesson into an HTML page at build time; [scripts/pages/](scripts/pages/) holds the small script and styles for search, theme and the mobile menu.

## 4. Reach it from anywhere (Cloudflare Tunnel, free)

The tunnel makes an outgoing, encrypted connection from your PC to Cloudflare. You don't open any ports on your router, and your home IP stays hidden. **First set `COOKIE_SECURE=true` in `.env`.**

**Permanent address (recommended).** You need a domain added to a free Cloudflare account. Cheap domains are a few dollars a year.

1. Go to Cloudflare dashboard → **Zero Trust** → **Networks → Tunnels** → **Create a tunnel** (choose *Cloudflared*). Name it.
2. Under *Install connector*, install `cloudflared` for Windows and run the command it shows. If you use Docker (below), pick **Docker** instead, copy only the long token after `--token`, and paste it into `.env` as `TUNNEL_TOKEN=...`.
3. Under *Public hostname*, set a subdomain such as `notes.yourdomain.com`. Set service type **HTTP** and URL **`localhost:8000`**, or **`app:8000`** with Docker.

**Strongly recommended: add a second lock with Cloudflare Access (free for small teams).**

1. Go to Zero Trust → **Access → Applications** → *Add* → **Self-hosted**, with hostname `notes.yourdomain.com`.
2. Add a policy: *Allow* → *Emails* → your email and your viewers' emails.

Now people must pass an emailed one-time code before they even see the StudyVault login page.

**No domain yet? Testing only.** Run `cloudflared tunnel --url http://localhost:8000`. You get a random `*.trycloudflare.com` address that changes on every restart.

> **Upload limit:** Cloudflare's free plan rejects any request over **100 MB** through the tunnel. Upload large videos at home on `http://localhost:8000`, or compress them first.

**Running it on a Linux server (e.g. Oracle Cloud Always Free):** copy the project there (without `node_modules`), then run `bash deploy/setup-ubuntu.sh`. It installs Node.js 24, builds the site, asks for the owner account, and installs a background service ([deploy/studyvault.service](deploy/studyvault.service)) that starts at boot. Then point a Cloudflare Tunnel at `http://localhost:8000` as above. Useful commands: `sudo systemctl status studyvault`, `journalctl -u studyvault -f`.

**Running it with Docker instead (optional):** `docker compose up -d --build`, then `docker compose run --rm app node src/server/manage.ts create-owner`. Add `--profile tunnel` to the first command to start the tunnel too.

## 5. Using it

- **⇪ Upload**: pick a section (a course or chapter), then drop files in. Each file becomes a page.
- **＋ New page**: write your own lesson in Markdown.
- **✎ Edit**: rename, move to another section, tick **Share with viewers**, or insert images and videos.
- **✦ Ask my notes**: the assistant opens bottom right. Click a source under an answer to jump to that page.
- **⚙ Settings**: change your password and add or remove viewers.

**Automatic transcripts for video and audio (optional).** Set `TRANSCRIBE_MEDIA=true` in `.env`. Uploads are then sent to a Hugging Face speech-to-text model (`WHISPER_MODEL`). Transcripts become searchable, so the assistant can answer questions about your lectures. This uses your credits, and very long recordings may be rejected.

**Scanned PDFs** (photos of pages) have no text to extract. They are attached, but the assistant can't read them unless you add notes.

## Security

- Passwords are hashed with **Argon2id**. Logins are throttled: 5 failures per username or 20 per IP in 15 minutes.
- Sessions are random 256-bit tokens. Only their hashes are stored. Cookies are `HttpOnly`, `Secure` and `SameSite=Strict`. Changing your password signs you out everywhere.
- Every change needs a **CSRF token**. All request bodies are validated with **zod**.
- A strict **Content-Security-Policy** applies: no inline scripts, and all libraries are bundled locally with no CDNs. All Markdown is sanitized with **DOMPurify** to block XSS.
- Uploads go through an **extension allowlist** and a size limit. Files are stored under random names. Each file is served with `nosniff` and its own locked-down sandbox CSP, so a malicious HTML or SVG can't run.
- Viewers are checked on the server for every page, file, search and AI request, not just hidden in the interface.
- The AI system prompt treats your documents as data, not instructions, which limits prompt injection from uploaded files.
- By default the server only listens on `127.0.0.1`, so other devices on your Wi-Fi can't reach it. Setting `HOST=0.0.0.0` (see "Open it from other devices at home") lets them reach it over plain HTTP. The Hugging Face token stays on the server and is never sent to the browser.

**Your job:** use a long, unique password. Keep `.env` and `data/` private. Run `npm update` now and then for security fixes. Keep backups.

## Backups

All your content is in `data/` (database + files). Copy that folder somewhere safe, such as an external drive or cloud storage. To restore, put it back and start the app.

## Admin commands

```bash
npm run manage create-owner          # create / replace the owner
npm run manage reset-password NAME
npm run manage reindex               # rebuild the AI index
npm run import-tutorials             # add/update the TypeScript and SQL Server courses
```

## Project layout

```
start.bat / test.bat   one-click start and one-click tests (Windows)
src/shared/api.ts      types shared by server and browser
src/server/main.ts     starts the server
src/server/app.ts      routes, security headers, uploads, file access rules
src/server/auth.ts     Argon2 passwords, sessions, CSRF, login throttling
src/server/db.ts       SQLite schema + typed query helpers
src/server/convert.ts  file → Markdown, media embeds, optional transcripts
src/server/search.ts   chunking, keyword (SQLite FTS5) + semantic (Hugging Face embeddings) search
src/server/ai.ts       grounded answers with citations, streamed from Hugging Face
src/server/manage.ts   admin commands
src/client/            the browser code (app.ts, login.ts, dom.ts)
static/                HTML, CSS, icon; static/build/ is generated by the build
scripts/               build, dev mode, first-run setup
tutorials/             the TypeScript and SQL Server courses (Markdown)
tests/                 automated tests (node:test)
data/                  your database and files (created on first run; back this up)
```

License: MIT for this project. Bundled libraries keep their own licenses (see `static/build/app.js.LEGAL.txt` after a build).
