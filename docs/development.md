# Development

Install and start dependencies:

```bash
pnpm install
docker compose -f docker-compose.dev.yml up -d
pnpm db:generate
pnpm --filter @vidravault/db db:dev
pnpm dev
```

Run checks:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Package responsibilities:

- `packages/shared`: request schemas, response types, timestamp helpers
- `packages/config`: environment validation
- `packages/db`: Prisma schema and generated client
- `packages/pipeline`: external command wrappers and deterministic processing
- `packages/retrieval`: search and record retrieval
- `packages/exporters`: Markdown/wiki export interfaces

Use `spawn` with argument arrays for external commands. Do not build shell strings from URLs or user input.
