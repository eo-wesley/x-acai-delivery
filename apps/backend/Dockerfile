# ============================
# Backend Dockerfile (Production)
# Multi-stage: build → slim runtime
# ============================

FROM node:20-alpine AS builder
WORKDIR /app/backend

COPY package*.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run build

# --- Runtime ---
FROM node:20-alpine AS runtime
WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=3000

# Install only production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled dist
COPY --from=builder /app/backend/dist ./dist

# Create data directory for SQLite
RUN mkdir -p /data

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
