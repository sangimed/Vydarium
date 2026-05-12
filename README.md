# Vidravault

Vidravault is a self-hosted video intelligence pipeline. It turns useful YouTube videos into a searchable, citable personal knowledge base: metadata, captions, audio fallback, local transcription provider interface, cleaned transcripts, deterministic chunks, Markdown notes, artifacts, and retrieval APIs.

The core product is the ingestion, indexing, citation, and retrieval layer. Markdown, Obsidian, Logseq, MkDocs, Docusaurus, Notion, and wiki tools are export surfaces.

## Stack

- Monorepo: pnpm workspaces + Turborepo
- API: Fastify, Zod, BullMQ, Redis, Prisma, PostgreSQL
- Web: React, Vite, Tailwind CSS, TanStack Query, React Hook Form, Zod
- Storage: local artifact directory by default
- Search V1: PostgreSQL full-text search over chunks
- Auth V1: single-user email/password session auth, API token model prepared, MCP token support
- MCP: separate stdio app, disabled by default, calls API retrieval endpoints

## Local Development

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d
pnpm install
pnpm db:generate
pnpm --filter @vidravault/db db:dev
pnpm dev
```

Open:

- Web: http://localhost:5173
- API health: http://localhost:4000/health

Run the optional MCP server separately:

```bash
MCP_ENABLED=true pnpm dev:mcp
```

Default development credentials come from `.env`. Change `ADMIN_PASSWORD` before exposing the service.

## Docker

```bash
docker compose up -d
```

For a real homelab deployment, set at least:

```bash
JWT_SECRET="$(openssl rand -base64 48)"
ADMIN_EMAIL="you@example.com"
ADMIN_PASSWORD="a-long-unique-password"
COOKIE_SECURE=true
```

## Pipeline

The ingestion pipeline is split into retryable steps:

1. `CAPTURE`: yt-dlp metadata
2. `CAPTIONS`: manual captions first, then auto captions
3. `AUDIO`: yt-dlp audio extraction when captions are not usable
4. `TRANSCRIPTION`: configurable provider, mock by default, MLX Whisper available
5. `CLEANING`: deterministic text normalization while preserving timestamps
6. `CHUNKING`: idempotent transcript chunks with source URLs and timestamps
7. `FRAMES`: thumbnail/frame artifact extraction scaffold
8. `NOTES`: deterministic Markdown note generation
9. `INDEXING`: PostgreSQL full-text searchable records

Each run and step stores status, attempts, timing, error, and events.

## Key Commands

```bash
pnpm dev
pnpm build
pnpm test
pnpm lint
pnpm typecheck
pnpm db:generate
pnpm --filter @vidravault/db db:dev
```

## Documentation

- [Architecture](docs/architecture.md)
- [Security](docs/security.md)
- [Deployment](docs/deployment.md)
- [Pipeline](docs/pipeline.md)
- [Retrieval](docs/retrieval.md)
- [MCP](docs/mcp.md)
- [Development](docs/development.md)
