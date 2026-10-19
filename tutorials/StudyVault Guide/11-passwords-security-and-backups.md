# Passwords, Security and Backups

## How StudyVault protects you

| Protection | What it means for you |
|---|---|
| **Scrambled passwords (Argon2id)** | Your password is never stored as text. Even someone who copies the database can't read it |
| **Login limits** | After 5 wrong tries for a username, or 20 from one visitor, in 15 minutes, logins are blocked for a while. This stops password guessing |
| **Sessions** | You stay signed in for 72 hours (`SESSION_HOURS` in `.env`). Changing your password signs out every device |
| **Viewer checks** | Viewers are checked on every request. They can never open, search for or ask the AI about private pages |
| **Safe file handling** | Uploaded files get random names and are shown in a locked-down way, so a harmful file can't run code |
| **HTTPS on the internet** | The Tailscale address is encrypted. Passwords can't be read on public Wi-Fi |
| **Firewall rule** | Home devices can connect only while you're on your Private home network |

## Change your password (you know the current one)

1. Sign in.
2. Click **⚙ Settings**.
3. Enter your current password and the new one (at least 10 characters), then save.

## Reset a forgotten password

On the computer running StudyVault, open Command Prompt and run (use your own username):

```cmd
cd /d C:\StudyVault
npm run manage reset-password yourUsername
```

Type the new password twice. It doesn't show while typing. All devices are signed out. This only works on that computer, so nobody can reset it over the internet.

## Other admin commands

| Command | What it does |
|---|---|
| `npm run manage create-owner` | Creates a new owner account, replacing the old one |
| `npm run manage reset-password NAME` | Sets a new password for any user, owner or viewer |
| `npm run manage reindex` | Rebuilds the search and AI index. Use after changing `EMBED_MODEL` |

Run these from inside the StudyVault folder (`cd /d C:\StudyVault` first).

## Back up your notes

**Everything you've stored is in one folder: `C:\StudyVault\data`.** Copy it regularly to a USB drive or cloud storage. With a USB drive as `E:`:

```cmd
robocopy "C:\StudyVault\data" "E:\StudyVault-backup\data" /E
```

| Part | Meaning |
|---|---|
| `robocopy` | Windows' reliable copy tool |
| first folder | What to copy (your data) |
| second folder | Where to put the copy |
| `/E` | Include every folder inside, even empty ones |

For the most reliable backup, stop StudyVault first (close the `start.bat` window).

**To restore:** stop StudyVault, put the `data` folder back into `C:\StudyVault`, then start `start.bat`.

## Your responsibilities

- Use a **long, unique password**, especially once the site is on the internet.
- **Never share** your `.env` file or `data` folder. They hold your secrets and notes.
- Keep the Hugging Face token secret.
- Now and then, update StudyVault's building blocks for security fixes:

```cmd
cd /d C:\StudyVault
npm update
```

## Key points

- Change your password in **⚙ Settings**, or reset it with `npm run manage reset-password NAME`.
- All your content lives in the `data` folder, so back it up with `robocopy`.
- Keep `.env`, `data` and your token private.
