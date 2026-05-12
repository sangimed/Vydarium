import type { AppConfig } from "@vidravault/config";
import type { PrismaClient } from "@vidravault/db";
import { Queue, Worker, type JobsOptions } from "bullmq";
import { Redis } from "ioredis";
import type { FastifyBaseLogger } from "fastify";
import type { PipelineOrchestrator, PipelineJobData } from "../pipeline/orchestrator.js";

export const videoPipelineQueueName = "vidravault-video-pipeline";

export type PipelineQueueLike = {
  add: (name: string, data: PipelineJobData, options?: unknown) => Promise<unknown>;
  close?: () => Promise<void>;
};

export function makeRedisConnection(config: AppConfig) {
  return new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
  });
}

export function makePipelineQueue(config: AppConfig) {
  return new Queue<PipelineJobData>(videoPipelineQueueName, {
    connection: makeRedisConnection(config),
    defaultJobOptions: defaultJobOptions(),
  });
}

export async function enqueuePipelineRun(
  queue: PipelineQueueLike,
  data: PipelineJobData,
): Promise<void> {
  await queue.add("run-pipeline", data, {
    jobId: data.runId,
  });
}

export function startPipelineWorker(options: {
  config: AppConfig;
  prisma: PrismaClient;
  orchestrator: PipelineOrchestrator;
  logger: FastifyBaseLogger;
}) {
  const worker = new Worker<PipelineJobData>(
    videoPipelineQueueName,
    async (job) => {
      options.logger.info({ jobId: job.id, videoId: job.data.videoId }, "Starting pipeline job.");
      await options.orchestrator.run(job.data);
    },
    {
      connection: makeRedisConnection(options.config),
      concurrency: options.config.PIPELINE_CONCURRENCY,
    },
  );

  worker.on("failed", async (job, error) => {
    options.logger.error({ jobId: job?.id, error }, "Pipeline job failed.");
    if (job?.data.runId) {
      await options.prisma.pipelineRun.update({
        where: { id: job.data.runId },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          error: error.message,
        },
      });
    }
  });

  return worker;
}

function defaultJobOptions(): JobsOptions {
  return {
    attempts: 1,
    removeOnComplete: {
      age: 60 * 60 * 24,
      count: 500,
    },
    removeOnFail: {
      age: 60 * 60 * 24 * 7,
      count: 1000,
    },
  };
}
