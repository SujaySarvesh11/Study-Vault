# Command Cheat Sheet

Every Command Prompt command used in this guide, in one place. Commands marked **admin** need Command Prompt opened with **Run as administrator**.

## Setting up (once)

| Command | What it's for |
|---|---|
| `winget install --id OpenJS.NodeJS.LTS -e --source winget` | Installs Node.js, the engine that runs StudyVault |
| `node -v` | Shows the Node.js version (must be 24 or higher) |
| `cd /d C:\StudyVault` | Moves into the StudyVault folder. Run this before the `npm` commands |
| `start.bat` | Starts StudyVault. The first time, it installs everything and creates the owner account |
| `notepad .env` | Opens the settings file in Notepad |
| `npm run import-tutorials` | Adds the built-in courses as private pages |
| `npm run manage import-tutorials --shared` | Adds the built-in courses, shared with viewers |

## Home Wi-Fi

| Command | What it's for |
|---|---|
| `netsh advfirewall firewall add rule name="StudyVault (port 8000, home network)" dir=in action=allow protocol=TCP localport=8000 profile=private remoteip=localsubnet` | **Admin.** Lets home devices reach StudyVault, only on Private networks |
| `netsh advfirewall firewall delete rule name="StudyVault (port 8000, home network)"` | **Admin.** Removes that rule |
| `ipconfig \| findstr IPv4` | Shows the computer's home address |

## Internet access (Tailscale)

| Command | What it's for |
|---|---|
| `winget install --id Tailscale.Tailscale -e --source winget` | Installs Tailscale |
| `tailscale up --hostname=studyvault` | Signs in and names the computer (choose your own name) |
| `tailscale status` | Shows whether the computer is connected |
| `tailscale funnel --bg 8000` | Publishes StudyVault at your `https://` address |
| `tailscale funnel status` | Shows the published address |
| `tailscale funnel --https=443 off` | Stops publishing to the internet |
| `tailscale down` | Disconnects from Tailscale (until `tailscale up`) |

## Keeping it running

| Command | What it's for |
|---|---|
| `powercfg /change standby-timeout-ac 0` | **Admin.** Never sleep while plugged in |
| `powercfg /change hibernate-timeout-ac 0` | **Admin.** Never hibernate while plugged in |
| `powercfg /change monitor-timeout-ac 5` | **Admin.** Screen off after 5 minutes |
| `powercfg /setacvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION 0` | **Admin.** Closing the lid does nothing while plugged in |
| `powercfg /setactive SCHEME_CURRENT` | **Admin.** Applies the power changes |

## Accounts, maintenance and backups

| Command | What it's for |
|---|---|
| `npm run manage reset-password NAME` | Sets a new password for a user |
| `npm run manage create-owner` | Creates or replaces the owner account |
| `npm run manage reindex` | Rebuilds the search and AI index |
| `npm update` | Updates StudyVault's building blocks for security fixes |
| `robocopy "C:\StudyVault\data" "E:\StudyVault-backup\data" /E` | Backs up all your notes and files to drive `E:` |
| `curl -s -o NUL -w "%{http_code}" http://localhost:8000/` | Checks StudyVault is running (`200` means yes) |

## Starting and stopping

- **Start:** double-click `start.bat`, or run `start.bat` inside `C:\StudyVault`.
- **Stop:** close the black window, or press **Ctrl + C** in it.

## Key points

- Run `cd /d C:\StudyVault` before any `npm` command.
- Commands marked **admin** need Command Prompt opened as administrator.
- `start.bat` must be running for any address to work.
