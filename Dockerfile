FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM iiidev/iii:0.10.0 AS iii-source

FROM oven/bun:1 AS runner

WORKDIR /app

COPY --from=iii-source /app/iii /usr/local/bin/iii

RUN chmod +x /usr/local/bin/iii

COPY --from=builder /app/package.json .
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY iii-config-production.yaml .
COPY public ./public
COPY email ./email

ARG VERSION
ARG BUILD_TIME

ENV NODE_ENV=production
ENV MOTIA_APP_VERSION=$VERSION
ENV MOTIA_APP_BUILD_TIME=$BUILD_TIME

EXPOSE 3111 3112 49134

CMD ["iii", "--config", "iii-config-production.yaml"]