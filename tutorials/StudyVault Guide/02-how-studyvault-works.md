# How StudyVault Works Behind the Scenes

You don't need to understand this to use StudyVault, but it makes the setup steps make sense. Think of StudyVault as a **small restaurant running in your house**.

## The parts, explained like a restaurant

| Part | Restaurant comparison | What it really is |
|---|---|---|
| **Your computer** | The building | The Windows PC or laptop StudyVault runs on |
| **Node.js** | The kitchen equipment | A free program that lets your computer run StudyVault's code |
| **The StudyVault server** | The chef | The program that prepares each page and sends it to whoever asks. It runs inside the black `start.bat` window |
| **The database** | The pantry | One file, `data/studyvault.db`, holding your pages, accounts and settings |
| **The `data/files` folder** | The storeroom | Where your uploaded files (PDFs, videos and so on) are kept |
| **Your web browser** | The customer | Chrome, Edge, Safari: whatever you use to look at the site |
| **Hugging Face** | A specialist you phone for help | A free online AI service that writes the assistant's answers |
| **Tailscale Funnel** | A delivery service | A free service that safely brings visitors from the internet to your computer |

## How a page reaches your screen

1. You type the website address into your browser.
2. The browser sends a request to the StudyVault server.
3. The server reads the page from the database.
4. The server sends the page back, and your browser shows it.

When you **ask the AI** a question:

1. StudyVault searches your pages for the passages that best match your question.
2. It sends **only those passages** and your question to Hugging Face.
3. Hugging Face's AI writes an answer using only those passages.
4. StudyVault shows the answer with numbered sources, like **[1]**, which you can click.

## Words you will see in this guide

| Word | Meaning |
|---|---|
| **Server** | A program that waits for requests and sends back web pages. Here, StudyVault itself |
| **Command Prompt** | A black Windows window where you type commands. Open it by pressing the Windows key, typing `cmd` and pressing Enter |
| **Command** | A line of text you type into Command Prompt and run with Enter |
| **localhost** | A special address meaning "this same computer" |
| **Port** | A numbered door on your computer. StudyVault uses door **8000** |
| **IP address** | Your computer's number on a network, like `192.168.1.100`. Your router gives it out and it can change |
| **Wi-Fi network / LAN** | The devices connected to your home router |
| **HTTP** | The normal way web pages travel. **Not encrypted**: anyone on the same network could read it |
| **HTTPS** | HTTP with **encryption** (the padlock in the address bar). Needed when using the internet |
| **Tunnel** | A safe, encrypted connection from your computer out to a service (Tailscale) that lets the internet reach your site without changing router settings |
| **Firewall** | Windows' security guard that decides which outside connections are allowed in |
| **`.env` file** | StudyVault's settings file. It's plain text you can edit in Notepad |
| **Token** | A long secret code that acts like a password for a service, such as Hugging Face |

## The three addresses of StudyVault

Once fully set up, StudyVault can be opened at three addresses:

| Where you are | Address looks like | Uses |
|---|---|---|
| On the computer running it | `http://localhost:8000` | HTTP |
| Another device on your home Wi-Fi | `http://192.168.1.100:8000` (your number will differ) | HTTP |
| Anywhere in the world | `https://yourname.tailXXXX.ts.net` | HTTPS |

## Key points

- The **server** (the black `start.bat` window) must be running, or nobody can open the site.
- Everything you store is in the **`data`** folder on your computer.
- Only the passages needed for an AI answer are sent to Hugging Face.
- HTTP is fine at home. Over the internet, StudyVault uses **HTTPS**.
