# Step 6: Open It From Anywhere With a Named HTTPS Address

This step gives StudyVault a **permanent, secure internet address**, such as `https://studyvault.tail1a2b3.ts.net`. It works from mobile data, college or any Wi-Fi in the world.

It uses **Tailscale Funnel**, which is free. Tailscale makes an encrypted connection *out* from your computer, so you don't change any router settings, and your home's internet address stays hidden.

## Part A: Install Tailscale

Open Command Prompt and run:

```cmd
winget install --id Tailscale.Tailscale -e --source winget --accept-source-agreements --accept-package-agreements
```

Click **Yes** if Windows asks for permission. Wait for **Successfully installed**, then **close Command Prompt and open a new one**.

Tailscale runs quietly in the background and starts with Windows.

## Part B: Sign in and choose your name

Choose a name for your site. It becomes the first part of the address. Use lowercase letters, numbers and hyphens only, for example `studyvault` or `priya-notes`. Then run (change `studyvault` to your name):

```cmd
tailscale up --hostname=studyvault
```

| Part | Meaning |
|---|---|
| `tailscale up` | Connect this computer to Tailscale |
| `--hostname=studyvault` | Give this computer the name `studyvault` |

The command prints a link like `https://login.tailscale.com/a/...`.

1. Open the link (Ctrl + click it, or copy it into your browser).
2. Sign in with Google, Microsoft or GitHub. This creates your free Tailscale account.
3. Approve the device.

Check it worked:

```cmd
tailscale status
```

You should see your computer's name in the list.

## Part C: Publish StudyVault with Funnel

Make sure StudyVault is running (`start.bat` window open), then run:

```cmd
tailscale funnel --bg 8000
```

| Part | Meaning |
|---|---|
| `tailscale funnel` | Make something on this computer reachable from the internet over HTTPS |
| `--bg` | Keep it on in the background, even after closing the window or restarting |
| `8000` | Publish StudyVault's door, port 8000 |

**The first time**, it says **Funnel is not enabled on your tailnet** and shows a link. Open the link, click to **enable Funnel** (and HTTPS, if asked), and it then finishes by itself.

When it works, you'll see:

```text
Available on the internet:

https://studyvault.tail1a2b3.ts.net/
|-- proxy http://127.0.0.1:8000
```

**That's your permanent address.** The `tail1a2b3.ts.net` ending is fixed for your Tailscale account and can't be changed on the free plan. A fully custom address, such as `notes.yourname.com`, needs a domain name you buy.

## Part D: Test it

On your phone, **turn Wi-Fi off** (so you're on mobile data), open the address, and sign in. The padlock in the address bar means the connection is encrypted with HTTPS.

## Why HTTPS matters here

| | HTTP | HTTPS |
|---|---|---|
| Starts with | `http://` | `https://` |
| Encrypted | No: anyone in between can read it, including your password | Yes |
| Proves the site is real | No | Yes, with a certificate |
| Browser shows | "Not secure" | A padlock |
| StudyVault uses it for | Your home Wi-Fi | The internet address |

StudyVault notices when a visitor came through the HTTPS address and makes the sign-in cookie HTTPS-only for them. Nothing in `.env` needs changing.

## Turning it off and on

| Command | What it does |
|---|---|
| `tailscale funnel status` | Shows what's published and the address |
| `tailscale funnel --https=443 off` | Stops publishing to the internet (home Wi-Fi still works) |
| `tailscale funnel --bg 8000` | Publishes again, at the same address |

## Key points

- Install Tailscale, then run `tailscale up --hostname=<your-name>` and sign in.
- Run `tailscale funnel --bg 8000` and enable Funnel the first time.
- Your address is `https://<your-name>.<your-tailnet>.ts.net` and stays the same.
- Anyone on the internet can now see the sign-in page, so **use a strong password**.
