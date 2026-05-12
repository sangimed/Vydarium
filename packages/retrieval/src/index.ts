import type { PrismaClient } from "@vidravault/db";
import { Prisma } from "@vidravault/db";
import type { ChunkSourceType, RetrievalSearchInput, SearchResult } from "@vidravault/shared";
import { formatTimestamp, retrievalSearchSchema } from "@vidravault/shared";

type SearchRow = {
  id: string;
  videoId: string;
  videoTitle: string | null;
  sourceUrl: string;
  channel: string | null;
  excerpt: string;
  startTime: number | null;
  endTime: number | null;
  chunkType: string;
  score: number;
  tags: string[];
};

export class RetrievalService {
  constructor(private readonly prisma: PrismaClient) {}

  async search(input: RetrievalSearchInput): Promise<SearchResult[]> {
    const parsed = retrievalSearchSchema.parse(input);
    const rows = await this.queryChunks(parsed.query, parsed.limit * 5);

    return rows
      .map(toSearchResult)
      .filter((result) => matchesFilters(result, parsed.filters ?? {}))
      .slice(0, parsed.limit);
  }

  async findCommands(input: RetrievalSearchInput): Promise<SearchResult[]> {
    const parsed = retrievalSearchSchema.parse(input);
    const rows = await this.queryChunks(parsed.query, parsed.limit * 5, ["COMMAND"]);

    return rows
      .map(toSearchResult)
      .filter((result) => matchesFilters(result, parsed.filters ?? {}))
      .slice(0, parsed.limit);
  }

  async findSources(topic: string, limit = 10): Promise<SearchResult[]> {
    return this.search({ query: topic, limit, filters: {} });
  }

  async getVideoRecord(videoId: string) {
    return this.prisma.video.findUniqueOrThrow({
      where: { id: videoId },
      include: {
        tags: { include: { tag: true } },
        sources: true,
        pipelineRuns: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            steps: { orderBy: { createdAt: "asc" } },
            events: { orderBy: { createdAt: "desc" }, take: 50 },
          },
        },
        artifacts: { orderBy: { createdAt: "desc" } },
        transcripts: true,
        transcriptChunks: { orderBy: [{ sourceType: "asc" }, { chunkIndex: "asc" }] },
        notes: { orderBy: { createdAt: "desc" } },
        noteChunks: { orderBy: [{ sourceType: "asc" }, { chunkIndex: "asc" }] },
      },
    });
  }

  async getTranscript(videoId: string, startTime?: number, endTime?: number) {
    const where: Prisma.TranscriptChunkWhereInput = {
      videoId,
      sourceType: "TRANSCRIPT_CLEAN",
    };

    if (startTime !== undefined || endTime !== undefined) {
      where.AND = [
        startTime === undefined ? {} : { endTime: { gte: startTime } },
        endTime === undefined ? {} : { startTime: { lte: endTime } },
      ];
    }

    return this.prisma.transcriptChunk.findMany({
      where,
      orderBy: { chunkIndex: "asc" },
    });
  }

  async getNotes(videoId: string) {
    return this.prisma.note.findMany({
      where: { videoId },
      orderBy: { createdAt: "desc" },
      include: {
        chunks: { orderBy: { chunkIndex: "asc" } },
      },
    });
  }

  private async queryChunks(
    query: string,
    limit: number,
    chunkTypes?: ChunkSourceType[],
  ): Promise<SearchRow[]> {
    const likeQuery = `%${query}%`;
    const typeFilter =
      chunkTypes && chunkTypes.length > 0
        ? Prisma.sql`AND c."chunkType" = ANY(${chunkTypes}::text[])`
        : Prisma.empty;

    return this.prisma.$queryRaw<SearchRow[]>(Prisma.sql`
      WITH query AS (
        SELECT websearch_to_tsquery('simple', ${query}) AS q
      ),
      chunks AS (
        SELECT
          tc.id,
          tc."videoId",
          COALESCE(v.title, 'Untitled video') AS "videoTitle",
          v."sourceUrl",
          v."channelName" AS channel,
          ts_headline('simple', tc.text, query.q, 'MaxWords=36, MinWords=8, ShortWord=3') AS excerpt,
          tc."startTime",
          tc."endTime",
          tc."sourceType"::text AS "chunkType",
          GREATEST(ts_rank_cd(to_tsvector('simple', tc.text), query.q), 0.01)::float AS score,
          COALESCE(array_agg(DISTINCT tag.name) FILTER (WHERE tag.name IS NOT NULL), ARRAY[]::text[]) AS tags
        FROM "TranscriptChunk" tc
        JOIN "Video" v ON v.id = tc."videoId"
        CROSS JOIN query
        LEFT JOIN "VideoTag" vt ON vt."videoId" = v.id
        LEFT JOIN "Tag" tag ON tag.id = vt."tagId"
        WHERE v.status != 'DELETED'
          AND (to_tsvector('simple', tc.text) @@ query.q OR tc.text ILIKE ${likeQuery})
        GROUP BY tc.id, v.id, query.q

        UNION ALL

        SELECT
          nc.id,
          nc."videoId",
          COALESCE(v.title, 'Untitled video') AS "videoTitle",
          v."sourceUrl",
          v."channelName" AS channel,
          ts_headline('simple', nc.text, query.q, 'MaxWords=36, MinWords=8, ShortWord=3') AS excerpt,
          nc."startTime",
          nc."endTime",
          nc."sourceType"::text AS "chunkType",
          GREATEST(ts_rank_cd(to_tsvector('simple', nc.text), query.q), 0.01)::float AS score,
          COALESCE(array_agg(DISTINCT tag.name) FILTER (WHERE tag.name IS NOT NULL), ARRAY[]::text[]) AS tags
        FROM "NoteChunk" nc
        JOIN "Video" v ON v.id = nc."videoId"
        CROSS JOIN query
        LEFT JOIN "VideoTag" vt ON vt."videoId" = v.id
        LEFT JOIN "Tag" tag ON tag.id = vt."tagId"
        WHERE v.status != 'DELETED'
          AND (to_tsvector('simple', nc.text) @@ query.q OR nc.text ILIKE ${likeQuery})
        GROUP BY nc.id, v.id, query.q
      )
      SELECT * FROM chunks c
      WHERE true ${typeFilter}
      ORDER BY c.score DESC, c."videoTitle" ASC
      LIMIT ${limit};
    `);
  }
}

function toSearchResult(row: SearchRow): SearchResult {
  return {
    id: row.id,
    videoId: row.videoId,
    videoTitle: row.videoTitle ?? "Untitled video",
    sourceUrl: row.sourceUrl,
    channel: row.channel,
    excerpt: stripHeadlineTags(row.excerpt),
    timestamp: formatTimestamp(row.startTime),
    startTime: row.startTime,
    endTime: row.endTime,
    chunkType: row.chunkType as ChunkSourceType,
    score: row.score,
    tags: row.tags,
  };
}

function matchesFilters(
  result: SearchResult,
  filters: NonNullable<RetrievalSearchInput["filters"]>,
): boolean {
  if (filters.tags?.length) {
    const resultTags = new Set(result.tags.map((tag) => tag.toLowerCase()));
    if (!filters.tags.every((tag) => resultTags.has(tag.toLowerCase()))) {
      return false;
    }
  }

  if (filters.chunkTypes?.length && !filters.chunkTypes.includes(result.chunkType)) {
    return false;
  }

  if (filters.channel && result.channel !== filters.channel) {
    return false;
  }

  return true;
}

function stripHeadlineTags(input: string): string {
  return input.replace(/<\/?b>/g, "");
}
