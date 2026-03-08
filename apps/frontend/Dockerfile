# ============================
# Frontend Dockerfile (Production)
# Multi-stage: build → standalone Next.js
# ============================

FROM node:20-alpine AS builder
WORKDIR /app/frontend

COPY package*.json ./
RUN npm ci --include=dev

COPY . .

# Build Next.js in standalone output mode
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Runtime ---
FROM node:20-alpine AS runtime
WORKDIR /app/frontend

ENV NODE_ENV=production
ENV PORT=3001
ENV NEXT_TELEMETRY_DISABLED=1

# Copy Next.js standalone server and static assets
COPY --from=builder /app/frontend/public ./public
COPY --from=builder /app/frontend/.next/standalone ./
COPY --from=builder /app/frontend/.next/static ./.next/static

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost:3001 || exit 1

CMD ["node", "server.js"]
