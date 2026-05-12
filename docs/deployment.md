# Deployment

## Docker Compose

```bash
cp .env.example .env
docker compose up -d
```

Services:

- `postgres`: primary database
- `redis`: BullMQ queue
- `api`: Fastify API and worker
- `web`: static React app
- `mcp`: optional profile

Persistent volumes:

- `postgres_data`
- `redis_data`
- `artifacts_data`
- `exports_data`

## Reverse Proxies

For Caddy, Traefik, Cloudflare Tunnel, or Nginx Proxy Manager, route:

- public web origin to `web:80`
- API origin/path to `api:4000`

The simplest public setup is a single domain with the reverse proxy forwarding `/api/*` to the API and everything else to the web app. If using separate origins, set `WEB_ORIGIN` to the frontend origin and build the web app with `VITE_API_BASE_URL`.

## Binaries

The API Docker image installs:

- `yt-dlp`
- `ffmpeg`

For MLX Whisper, Apple Silicon hosts usually run outside Linux Docker. Use local development or a host-mounted command strategy, then set:

```bash
TRANSCRIPTION_PROVIDER=mlx-whisper
MLX_WHISPER_BIN=mlx_whisper
MLX_WHISPER_MODEL=mlx-community/whisper-large-v3-turbo
```
