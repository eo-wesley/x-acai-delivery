# Dockerfile multi-stage
FROM node:20-alpine AS builder
WORKDIR /app
ARG BACKEND_DIR=apps/backend

# deps/build
COPY ${BACKEND_DIR}/package*.json ./${BACKEND_DIR}/
WORKDIR /app/${BACKEND_DIR}
RUN npm ci

# source codes
WORKDIR /app
COPY ${BACKEND_DIR} ./${BACKEND_DIR}
WORKDIR /app/${BACKEND_DIR}
RUN npm run build

# Stage runtime
FROM node:20-alpine AS runtime
WORKDIR /app
ARG BACKEND_DIR=apps/backend

COPY --from=builder /app/${BACKEND_DIR}/package*.json ./${BACKEND_DIR}/
WORKDIR /app/${BACKEND_DIR}
RUN npm ci --omit=dev

COPY --from=builder /app/${BACKEND_DIR}/dist ./dist

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/server.js"]
