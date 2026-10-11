FROM oven/bun:1-alpine@sha256:629e17411f1f129dbec3af78d5af9c9f2a937435c80349437206c6b0b7422373 AS builder

WORKDIR /app

COPY package.json bun.lock ./
COPY nitro.config.ts ./

ENV NITRO_PRESET=bun
ENV NITRO_PUBLIC_SITE_URL=$SITE_URL

RUN bun install --frozen-lockfile

COPY . .

RUN bun run build

FROM oven/bun:1-alpine@sha256:629e17411f1f129dbec3af78d5af9c9f2a937435c80349437206c6b0b7422373 AS runner

ARG VERSION
ARG BUILD_TIME

WORKDIR /app

COPY --from=builder /app/.output ./.output
# Copy binary databases to the runtime location expected by .output/server/_libs/geoip-lite.mjs
COPY --from=builder /app/node_modules/geoip-lite/data/ ./.output/server/data/

ENV NODE_ENV=production
ENV NITRO_APP_VERSION=$VERSION
ENV NITRO_APP_BUILD_TIME=$BUILD_TIME

EXPOSE 3000

ENTRYPOINT ["bun", ".output/server/index.mjs"]