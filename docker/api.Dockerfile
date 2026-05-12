FROM node:24-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml turbo.json tsconfig.base.json eslint.config.js .prettierrc ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
RUN pnpm --filter @vidravault/db db:generate
RUN pnpm --filter @vidravault/db build
RUN pnpm --filter @vidravault/config build
RUN pnpm --filter @vidravault/shared build
RUN pnpm --filter @vidravault/pipeline build
RUN pnpm --filter @vidravault/retrieval build
RUN pnpm --filter @vidravault/exporters build
RUN pnpm --filter @vidravault/api build

FROM base AS runner
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg python3 python3-pip ca-certificates \
  && python3 -m pip install --break-system-packages yt-dlp \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app /app
EXPOSE 4000
CMD ["sh", "-c", "pnpm --filter @vidravault/db db:migrate && pnpm --filter @vidravault/api start"]
