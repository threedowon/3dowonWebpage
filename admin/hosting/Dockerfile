FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY admin ./admin
RUN chmod +x /app/admin/hosting/git-askpass.sh && mkdir -p /data/repo /home/node/.3dowon-admin && chown -R node:node /data /home/node/.3dowon-admin
USER node
ENV NODE_ENV=production ADMIN_MODE=online ADMIN_REPO_DIR=/data/repo GIT_ASKPASS=/app/admin/hosting/git-askpass.sh GIT_TERMINAL_PROMPT=0
EXPOSE 4848
CMD ["node", "admin/hosting/start.mjs"]
