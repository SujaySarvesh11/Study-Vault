# Step 7: Keep It Running

StudyVault only works while the computer is **on, awake, connected to the internet, and the `start.bat` window is open**. This step makes that easy.

## Why a sleeping computer can't serve the site

When a computer sleeps, its processor and network stop. StudyVault and Tailscale freeze, so visitors see an error, usually **502**. No setting gets around this, so the fix is to stop the computer sleeping while it's plugged in.

## Never sleep while plugged in (screen still turns off)

Open Command Prompt **as administrator** and run these five commands, one at a time:

```cmd
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
powercfg /change monitor-timeout-ac 5
powercfg /setacvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION 0
powercfg /setactive SCHEME_CURRENT
```

| Command | What it does |
|---|---|
| `standby-timeout-ac 0` | Never sleep while plugged in (`0` means never) |
| `hibernate-timeout-ac 0` | Never hibernate while plugged in |
| `monitor-timeout-ac 5` | Turn the screen off after 5 minutes to save power. The site keeps working |
| `SUB_BUTTONS LIDACTION 0` | Closing a laptop's lid does nothing while plugged in |
| `setactive SCHEME_CURRENT` | Applies the changes |

On battery, the computer still sleeps as usual.

## Start StudyVault automatically when Windows starts

1. Press **Windows key + R**, type `shell:startup` and press Enter. A folder opens.
2. In another File Explorer window, open `C:\StudyVault`.
3. **Right-click `start.bat`**, drag it into the Startup folder, let go, and choose **Create shortcuts here**.

Now StudyVault starts every time you sign in to Windows. A browser tab will also open each time. Close it if you don't need it.

Tailscale and Funnel already start by themselves, so after a restart the internet address works again without doing anything.

## If you want it online even when your computer is off

A sleeping or switched-off computer can't serve the site. For true 24/7 access, StudyVault must run on a computer that is always on:

| Option | Cost | Notes |
|---|---|---|
| **Oracle Cloud "Always Free" server** | Free | A computer in the cloud. The project includes a setup script, `deploy/setup-ubuntu.sh`. Needs a credit card for identity check. More technical |
| **An old PC or a Raspberry Pi at home** | Low | Stays on all the time and uses little power |

With either option, copy your `data` folder to the new machine so your notes come with you.

## Key points

- A sleeping computer can't serve the site.
- Use `powercfg` to stop sleep while plugged in. The screen can still turn off.
- Put a shortcut to `start.bat` in `shell:startup` so StudyVault starts automatically.
