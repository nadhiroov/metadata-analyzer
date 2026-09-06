# syntax=docker/dockerfile:1

FROM oven/bun:1 AS base
WORKDIR /app

# --- deps: install dependencies (cached separately from source changes) ---
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# --- build: compile the client bundle (Tailwind, React, Leaflet assets) ---
FROM deps AS build
COPY . .
RUN bun run build

# --- runtime: minimal image with ExifTool installed alongside Bun ---
FROM base AS runtime
RUN apt-get update \
  && apt-get install -y --no-install-recommends libimage-exiftool-perl \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV UPLOAD_DIR=/app/uploads

COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock ./
COPY --from=build /app/dist ./dist
COPY src ./src

RUN mkdir -p /app/uploads && useradd --system --create-home appuser \
  && chown -R appuser:appuser /app
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s \
  CMD bun -e "fetch('http://localhost:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["bun", "run", "start"]
