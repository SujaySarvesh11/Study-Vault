# Step 3: Turn On the AI Assistant

The **✦ Ask my notes** assistant uses **Hugging Face**, a free online AI service. You need a free account and a **token**, a secret code that lets StudyVault use your account. Everything else in StudyVault works without this step.

## Create a Hugging Face token

1. Go to <https://huggingface.co> and click **Sign Up**. Create a free account and confirm your email.
2. Click your profile picture (top right) → **Settings** → **Access Tokens**.
3. Click **Create new token**.
4. Choose **Fine-grained**.
5. Give it a name, such as `StudyVault`.
6. Under **Inference**, tick **Make calls to Inference Providers**. Leave everything else unticked.
7. Click **Create token**.
8. **Copy the token.** It starts with `hf_`. You can only see it once.

> **Keep the token secret.** Anyone with it can use your Hugging Face credits. Never share it or post it online.

## Put the token into StudyVault's settings

1. Open Command Prompt and open the settings file in Notepad:

```cmd
cd /d C:\StudyVault
notepad .env
```

2. Find the line that says:

```text
HF_TOKEN=
```

3. Paste your token straight after the `=` sign, with no spaces:

```text
HF_TOKEN=hf_yourLongSecretCodeHere
```

4. Save (**Ctrl + S**) and close Notepad.
5. **Restart StudyVault**: close the black `start.bat` window and double-click `start.bat` again.

## Try it

Add at least one page of notes first (see the next lesson). Then click **✦ Ask my notes** at the bottom right and ask a question about it. The answer shows numbered sources, such as **[1]**. Click one to jump to that page.

## Optional: a smarter AI model

In `.env`, the `CHAT_MODEL` line chooses the AI model:

| Setting | Effect |
|---|---|
| `CHAT_MODEL=meta-llama/Llama-3.1-8B-Instruct` | Default. Fast, and uses few credits |
| `CHAT_MODEL=Qwen/Qwen2.5-72B-Instruct` | Better answers, uses more credits |
| `CHAT_MODEL=meta-llama/Llama-3.3-70B-Instruct` | Better answers, uses more credits |

The free Hugging Face plan includes a small amount of monthly credit. Restart `start.bat` after changing it.

## Optional: automatic transcripts for videos and audio

Set `TRANSCRIBE_MEDIA=true` in `.env` and restart. Uploaded lectures are then turned into text automatically, so you can search them and ask the AI about them. This uses more credits.

## Key points

- Create a free Hugging Face **fine-grained token** with **Make calls to Inference Providers** ticked.
- Paste it into `.env` as `HF_TOKEN=hf_...` and restart `start.bat`.
- Keep the token secret, like a password.
