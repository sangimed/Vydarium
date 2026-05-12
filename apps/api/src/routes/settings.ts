import type { FastifyPluginAsync } from "fastify";

export const settingsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", { preHandler: app.authenticate }, async () => ({
    data: {
      appName: app.config.APP_NAME,
      authRequired: app.config.REQUIRE_AUTH,
      storage: {
        artifactsDir: app.config.ARTIFACTS_DIR,
        exportsDir: app.config.EXPORTS_DIR,
      },
      ingestion: {
        ytdlpBin: app.config.YTDLP_BIN,
        ffmpegBin: app.config.FFMPEG_BIN,
        captionLanguages: app.config.CAPTION_LANGUAGES,
        transcriptionProvider: app.config.TRANSCRIPTION_PROVIDER,
        mlxWhisperModel: app.config.MLX_WHISPER_MODEL,
      },
      retrieval: {
        engine: "postgres-full-text",
        vectorReady: true,
      },
      mcp: {
        enabled: app.config.MCP_ENABLED,
        mode: app.config.MCP_MODE,
      },
      security: {
        cookieSecure: app.config.COOKIE_SECURE,
        rateLimits: {
          api: app.config.API_RATE_LIMIT_MAX,
          retrieval: app.config.RETRIEVAL_RATE_LIMIT_MAX,
          mcp: app.config.MCP_RATE_LIMIT_MAX,
        },
      },
    },
  }));
};
