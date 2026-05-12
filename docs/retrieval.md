# Retrieval

V1 retrieval searches transcript and note chunks with PostgreSQL full-text search.

Endpoints:

- `POST /api/retrieval/search`
- `GET /api/retrieval/videos/:id`
- `GET /api/retrieval/videos/:id/transcript`
- `GET /api/retrieval/videos/:id/notes`
- `POST /api/retrieval/commands`
- `POST /api/retrieval/sources`

Search results include:

- video title
- source URL
- channel
- excerpt
- timestamp
- chunk type
- score
- tags

Example:

```json
{
  "query": "How to use MLX Whisper locally?",
  "filters": {
    "tags": ["whisper", "mlx"]
  },
  "limit": 10
}
```

Chunks are deterministic and include `embeddingId`, so a later vector backend can be added without changing the ingestion contract.

Vector-search upgrade path:

1. add an embedding provider package
2. add pgvector/Qdrant/Typesense adapter implementing `SearchIndexer`
3. generate embeddings from transcript and note chunks
4. combine lexical and vector scores in `RetrievalService`
