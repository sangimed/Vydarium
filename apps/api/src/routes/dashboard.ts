import type { FastifyPluginAsync } from "fastify";
import { toVideoListItem } from "./serializers.js";

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", { preHandler: app.authenticate }, async () => {
    const [videos, runningPipelines, failedPipelines, indexedChunks, latestVideos] = await Promise.all([
      app.prisma.video.count({ where: { status: { not: "DELETED" } } }),
      app.prisma.pipelineRun.count({ where: { status: { in: ["QUEUED", "RUNNING"] } } }),
      app.prisma.pipelineRun.count({ where: { status: "FAILED" } }),
      app.prisma.transcriptChunk.count(),
      app.prisma.video.findMany({
        where: { status: { not: "DELETED" } },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          tags: { include: { tag: true } },
          pipelineRuns: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { steps: { orderBy: { createdAt: "asc" } } },
          },
        },
      }),
    ]);

    return {
      data: {
        videos,
        runningPipelines,
        failedPipelines,
        indexedChunks,
        latestVideos: latestVideos.map(toVideoListItem),
      },
    };
  });
};
