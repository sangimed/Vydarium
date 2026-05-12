FROM node:24-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml turbo.json tsconfig.base.json eslint.config.js .prettierrc ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @vidravault/shared build
RUN pnpm --filter @vidravault/config build
RUN pnpm --filter @vidravault/mcp build

CMD ["pnpm", "--filter", "@vidravault/mcp", "start"]
