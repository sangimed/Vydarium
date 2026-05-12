import { describe, expect, it } from "vitest";
import { buildServer } from "../src/server.js";
import type { AppConfig } from "@vidravault/config";
import type { PrismaClient } from "@vidravault/db";

const testConfig: AppConfig = {
  NODE_ENV: "test",
  APP_NAME: "Vidravault",
  PUBLIC_APP_URL: "http://localhost:5173",
  API_BASE_URL: "http://localhost:4000",
  DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  REDIS_URL: "redis://localhost:6379",
  API_HOST: "127.0.0.1",
  API_PORT: 0,
  WEB_ORIGIN: "http://localhost:5173",
  JWT_SECRET: "test-secret-that-is-long-enough-for-validation",
  COOKIE_SECURE: false,
  REQUIRE_AUTH: true,
  ADMIN_EMAIL: "admin@example.com",
  ADMIN_PASSWORD: "change-me-now",
  API_RATE_LIMIT_MAX: 120,
  RETRIEVAL_RATE_LIMIT_MAX: 60,
  MCP_RATE_LIMIT_MAX: 30,
  ARTIFACTS_DIR: "./artifacts-test",
  EXPORTS_DIR: "./exports-test",
  MAX_VIDEO_URL_LENGTH: 2048,
  YTDLP_BIN: "yt-dlp",
  FFMPEG_BIN: "ffmpeg",
  COMMAND_TIMEOUT_SECONDS: 10,
  CAPTION_LANGUAGES: ["en", "fr"],
  TRANSCRIPTION_PROVIDER: "mock",
  MLX_WHISPER_BIN: "mlx_whisper",
  MLX_WHISPER_MODEL: "mlx-community/whisper-large-v3-turbo",
  QUEUE_WORKER_ENABLED: false,
  PIPELINE_CONCURRENCY: 1,
  FRAME_INTERVAL_SECONDS: 0,
  MCP_ENABLED: false,
  MCP_MODE: "stdio",
  MCP_API_BASE_URL: "http://localhost:4000",
  MCP_API_TOKEN: "local-mcp-token-long-enough",
};

describe("API health", () => {
  it("responds with service health", async () => {
    const prisma = {
      user: {
        findUnique: async () => ({
          id: "user_1",
          email: "admin@example.com",
        }),
      },
    } as unknown as PrismaClient;

    const app = await buildServer({
      config: testConfig,
      prismaClient: prisma,
      startWorker: false,
      logger: false,
    });

    const response = await app.inject({ method: "GET", url: "/health" });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: {
        ok: true,
        service: "vidravault-api",
      },
    });
  });
});
