# MCP

The MCP server is implemented as `apps/mcp` and disabled by default.

It exposes tools:

- `search_videos`
- `get_video`
- `get_transcript`
- `get_notes`
- `find_commands`
- `find_sources`

The MCP layer calls API retrieval endpoints. It does not query the database directly.

Enable locally:

```bash
MCP_ENABLED=true
MCP_API_BASE_URL=http://localhost:4000
MCP_API_TOKEN="long random token"
pnpm --filter @vidravault/mcp dev
```

Set the same `MCP_API_TOKEN` on the API.

Security notes:

- prefer stdio/local usage
- do not expose MCP unauthenticated over the internet
- rotate `MCP_API_TOKEN` regularly
- keep raw filesystem paths out of tool responses
- apply reverse-proxy access controls for remote usage
