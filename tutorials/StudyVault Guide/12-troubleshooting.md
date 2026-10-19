# Troubleshooting

Find what you see in the first column. Most problems come down to **StudyVault not running** or **the computer's address changing**.

## Quick health check

Run these in Command Prompt to see what's working:

```cmd
curl -s -o NUL -w "%{http_code}" http://localhost:8000/
tailscale status
tailscale funnel status
ipconfig | findstr IPv4
```

| Command | Healthy result |
|---|---|
| `curl ... http://localhost:8000/` | `200`. Anything else (often `000`) means StudyVault isn't running |
| `tailscale status` | Lists your computer's name |
| `tailscale funnel status` | Shows `Funnel on` and your `https://` address |
| `ipconfig \| findstr IPv4` | Shows your current home address, such as `192.168.1.100` |

## Common problems

| What you see | Likely cause | Fix |
|---|---|---|
| **502** error on the internet address | StudyVault isn't running, or is still starting | Double-click `start.bat` and wait 10–20 seconds |
| Internet address doesn't load at all | Computer asleep, off or offline | Wake it and check the internet. See Step 7 to prevent sleep |
| Home address (`192.168.x.x`) stopped working | The computer's number changed | Run `ipconfig \| findstr IPv4` and use the new number, or use the `https://` address |
| Phone can't open the home address | Wi-Fi set to Public, firewall rule missing, or `HOST` still `127.0.0.1` | Redo Step 5 |
| `Could not start on port 8000` | StudyVault is already running in another window | Use the open window, or close it and start again |
| `'node' is not recognized` | Node.js isn't installed, or Command Prompt was open during install | Close and reopen Command Prompt, or redo Step 1 |
| `StudyVault needs Node.js 24 or newer` | Old Node.js version | Install the newest LTS from nodejs.org |
| `'tailscale' is not recognized` | Command Prompt was open during install | Close and reopen Command Prompt |
| **Funnel is not enabled on your tailnet** | First-time Funnel setup | Open the link shown and enable Funnel |
| **Wrong username or password** | Typo, or forgotten password | Check Caps Lock, or reset (see Passwords lesson) |
| **Too many attempts** | 5 wrong tries in 15 minutes | Wait 15 minutes |
| AI says the token is missing, or doesn't answer | `HF_TOKEN` not set, or Hugging Face credits used up | Check `.env` (Step 3) and your Hugging Face account |
| Upload fails through the internet address | Very large file or slow connection | Upload big videos at home on `http://localhost:8000` |

## Still stuck?

Look at the black `start.bat` window. It usually prints a message explaining what went wrong. Searching that exact message online often finds the answer.

## Key points

- `502` means StudyVault isn't running, so start `start.bat`.
- A changed home address means run `ipconfig | findstr IPv4`.
- The `start.bat` window shows error messages. Read it first.
