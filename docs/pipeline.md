# Pipeline

The pipeline is persisted in three layers:

- `PipelineRun`: one requested ingestion or retry run
- `PipelineStep`: per-step status, attempts, timing, and error
- `PipelineEvent`: user-visible technical events

Steps are ordered and retryable:

1. `CAPTURE`
2. `CAPTIONS`
3. `AUDIO`
4. `TRANSCRIPTION`
5. `CLEANING`
6. `CHUNKING`
7. `FRAMES`
8. `NOTES`
9. `INDEXING`

Retrying a step creates a new run and skips earlier steps. Later steps are regenerated where appropriate. Chunking deletes and recreates transcript chunks for idempotency. Notes are regenerated deterministically from the cleaned transcript.

Artifacts are stored under:

```text
ARTIFACTS_DIR/<videoId>/
  metadata.json
  captions/
  audio/
  transcripts/raw.txt
  transcripts/clean.txt
  frames/
  notes/note.md
```

The database stores local artifact paths, but the API only exposes artifact ids and download URLs.

## Adding Providers

Implement the relevant interface in `packages/pipeline/src/types.ts`, then wire it in `apps/api/src/config/providers.ts`.

Useful extension points:

- new video sources beyond YouTube
- whisper.cpp or faster-whisper transcription
- LLM transcript cleaner
- LLM note generator
- smarter frame extraction
