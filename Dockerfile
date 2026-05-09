FROM node:20-bookworm-slim

WORKDIR /app

ARG PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma
ENV NEXT_TELEMETRY_DISABLED=1
ENV PRISMA_ENGINES_MIRROR=${PRISMA_ENGINES_MIRROR}
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN sed -i 's|deb.debian.org|mirrors.aliyun.com|g; s|security.debian.org|mirrors.aliyun.com/debian-security|g' /etc/apt/sources.list.d/debian.sources \
  && apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm prisma generate
RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
