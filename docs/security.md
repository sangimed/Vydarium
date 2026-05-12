# Security

Vidravault is designed for single-user or small trusted homelab use in V1.

Implemented safeguards:

- authentication enabled by default
- HTTP-only session cookie
- strong `JWT_SECRET` validation in production
- Fastify Helmet security headers
- restrictive CORS through `WEB_ORIGIN`
- global rate limiting
- additional retrieval rate limiting
- Zod validation for public inputs
- command execution with `spawn` and argument arrays, never shell interpolation
- YouTube URL validation for ingestion
- artifact streaming by database id, not raw filesystem paths
- redacted logs for cookies, bearer tokens, passwords, and tokens
- MCP disabled unless `MCP_ENABLED=true`
- MCP API access protected by bearer token

Production checklist:

```bash
JWT_SECRET="$(openssl rand -base64 48)"
ADMIN_PASSWORD="long unique password"
COOKIE_SECURE=true
WEB_ORIGIN=https://your-domain.example
PUBLIC_APP_URL=https://your-domain.example
```

When exposing over Cloudflare Tunnel, Caddy, Traefik, Nginx Proxy Manager, or another reverse proxy:

- terminate TLS at the proxy
- set `COOKIE_SECURE=true`
- set `WEB_ORIGIN` to the public web origin
- do not expose Redis or PostgreSQL publicly
- do not expose MCP remotely without an additional access layer
- rotate `MCP_API_TOKEN` if it was ever logged or shared

OIDC via authentik, Authelia, Keycloak, or a forward-auth proxy is a planned hardening path. The current app can sit behind those tools today, while native OIDC can be added later without changing the pipeline model.
