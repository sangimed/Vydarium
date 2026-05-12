import { config as loadDotenv } from "dotenv";
import { z } from "zod";

const booleanFromEnv = z
  .union([z.boolean(), z.string()])
  .transform((value) => (typeof value === "boolean" ? value : value.toLowerCase() === "true"));

const numberFromEnv = (defaultValue: number) =>
  z
    .union([z.number(), z.string()])
    .optional()
    .default(defaultValue)
    .transform((value) => Number(value))
    .pipe(z.number().finite());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_NAME: z.string().default("Vidravault"),
  PUBLIC_APP_URL: z.string().url().default("http://localhost:5173"),
  API_BASE_URL: z.string().url().default("http://localhost:4000"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: numberFromEnv(4000),
  WEB_ORIGIN: z.string().default("http://localhost:5173"),
  JWT_SECRET: z.string().min(32),
  COOKIE_SECURE: booleanFromEnv.default(false),
  REQUIRE_AUTH: booleanFromEnv.default(true),
  ADMIN_EMAIL: z.string().email().default("admin@example.com"),
  ADMIN_PASSWORD: z.string().min(8).default("change-me-now"),
  API_RATE_LIMIT_MAX: numberFromEnv(120),
  RETRIEVAL_RATE_LIMIT_MAX: numberFromEnv(60),
  MCP_RATE_LIMIT_MAX: numberFromEnv(30),
  ARTIFACTS_DIR: z.string().default("./artifacts"),
  EXPORTS_DIR: z.string().default("./exports"),
  MAX_VIDEO_URL_LENGTH: numberFromEnv(2048),
  YTDLP_BIN: z.string().default("yt-dlp"),
  FFMPEG_BIN: z.string().default("ffmpeg"),
  COMMAND_TIMEOUT_SECONDS: numberFromEnv(1800),
  CAPTION_LANGUAGES: z
    .string()
    .default("en,fr")
    .transform((value) =>
      value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  TRANSCRIPTION_PROVIDER: z.enum(["mock", "mlx-whisper", "command"]).default("mock"),
  MLX_WHISPER_BIN: z.string().default("mlx_whisper"),
  MLX_WHISPER_MODEL: z.string().default("mlx-community/whisper-large-v3-turbo"),
  QUEUE_WORKER_ENABLED: booleanFromEnv.default(true),
  PIPELINE_CONCURRENCY: numberFromEnv(2).pipe(z.number().int().min(1).max(10)),
  FRAME_INTERVAL_SECONDS: numberFromEnv(0),
  MCP_ENABLED: booleanFromEnv.default(false),
  MCP_MODE: z.enum(["stdio"]).default("stdio"),
  MCP_API_BASE_URL: z.string().url().default("http://localhost:4000"),
  MCP_API_TOKEN: z.string().min(16).default("change-me-for-local-mcp-use"),
});

export type AppConfig = z.infer<typeof envSchema>;

let cachedConfig: AppConfig | null = null;

export function loadConfig(overrides: NodeJS.ProcessEnv = process.env): AppConfig {
  if (!cachedConfig) {
    loadDotenv();
    const parsed = envSchema.parse({ ...process.env, ...overrides });

    if (parsed.NODE_ENV === "production" && parsed.ADMIN_PASSWORD === "change-me-now") {
      throw new Error("ADMIN_PASSWORD must be changed in production.");
    }

    if (parsed.NODE_ENV === "production" && parsed.JWT_SECRET.includes("change-me")) {
      throw new Error("JWT_SECRET must be changed in production.");
    }

    cachedConfig = parsed;
  }

  return cachedConfig;
}

export function resetConfigForTests(): void {
  cachedConfig = null;
}
