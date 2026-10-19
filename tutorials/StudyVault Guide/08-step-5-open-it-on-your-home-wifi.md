# Step 5: Open It on Your Home Wi-Fi

So far StudyVault works only on the computer running it. This step lets **phones, tablets and other computers on your home Wi-Fi** open it too.

There are three parts: tell StudyVault to accept other devices, tell Windows your Wi-Fi is a trusted home network, and let StudyVault's door (port 8000) through the firewall.

## Part A: Let StudyVault accept other devices

1. Open the settings file:

```cmd
cd /d C:\StudyVault
notepad .env
```

2. Find this line:

```text
HOST=127.0.0.1
```

3. Change it to:

```text
HOST=0.0.0.0
```

`127.0.0.1` means "only this computer". `0.0.0.0` means "any network this computer is on".

4. Check that `COOKIE_SECURE=false` is set. That's needed for plain `http://` addresses at home, and `start.bat` sets it for you.
5. Save, close Notepad, and **restart `start.bat`**.

## Part B: Mark your home Wi-Fi as Private

Windows treats unknown networks as **Public** and blocks other devices from connecting.

1. Open **Settings → Network & internet → Wi-Fi**.
2. Click your Wi-Fi's name (the **Properties** of the connected network).
3. Under **Network profile type**, choose **Private network**.

> Only do this for your **own home** Wi-Fi. Leave café, college and hotel Wi-Fi as Public.

## Part C: Open port 8000 in the firewall

Open Command Prompt **as administrator** (Windows key → type `cmd` → **Run as administrator**) and run this as one line:

```cmd
netsh advfirewall firewall add rule name="StudyVault (port 8000, home network)" dir=in action=allow protocol=TCP localport=8000 profile=private remoteip=localsubnet
```

| Part | Meaning |
|---|---|
| `netsh advfirewall firewall add rule` | Add a new Windows Firewall rule |
| `name="..."` | A name so you can find or remove it later |
| `dir=in action=allow` | Allow incoming connections |
| `protocol=TCP localport=8000` | Only to StudyVault's door, number 8000 |
| `profile=private` | Only while on a **Private** network, never on public Wi-Fi |
| `remoteip=localsubnet` | Only from devices on the same home network |

You should see **Ok.**

## Find your computer's home address

```cmd
ipconfig | findstr IPv4
```

You'll see something like:

```text
IPv4 Address. . . . . . . . . . . : 192.168.1.100
```

The `start.bat` window also prints it as **Other devices on your network: http://192.168.1.100:8000**.

## Try it from your phone

1. Connect your phone to the **same Wi-Fi**.
2. Open the browser and type `http://192.168.1.100:8000`, using **your** number from above.
3. Sign in.

## Good to know

- **The number can change.** Your router may give your computer a new number, for example after a restart. If the address stops working, run `ipconfig | findstr IPv4` again. To stop it changing, look for **DHCP reservation** in your router's settings.
- **Home addresses use HTTP (not encrypted).** That's acceptable on your own Wi-Fi, but don't use it on networks you don't trust. The next step gives you a secure HTTPS address that works everywhere.

## Key points

- Set `HOST=0.0.0.0` in `.env` and restart.
- Mark your home Wi-Fi **Private** and add the firewall rule with `netsh`.
- Open `http://<your-IP>:8000` from any device on the same Wi-Fi.
