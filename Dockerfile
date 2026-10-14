FROM node:24-slim

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY src ./src
COPY scripts ./scripts
COPY static ./static
RUN npm run build && npm prune --omit=dev

# Run as an unprivileged user; only /app/data is writable.
RUN mkdir -p /app/data && chown node /app/data
USER node

ENV HOST=0.0.0.0 PORT=8000
EXPOSE 8000
HEALTHCHECK CMD node -e "fetch('http://127.0.0.1:8000/healthz').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "src/server/main.ts"]
