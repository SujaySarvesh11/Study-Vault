# Step 1: Install Node.js

StudyVault is written in a programming language that needs **Node.js** to run. Node.js is free and made by the OpenJS Foundation. You install it once.

## Install it with one command

1. Open **Command Prompt** (Windows key → type `cmd` → Enter).
2. Paste this command and press Enter:

```cmd
winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-source-agreements --accept-package-agreements
```

| Part of the command | What it means |
|---|---|
| `winget install` | Use Windows' built-in app installer to install a program |
| `--id OpenJS.NodeJS.LTS -e` | Exactly the program called Node.js LTS (the long-term, stable version) |
| `--source winget` | Download it from Microsoft's official app list |
| `--accept-...-agreements` | Agree to the licence automatically, so it doesn't stop to ask |

3. If Windows asks **"Do you want to allow this app to make changes?"**, click **Yes**.
4. Wait for **Successfully installed**.
5. **Close the Command Prompt window**, so that the next one knows Node.js is installed.

## The other way: download it from the website

If `winget` isn't recognised:

1. Go to <https://nodejs.org>.
2. Click the big **LTS** download button.
3. Open the downloaded file and click **Next** through the installer, keeping all the default options.

## Check that it worked

Open a **new** Command Prompt and run:

```cmd
node -v
```

You should see a version number such as `v24.18.0`. **The first number must be 24 or higher.** If it's lower, install the newest LTS version again.

## Key points

- Node.js is the engine that runs StudyVault.
- Install it with `winget install --id OpenJS.NodeJS.LTS -e` or from nodejs.org.
- Check it with `node -v`. You need version **24 or newer**.
