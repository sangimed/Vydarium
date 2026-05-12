import { join } from "node:path";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { Prisma } from "@vidravault/db";
import { addVideoSchema, retryPipelineStepSchema } from "@vidravault/shared";
import { removeDir } from "../lib/files.js";
import { enqueuePipelineRun } from "../workers/queue.js";
import { sanitizeArtifact, toVideoListItem } from "./serializers.js";

const listQuerySchema = z.object({
  status: z.string().optional(),
  tag: z.string().optional(),
  q: z.string().optional(),
  source: z.string().optional(),
});

export const videoRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", { preHandler: app.authenticate }, async (request) => {
    const query = listQuerySchema.parse(request.query);
    const where: Prisma.VideoWhereInput = {
      status: query.status ? (query.status as never) : { not: "DELETED" },
    };
    if (query.source) {
      where.sourceType = query.source as never;
    }
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: "insensitive" } },
        { description: { contains: query.q, mode: "insensitive" } },
        { channelName: { contains: query.q, mode: "insensitive" } },
      ];
    }
    if (query.tag) {
      where.tags = {
        some: {
          tag: { name: query.tag },
        },
      };
    }

    const videos = await app.prisma.video.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        tags: { include: { tag: true } },
        pipelineRuns: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { steps: { orderBy: { createdAt: "asc" } } },
        },
      },
    });

    return { data: videos.map(toVideoListItem) };
  });

  app.post("/", { preHandler: app.authenticate }, async (request, reply) => {
    const input = addVideoSchema.parse(request.body);
    const createdById = request.authUser?.authMode === "session" ? request.authUser.id : undefined;

    const video = await app.prisma.$transaction(async (tx) => {
      const data: Prisma.VideoUncheckedCreateInput = {
        sourceUrl: input.sourceUrl,
        sourceType: "YOUTUBE",
        status: "QUEUED",
        language: input.languages[0] ?? null,
      };
      if (createdById) {
        data.ownerId = createdById;
      }

      const created = await tx.video.create({
        data,
      });

      for (const tagName of input.tags) {
        const tag = await tx.tag.upsert({
          where: { name: tagName },
          update: {},
          create: { name: tagName },
        });
        await tx.videoTag.create({
          data: {
            videoId: created.id,
            tagId: tag.id,
          },
        });
      }

      return created;
    });

    const run = await app.orchestrator.createRun(video.id, createdById);
    await enqueuePipelineRun(app.pipelineQueue, { videoId: video.id, runId: run.id });

    await reply.code(201).send({ data: { videoId: video.id, runId: run.id } });
  });

  app.get("/:id", { preHandler: app.authenticate }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const record = await app.retrieval.getVideoRecord(id);
    return {
      data: {
        ...record,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
        publicationDate: record.publicationDate?.toISOString() ?? null,
        tags: record.tags.map((item) => item.tag.name),
        artifacts: record.artifacts.map(sanitizeArtifact),
        pipelineRuns: record.pipelineRuns.map((run) => ({
          ...run,
          createdAt: run.createdAt.toISOString(),
          updatedAt: run.updatedAt.toISOString(),
          startedAt: run.startedAt?.toISOString() ?? null,
          completedAt: run.completedAt?.toISOString() ?? null,
          steps: run.steps.map((step) => ({
            ...step,
            createdAt: step.createdAt.toISOString(),
            updatedAt: step.updatedAt.toISOString(),
            startedAt: step.startedAt?.toISOString() ?? null,
            completedAt: step.completedAt?.toISOString() ?? null,
          })),
          events: run.events.map((event) => ({
            ...event,
            createdAt: event.createdAt.toISOString(),
          })),
        })),
      },
    };
  });

  app.post("/:id/retry", { preHandler: app.authenticate }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const input = retryPipelineStepSchema.parse(request.body ?? {});
    const run = await app.orchestrator.createRun(id, request.authUser?.id, input.step);
    const data = {
      videoId: id,
      runId: run.id,
      ...(input.step ? { requestedStep: input.step } : {}),
    };
    await enqueuePipelineRun(app.pipelineQueue, data);
    return { data: { runId: run.id } };
  });

  app.delete("/:id", { preHandler: app.authenticate }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    await app.prisma.video.delete({ where: { id } });
    await removeDir(join(app.config.ARTIFACTS_DIR, id));
    return { data: { ok: true } };
  });
};
