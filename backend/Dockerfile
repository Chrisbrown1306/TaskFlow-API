# ─────────────────────────────────────────────────────────────────
# TaskFlow API  –  Dockerfile
# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# ── Dependencies ──────────────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production

# ── Runtime ───────────────────────────────────────────────────────
FROM base AS runtime

ENV NODE_ENV=production
ENV PORT=5000

# Copy deps and source
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Create data directory for SQLite
RUN mkdir -p /data && chown -R node:node /data /app

# Run as non-root user
USER node

EXPOSE 5000

# Seed + start
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "node src/utils/seed.js && node src/app.js"]
