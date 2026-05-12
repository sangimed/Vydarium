import Fastify, {
  type FastifyBaseLogger,
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import type { Worker } from "bullmq";
import type { ZodError } from "zod";
import { loadConfig, type AppConfig } from "@vidravault/config";
import { prisma, type PrismaClient } from "@vidravault/db";
import { RetrievalService } from "@vidravault/retrieval";
import { makeAuthenticate } from "./auth/authenticate.js";
import { ensureAdminUser } from "./auth/seed.js";
import { makePipelineProviders } from "./config/providers.js";
import { PipelineOrchestrator, type PipelineJobData } from "./pipeline/orchestrator.js";
import { artifactRoutes } from "./routes/artifacts.js";
import { authRoutes } from "./routes/auth.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { exportRoutes } from "./routes/export.js";
import { retrievalRoutes } from "./routes/retrieval.js";
import { settingsRoutes } from "./routes/settings.js";
import { videoRoutes } from "./routes/videos.js";
import { makePipelineQueue, startPipelineWorker, type PipelineQueueLike } from "./workers/queue.js";

declare module "fastify" {
  interface FastifyInstance {
    config: AppConfig;
    prisma: PrismaClient;
    retrieval: RetrievalService;
    orchestrator: PipelineOrchestrator;
    pipelineQueue: PipelineQueueLike;
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    retrievalRateLimit: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

type BuildServerOptions = {
  config?: AppConfig;
  prismaClient?: PrismaClient;
  startWorker?: boolean;
  logger?: boolean | FastifyBaseLogger;
};

export async function buildServer(options: BuildServerOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadConfig();
  const prismaClient = options.prismaClient ?? prisma;
  const app = Fastify({
    logger: options.logger ?? {
      level: config.NODE_ENV === "development" ? "info" : "warn",
      redact: ["req.headers.authorization", "req.headers.cookie", "*.password", "*.token"],
    },
  });

  const providers = makePipelineProviders(config);
  const orchestrator = new PipelineOrchestrator(prismaClient, config, providers);
  const retrieval = new RetrievalService(prismaClient);
  const queue =
    config.NODE_ENV === "test"
      ? makeQueueStub()
      : makePipelineQueue(config);
  let worker: Worker<PipelineJobData> | null = null;

  app.decorate("config", config);
  app.decorate("prisma", prismaClient);
  app.decorate("retrieval", retrieval);
  app.decorate("orchestrator", orchestrator);
  app.decorate("pipelineQueue", queue as PipelineQueueLike);
  app.decorate("authenticate", makeAuthenticate(prismaClient, config));
  app.decorate("retrievalRateLimit", makeInMemoryRateLimit(config.RETRIEVAL_RATE_LIMIT_MAX));

  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: false,
  });
  await app.register(cors, {
    origin: config.WEB_ORIGIN.split(",").map((origin) => origin.trim()),
    credentials: true,
  });
  await app.register(cookie);
  await app.register(jwt, {
    secret: config.JWT_SECRET,
    cookie: {
      cookieName: "vidravault_session",
      signed: false,
    },
  });
  await app.register(rateLimit, {
    max: config.API_RATE_LIMIT_MAX,
    timeWindow: "1 minute",
  });

  app.setErrorHandler(async (error, _request, reply) => {
    if (isZodError(error)) {
      await reply.code(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request payload.",
          details: error.flatten(),
        },
      });
      return;
    }

    app.log.error({ error }, "Unhandled API error.");
    const fastifyError = error as { statusCode?: number; message?: string };
    const statusCode =
      fastifyError.statusCode && fastifyError.statusCode >= 400 ? fastifyError.statusCode : 500;
    await reply.code(statusCode).send({
      error: {
        code: statusCode >= 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_ERROR",
        message: statusCode >= 500 ? "Unexpected server error." : fastifyError.message,
      },
    });
  });

  app.get("/health", async () => ({
    data: {
      ok: true,
      service: "vidravault-api",
    },
  }));

  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(dashboardRoutes, { prefix: "/api/dashboard" });
  await app.register(videoRoutes, { prefix: "/api/videos" });
  await app.register(artifactRoutes, { prefix: "/api/artifacts" });
  await app.register(retrievalRoutes, { prefix: "/api/retrieval" });
  await app.register(exportRoutes, { prefix: "/api/export" });
  await app.register(settingsRoutes, { prefix: "/api/settings" });

  await ensureAdminUser(prismaClient, config);

  if ((options.startWorker ?? config.QUEUE_WORKER_ENABLED) && config.NODE_ENV !== "test") {
    worker = startPipelineWorker({
      config,
      prisma: prismaClient,
      orchestrator,
      logger: app.log,
    });
  }

  app.addHook("onClose", async () => {
    await worker?.close();
    await queue.close?.();
  });

  return app;
}

function makeQueueStub(): PipelineQueueLike {
  return {
    async add() {
      return undefined;
    },
  };
}

function isZodError(error: unknown): error is ZodError {
  return typeof error === "object" && error !== null && "issues" in error;
}

function makeInMemoryRateLimit(max: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return async (request: FastifyRequest, reply: FastifyReply) => {
    const key = request.authUser?.id ?? request.ip;
    const now = Date.now();
    const windowMs = 60_000;
    const bucket = hits.get(key);

    if (!bucket || bucket.resetAt < now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }

    bucket.count += 1;
    if (bucket.count > max) {
      await reply.code(429).send({
        error: { code: "RATE_LIMITED", message: "Too many retrieval requests." },
      });
    }
  };
}
