#!/usr/bin/env bash
# Sets up StudyVault on an Ubuntu server (e.g. an Oracle Cloud Always Free VM).
# Run from the project folder:   bash deploy/setup-ubuntu.sh
# Safe to run again after copying a new version of the project.
set -euo pipefail
cd "$(dirname "$0")/.."
APP_DIR="$(pwd)"

echo "== 1/5 Node.js 24"
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 24 ]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
node -v

echo "== 2/5 Packages and build"
npm ci --no-audit --no-fund
npm run build --silent
mkdir -p data

echo "== 3/5 Settings (.env)"
if [ ! -f .env ]; then
  cp .env.example .env
  chmod 600 .env
  echo "Created .env. Add your HF_TOKEN with:  nano .env"
fi
sed -i 's/\r$//' .env                                   # remove Windows line endings, if any
sed -i 's/^COOKIE_SECURE=.*/COOKIE_SECURE=true/' .env   # the site is served over HTTPS (Cloudflare)

echo "== 4/5 Owner account"
node --env-file-if-exists=.env src/server/manage.ts ensure-owner

echo "== 5/5 Background service"
sed "s|__APP_DIR__|$APP_DIR|g; s|__USER__|$USER|g" deploy/studyvault.service \
  | sudo tee /etc/systemd/system/studyvault.service >/dev/null
sudo systemctl daemon-reload
sudo systemctl enable studyvault >/dev/null
sudo systemctl restart studyvault
sleep 2
if curl -fsS http://127.0.0.1:8000/healthz >/dev/null; then
  echo "StudyVault is running on this server at http://127.0.0.1:8000"
  echo "Next: connect a Cloudflare Tunnel to http://localhost:8000 (see README)."
else
  echo "StudyVault did not start. See the log with:  journalctl -u studyvault -n 50"
  exit 1
fi
