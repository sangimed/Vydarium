import { z } from "zod";

export const videoStatuses = ["QUEUED", "PROCESSING", "READY", "FAILED", "DELETED"] as const;
export const stepStatuses = ["PENDING", "RUNNING", "COMPLETED", "FAILED", "SKIPPED"] as const;
export const pipelineStepNames = [
  "CAPTURE",
  "CAPTIONS",
  "AUDIO",
  "TRANSCRIPTION",
  "CLEANING",
  "CHUNKING",
  "FRAMES",
  "NOTES",
  "INDEXING",
] as const;
export const chunkSourceTypes = [
  "TRANSCRIPT_RAW",
  "TRANSCRIPT_CLEAN",
  "NOTE",
  "SUMMARY",
  "COMMAND",
  "QUOTE",
  "CONCEPT",
] as const;

export type VideoStatus = (typeof videoStatuses)[number];
export type StepStatus = (typeof stepStatuses)[number];
export type PipelineStepName = (typeof pipelineStepNames)[number];
export type ChunkSourceType = (typeof chunkSourceTypes)[number];

export const timestampSecondsSchema = z.number().min(0).finite();

export const youtubeUrlSchema = z
  .string()
  .trim()
  .url()
  .max(2048)
  .refine((value) => {
    const parsed = new URL(value);
    const host = parsed.hostname.replace(/^www\./, "");
    return ["youtube.com", "m.youtube.com", "youtu.be", "music.youtube.com"].includes(host);
  }, "Only YouTube URLs are supported in V1.");

export const addVideoSchema = z.object({
  sourceUrl: youtubeUrlSchema,
  languages: z.array(z.string().trim().min(2).max(12)).default(["en", "fr"]),
  tags: z.array(z.string().trim().min(1).max(64)).max(20).default([]),
  captionsFirst: z.boolean().default(true),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(256),
});

export const searchFiltersSchema = z
  .object({
    tags: z.array(z.string().min(1).max(64)).optional(),
    language: z.string().min(2).max(12).optional(),
    sourceType: z.string().min(1).max(32).optional(),
    channel: z.string().min(1).max(256).optional(),
    chunkTypes: z.array(z.enum(chunkSourceTypes)).optional(),
  })
  .default({});

export const retrievalSearchSchema = z.object({
  query: z.string().trim().min(1).max(500),
  filters: searchFiltersSchema.optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

export const retryPipelineStepSchema = z.object({
  step: z.enum(pipelineStepNames).optional(),
});

export type AddVideoInput = z.infer<typeof addVideoSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RetrievalSearchInput = z.infer<typeof retrievalSearchSchema>;

export type ApiEnvelope<T> = {
  data: T;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type VideoListItem = {
  id: string;
  title: string | null;
  sourceUrl: string;
  canonicalUrl: string | null;
  sourceType: string;
  channelName: string | null;
  durationSeconds: number | null;
  status: VideoStatus;
  language: string | null;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  latestRunStatus: StepStatus | null;
  failedStep: PipelineStepName | null;
};

export type SearchResult = {
  id: string;
  videoId: string;
  videoTitle: string;
  sourceUrl: string;
  channel: string | null;
  excerpt: string;
  timestamp: string | null;
  startTime: number | null;
  endTime: number | null;
  chunkType: ChunkSourceType;
  score: number;
  tags: string[];
};

export type DashboardStats = {
  videos: number;
  runningPipelines: number;
  failedPipelines: number;
  indexedChunks: number;
  latestVideos: VideoListItem[];
};

export function formatTimestamp(totalSeconds: number | null | undefined): string | null {
  if (totalSeconds === null || totalSeconds === undefined || Number.isNaN(totalSeconds)) {
    return null;
  }

  const rounded = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;

  if (hours > 0) {
    return [hours, minutes, seconds].map((part) => part.toString().padStart(2, "0")).join(":");
  }

  return [minutes, seconds].map((part) => part.toString().padStart(2, "0")).join(":");
}

export function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

export function buildTimestampUrl(sourceUrl: string, startTime?: number | null): string {
  if (!startTime || startTime <= 0) {
    return sourceUrl;
  }

  const url = new URL(sourceUrl);
  if (url.hostname.includes("youtu.be")) {
    url.searchParams.set("t", `${Math.floor(startTime)}s`);
    return url.toString();
  }

  url.searchParams.set("t", `${Math.floor(startTime)}s`);
  return url.toString();
}
