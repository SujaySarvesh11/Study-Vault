# Before You Start: What You Need

Gather these before building your own StudyVault. Setting everything up takes about **1 to 2 hours** the first time.

## Checklist

- [ ] **A Windows 10 or Windows 11 computer.** A laptop is fine. It must be switched on whenever people use the site.
- [ ] **An internet connection.**
- [ ] **Permission to install programs** on that computer (an administrator account). Windows will ask "Do you want to allow this app to make changes?". You must be able to click **Yes**.
- [ ] **The StudyVault project folder.** See below.
- [ ] **A Google, Microsoft or GitHub account** to sign in to the free services.
- [ ] **About 2 GB of free disk space**, plus space for your own files and videos.

## Getting the StudyVault project folder

StudyVault's code is a folder of files. You don't write it; you copy it.

1. Ask the person who shared this guide for a copy of the **StudyVault project folder** as a ZIP file. If you were given access to its GitHub page, open it, click the green **Code** button, then **Download ZIP**.
2. Make sure the copy **does not include** their `data` folder or `.env` file. Those hold *their* notes, password and secret keys. You will create your own.
3. Right-click the ZIP file and choose **Extract All**.
4. Move the extracted folder somewhere simple. This guide uses:

```text
C:\StudyVault
```

When you open `C:\StudyVault`, you should see files such as `start.bat`, `package.json` and `README.md`, and folders such as `src`, `static` and `tutorials`.

> **Tip:** Avoid putting the folder inside OneDrive. OneDrive syncing can lock the database file while StudyVault is using it.

## Free accounts you'll create during the guide

| Service | What it's for | Needed? |
|---|---|---|
| **Hugging Face** (huggingface.co) | Powers the AI assistant | Optional. Everything except the AI works without it |
| **Tailscale** (tailscale.com) | Lets you open StudyVault from anywhere, with a secure HTTPS address | Optional. Only for use outside your home |

## How to open Command Prompt

Many steps ask you to type a command. To open Command Prompt:

1. Press the **Windows key**.
2. Type `cmd`.
3. Press **Enter** for a normal window, or choose **Run as administrator** on the right when a step says "as administrator".

To run a command: **copy it from this guide, right-click inside the Command Prompt window to paste, then press Enter.**

## Key points

- You need a Windows PC, the internet, administrator rights and a copy of the project folder.
- Put the project in `C:\StudyVault`, not in OneDrive.
- Never copy someone else's `data` folder or `.env` file. They are private.
