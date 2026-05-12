# Architecture

Vidravault is organized as a TypeScript monorepo:

```text
apps/
  api/    Fastify HTTP API and BullMQ worker
  web/    React/Vite operator UI
  mcp/    Optional stdio MCP server
packages/
  config/     environment parsing
  db/         Prisma schema/client
  shared/     Zod schemas and shared types
  pipeline/   provider interfaces and deterministic processors
  retrieval/  retrieval service over PostgreSQL full-text search
  exporters/  Markdown exporter and future wiki/export interfaces
```

The API owns orchestration. The packages own reusable contracts and implementations:

- `VideoMetadataProvider`
- `CaptionProvider`
- `AudioExtractor`
- `TranscriptionProvider`
- `TranscriptCleaner`
- `Chunker`
- `NoteGenerator`
- `SearchIndexer`
- `RetrievalService`
- `WikiExporter`

The current V1 search path is PostgreSQL full-text over transcript and note chunks. The `SearchIndex` table and `embeddingId` fields prepare the model for pgvector, Qdrant, Meilisearch, or Typesense later.

The MCP app never reads the database directly. It calls the API retrieval endpoints with a bearer token.
