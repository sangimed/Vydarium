import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { loadConfig } from "@vidravault/config";

const config = loadConfig();

if (!config.MCP_ENABLED) {
  console.error("Vidravault MCP is disabled. Set MCP_ENABLED=true to start it.");
  process.exit(1);
}

const server = new Server(
  {
    name: "vidravault",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

const tools: Tool[] = [
  {
    name: "search_videos",
    description: "Search videos, transcripts, notes, and chunks.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        language: { type: "string" },
        limit: { type: "number" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_video",
    description: "Return a complete Vidravault video knowledge record.",
    inputSchema: {
      type: "object",
      properties: {
        videoId: { type: "string" },
      },
      required: ["videoId"],
    },
  },
  {
    name: "get_transcript",
    description: "Return transcript chunks, optionally bounded by timestamps.",
    inputSchema: {
      type: "object",
      properties: {
        videoId: { type: "string" },
        startTime: { type: "number" },
        endTime: { type: "number" },
      },
      required: ["videoId"],
    },
  },
  {
    name: "get_notes",
    description: "Return generated notes for a video.",
    inputSchema: {
      type: "object",
      properties: {
        videoId: { type: "string" },
      },
      required: ["videoId"],
    },
  },
  {
    name: "find_commands",
    description: "Find commands mentioned in videos.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "find_sources",
    description: "Find relevant videos and timestamps for a topic.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string" },
        limit: { type: "number" },
      },
      required: ["topic"],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, () => ({ tools }));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const result = await callTool(request.params.name, request.params.arguments ?? {});
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);

async function callTool(name: string, args: unknown): Promise<unknown> {
  switch (name) {
    case "search_videos": {
      const input = z
        .object({
          query: z.string().min(1),
          tags: z.array(z.string()).optional(),
          language: z.string().optional(),
          limit: z.number().min(1).max(50).default(10),
        })
        .parse(args);
      return post("/api/retrieval/search", {
        query: input.query,
        filters: {
          tags: input.tags,
          language: input.language,
        },
        limit: input.limit,
      });
    }
    case "get_video": {
      const input = z.object({ videoId: z.string() }).parse(args);
      return get(`/api/retrieval/videos/${input.videoId}`);
    }
    case "get_transcript": {
      const input = z
        .object({
          videoId: z.string(),
          startTime: z.number().optional(),
          endTime: z.number().optional(),
        })
        .parse(args);
      const params = new URLSearchParams();
      if (input.startTime !== undefined) params.set("startTime", String(input.startTime));
      if (input.endTime !== undefined) params.set("endTime", String(input.endTime));
      return get(`/api/retrieval/videos/${input.videoId}/transcript?${params.toString()}`);
    }
    case "get_notes": {
      const input = z.object({ videoId: z.string() }).parse(args);
      return get(`/api/retrieval/videos/${input.videoId}/notes`);
    }
    case "find_commands": {
      const input = z
        .object({
          query: z.string().optional(),
          tags: z.array(z.string()).optional(),
          limit: z.number().min(1).max(50).default(10),
        })
        .parse(args);
      return post("/api/retrieval/commands", {
        query: input.query?.trim() || "command",
        filters: {
          tags: input.tags,
        },
        limit: input.limit,
      });
    }
    case "find_sources": {
      const input = z.object({ topic: z.string().min(1), limit: z.number().min(1).max(50).default(10) }).parse(args);
      return post("/api/retrieval/sources", input);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function get(path: string): Promise<unknown> {
  return request(path, { method: "GET" });
}

async function post(path: string, body: unknown): Promise<unknown> {
  return request(path, { method: "POST", body: JSON.stringify(body) });
}

async function request(path: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(`${config.MCP_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.MCP_API_TOKEN}`,
    },
  });

  const body: unknown = await response.json();
  if (!response.ok) {
    throw new Error(JSON.stringify(body));
  }

  return body;
}
