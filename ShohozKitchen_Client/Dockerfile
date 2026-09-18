# syntax=docker/dockerfile:1

# ── Dependencies: install everything needed to build ──────────────────
FROM node:20-alpine AS deps
WORKDIR /app
ENV NODE_ENV=development
COPY package*.json ./
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm ci --include=dev    # force devDependencies (typescript etc.) even if NODE_ENV=production is injected

# ── Build stage: compile the Next.js standalone output ────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are inlined at build time, so they must be passed
# as build args in Coolify (Build Variables), not just runtime env vars.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build          # next build -> .next/standalone (output: "standalone")

# ── Runtime stage: minimal image with just the standalone server ──────
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Standalone build already bundles a trimmed node_modules + server.js.
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
