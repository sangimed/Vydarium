import { basename } from "node:path";
import type {
  Artifact,
  PipelineRun,
  PipelineStep,
  Tag,
  Video,
  VideoTag,
} from "@vidravault/db";
import type { VideoListItem } from "@vidravault/shared";

export function toVideoListItem(
  video: Video & {
    tags: Array<VideoTag & { tag: Tag }>;
    pipelineRuns?: Array<PipelineRun & { steps: PipelineStep[] }>;
  },
): VideoListItem {
  const latestRun = video.pipelineRuns?.[0];
  const failedStep = latestRun?.steps.find((step) => step.status === "FAILED");
  return {
    id: video.id,
    title: video.title,
    sourceUrl: video.sourceUrl,
    canonicalUrl: video.canonicalUrl,
    sourceType: video.sourceType,
    channelName: video.channelName,
    durationSeconds: video.durationSeconds,
    status: video.status,
    language: video.language,
    createdAt: video.createdAt.toISOString(),
    updatedAt: video.updatedAt.toISOString(),
    tags: video.tags.map((item) => item.tag.name),
    latestRunStatus: latestRun?.steps.some((step) => step.status === "RUNNING")
      ? "RUNNING"
      : (latestRun?.steps.at(-1)?.status ?? null),
    failedStep: failedStep?.name ?? null,
  };
}

export function sanitizeArtifact(artifact: Artifact) {
  return {
    id: artifact.id,
    videoId: artifact.videoId,
    type: artifact.type,
    fileName: basename(artifact.path),
    mimeType: artifact.mimeType,
    size: artifact.size?.toString() ?? null,
    checksum: artifact.checksum,
    metadata: artifact.metadata,
    createdAt: artifact.createdAt.toISOString(),
    downloadUrl: `/api/artifacts/${artifact.id}`,
  };
}
