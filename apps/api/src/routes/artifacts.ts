import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { fileExists, streamFile } from "../lib/files.js";

export const artifactRoutes: FastifyPluginAsync = async (app) => {
  app.get("/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const artifact = await app.prisma.artifact.findUnique({ where: { id } });
    if (!artifact || !(await fileExists(artifact.path))) {
      await reply.code(404).send({ error: { code: "NOT_FOUND", message: "Artifact not found." } });
      return;
    }

    reply.type(artifact.mimeType ?? "application/octet-stream");
    return reply.send(streamFile(artifact.path));
  });
};
