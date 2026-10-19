# Step 2: Start StudyVault for the First Time

Now you'll start the website on your own computer and create your **owner account**.

## Run start.bat

1. Open the folder `C:\StudyVault` in File Explorer.
2. **Double-click `start.bat`.** A black window opens.

Or, from Command Prompt:

```cmd
cd /d C:\StudyVault
start.bat
```

| Command | What it does |
|---|---|
| `cd /d C:\StudyVault` | Moves Command Prompt into the StudyVault folder (`/d` allows switching drives too) |
| `start.bat` | Runs StudyVault's one-click start script |

## What happens the first time

The first run takes a few minutes. `start.bat` does all of this by itself:

1. **Checks Node.js** is installed and new enough.
2. **Installs the building blocks** StudyVault needs. These are free code libraries, downloaded into a `node_modules` folder. This happens only once.
3. **Builds the website files** for the browser.
4. **Creates your settings file**, `.env`.
5. **Asks you to create the owner account.** This is you.

## Create your owner account

The black window asks:

```text
Owner username (3-32 letters/numbers, no spaces):
```

Type a username (for example `priya.sharma`) and press Enter. Then type a **password** twice.

- The password **doesn't show** while you type. That's normal.
- Use **at least 10 characters**. If you'll open the site from the internet later, make it long and unique, for example four random words and a number.
- Write it down somewhere safe.

## The website opens

Your browser opens **<http://localhost:8000>** with the sign-in page. Sign in with the username and password you just made. Your StudyVault is running.

## Very important: keep the black window open

The black `start.bat` window **is** the website. While it's open, the site works. To stop the site, close the window or press **Ctrl + C** inside it. To start it again, double-click `start.bat`. Later starts take only a few seconds.

## Where everything is saved

| Item | Location |
|---|---|
| Your pages, accounts and settings | `C:\StudyVault\data\studyvault.db` |
| Your uploaded files | `C:\StudyVault\data\files\` |
| Settings file | `C:\StudyVault\.env` |

Passwords are **never saved as plain text**. StudyVault stores a scrambled version (a "hash"), which can't be turned back into the password.

## Key points

- Double-click `start.bat` to start StudyVault. The first time, it installs everything and asks you to create the owner account.
- The site is at **http://localhost:8000** on this computer.
- Keep the black window open. Closing it stops the website.
