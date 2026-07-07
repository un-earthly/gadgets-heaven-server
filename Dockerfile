# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# figcoms-ecom-engine — server (NestJS) image
# Multi-stage: build with full toolchain, ship a lean production runtime.
# Built standalone from the ./server context (does not require the pnpm
# workspace / root lockfile — deps are resolved from server/package.json).
# ---------------------------------------------------------------------------

# ---- Stage 1: dependencies + build --------------------------------------
FROM node:22-bookworm AS builder
WORKDIR /app

# Native build tools for bcrypt and other node-gyp modules.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Install all deps (incl. dev) from the lockfile for a deterministic,
# version-aligned tree (npm ci). The lockfile pins all @nestjs/* packages to
# the same version — a mismatch between core and microservices breaks the
# RabbitMQ consumer at boot (addRpcTarget error).
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and compile to dist/.
COPY . .
RUN npm run build

# Drop dev dependencies for the runtime image (keeps the compiled bcrypt).
RUN npm prune --omit=dev

# ---- Stage 2: production runtime ----------------------------------------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# curl backs the compose healthcheck.
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["node", "dist/main"]
