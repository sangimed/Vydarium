import { join } from "node:path";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { MarkdownExporter } from "@vidravault/exporters";
import { fileMetadata } from "@vidravault/pipeline";
import { writeUtf8 } from "../lib/files.js";

export const exportRoutes: FastifyPluginAsync = async (app) => {
  app.post("/videos/:id/markdown", { preHandler: app.authenticate }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const artifact = await createMarkdownExport(app, id);
    return { data: artifact };
  });

  app.get("/videos/:id/markdown", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const artifact = await createMarkdownExport(app, id);
    reply.header("content-disposition", `attachment; filename="${artifact.fileName}"`);
    reply.type("text/markdown");
    return artifact.content;
  });
};

async function createMarkdownExport(app: Parameters<FastifyPluginAsync>[0], videoId: string) {
  const video = await app.prisma.video.findUniqueOrThrow({
    where: { id: videoId },
    include: {
      tags: { include: { tag: true } },
      notes: { orderBy: { createdAt: "desc" }, take: 1 },
      transcriptChunks: {
        where: { sourceType: "TRANSCRIPT_CLEAN" },
        orderBy: { chunkIndex: "asc" },
        take: 12,
      },
    },
  });
  const exporter = new MarkdownExporter();
  const exportResult = await exporter.export({
    title: video.title ?? "Untitled video",
    sourceUrl: video.sourceUrl,
    channelName: video.channelName,
    durationSeconds: video.durationSeconds,
    tags: video.tags.map((item) => item.tag.name),
    createdAt: video.createdAt,
    summary: video.notes[0]?.summary ?? null,
    markdownNotes: video.notes[0]?.markdown ?? null,
    transcriptExcerpts: video.transcriptChunks.map((chunk) => ({
      startTime: chunk.startTime,
      text: chunk.text,
    })),
  });

  const exportDir = join(app.config.EXPORTS_DIR, videoId);
  const exportPath = join(exportDir, exportResult.fileName);
  await writeUtf8(exportPath, exportResult.content);
  const meta = await fileMetadata(exportPath);
  await app.prisma.exportJob.create({
    data: {
      videoId,
      target: "markdown",
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });

  await app.prisma.artifact.create({
    data: {
      videoId,
      type: "NOTE_MARKDOWN",
      path: exportPath,
      mimeType: exportResult.mimeType,
      size: meta.size,
      checksum: meta.checksum,
      metadata: { export: true },
    },
  });

  return {
    fileName: exportResult.fileName,
    content: exportResult.content,
    mimeType: exportResult.mimeType,
    size: meta.size.toString(),
    checksum: meta.checksum,
  };
}
