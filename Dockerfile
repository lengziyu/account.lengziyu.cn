FROM node:20-bookworm-slim

WORKDIR /app

ARG PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma
ENV NEXT_TELEMETRY_DISABLED=1
ENV PRISMA_ENGINES_MIRROR=${PRISMA_ENGINES_MIRROR}

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

COPY . .

RUN pnpm install --no-frozen-lockfile
RUN pnpm prisma generate

EXPOSE 3000

CMD ["sh", "-c", "pnpm prisma generate && pnpm prisma db push && pnpm exec next dev -H 0.0.0.0 -p 3000"]
