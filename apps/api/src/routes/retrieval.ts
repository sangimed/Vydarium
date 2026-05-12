import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { retrievalSearchSchema } from "@vidravault/shared";

const transcriptQuerySchema = z.object({
  startTime: z.coerce.number().optional(),
  endTime: z.coerce.number().optional(),
});

export const retrievalRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/search",
    {
      preHandler: [app.authenticate, app.retrievalRateLimit],
    },
    async (request) => {
      const input = retrievalSearchSchema.parse(request.body);
      const results = await app.retrieval.search(input);
      return { data: { results } };
    },
  );

  app.get("/videos/:id", { preHandler: app.authenticate }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const record = await app.retrieval.getVideoRecord(id);
    return { data: record };
  });

  app.get("/videos/:id/transcript", { preHandler: app.authenticate }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const query = transcriptQuerySchema.parse(request.query);
    const chunks = await app.retrieval.getTranscript(id, query.startTime, query.endTime);
    return { data: { chunks } };
  });

  app.get("/videos/:id/notes", { preHandler: app.authenticate }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const notes = await app.retrieval.getNotes(id);
    return { data: { notes } };
  });

  app.post(
    "/commands",
    {
      preHandler: [app.authenticate, app.retrievalRateLimit],
    },
    async (request) => {
      const input = retrievalSearchSchema.parse(request.body);
      const results = await app.retrieval.findCommands(input);
      return { data: { results } };
    },
  );

  app.post(
    "/sources",
    {
      preHandler: [app.authenticate, app.retrievalRateLimit],
    },
    async (request) => {
      const input = z.object({ topic: z.string().min(1), limit: z.number().min(1).max(50).default(10) }).parse(request.body);
      const results = await app.retrieval.findSources(input.topic, input.limit);
      return { data: { results } };
    },
  );
};
