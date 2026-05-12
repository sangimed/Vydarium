import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { AppConfig } from "@vidravault/config";
import {
  Prisma,
  type ArtifactType,
  type ChunkSourceType,
  type PipelineRun,
  type PipelineStepName,
  type PrismaClient,
  type TranscriptType,
} from "@vidravault/db";
import {
  fileMetadata,
  type PipelineProviders,
  type ThumbnailFrameExtractor,
  type TranscriptSegment,
} from "@vidravault/pipeline";
import { pipelineStepNames } from "@vidravault/shared";
import { writeUtf8 } from "../lib/files.js";

export const orderedPipelineSteps = [...pipelineStepNames];

export type PipelineJobData = {
  videoId: string;
  runId: string;
  requestedStep?: PipelineStepName;
};

type StepResult = "completed" | "skipped";

export class PipelineOrchestrator {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly config: AppConfig,
    private readonly providers: PipelineProviders & {
      thumbnailFrameExtractor: ThumbnailFrameExtractor;
    },
  ) {}

  async createRun(videoId: string, createdById?: string, requestedStep?: PipelineStepName) {
    const data: Prisma.PipelineRunUncheckedCreateInput = {
      videoId,
      status: "QUEUED",
    };
    if (createdById) {
      data.createdById = createdById;
    }
    if (requestedStep) {
      data.requestedStep = requestedStep;
    }

    const run = await this.prisma.pipelineRun.create({
      data,
    });

    await this.prisma.pipelineStep.createMany({
      data: orderedPipelineSteps.map((name) => ({
        runId: run.id,
        videoId,
        name,
        status: "PENDING",
      })),
    });

    return run;
  }

  async run(job: PipelineJobData): Promise<void> {
    const run = await this.prisma.pipelineRun.update({
      where: { id: job.runId },
      data: { status: "RUNNING", startedAt: new Date(), error: null },
    });

    await this.prisma.video.update({
      where: { id: job.videoId },
      data: { status: "PROCESSING" },
    });

    const startIndex = job.requestedStep ? orderedPipelineSteps.indexOf(job.requestedStep) : 0;
    const safeStartIndex = startIndex >= 0 ? startIndex : 0;
    const skippedBefore = orderedPipelineSteps.slice(0, safeStartIndex);

    if (skippedBefore.length > 0) {
      await this.prisma.pipelineStep.updateMany({
        where: { runId: run.id, name: { in: skippedBefore } },
        data: { status: "SKIPPED", completedAt: new Date() },
      });
    }

    try {
      for (const stepName of orderedPipelineSteps.slice(safeStartIndex)) {
        await this.executeStep(run, stepName);
      }

      await this.prisma.pipelineRun.update({
        where: { id: run.id },
        data: { status: "COMPLETED", completedAt: new Date(), error: null },
      });
      await this.prisma.video.update({
        where: { id: job.videoId },
        data: { status: "READY" },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Pipeline failed.";
      await this.prisma.pipelineRun.update({
        where: { id: run.id },
        data: { status: "FAILED", completedAt: new Date(), error: message },
      });
      await this.prisma.video.update({
        where: { id: job.videoId },
        data: { status: "FAILED" },
      });
      throw error;
    }
  }

  private async executeStep(run: PipelineRun, name: PipelineStepName): Promise<void> {
    const step = await this.prisma.pipelineStep.update({
      where: { runId_name: { runId: run.id, name } },
      data: {
        status: "RUNNING",
        startedAt: new Date(),
        completedAt: null,
        error: null,
        attempts: { increment: 1 },
      },
    });

    await this.event(run.id, step.id, "info", `Starting ${name}.`);

    try {
      const result = await this.runStep(run.videoId, name);
      await this.prisma.pipelineStep.update({
        where: { id: step.id },
        data: {
          status: result === "completed" ? "COMPLETED" : "SKIPPED",
          completedAt: new Date(),
          error: null,
        },
      });
      await this.event(run.id, step.id, "info", `${name} ${result}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : `Step ${name} failed.`;
      await this.prisma.pipelineStep.update({
        where: { id: step.id },
        data: { status: "FAILED", completedAt: new Date(), error: message },
      });
      await this.event(run.id, step.id, "error", message);
      throw error;
    }
  }

  private async runStep(videoId: string, name: PipelineStepName): Promise<StepResult> {
    switch (name) {
      case "CAPTURE":
        return this.capture(videoId);
      case "CAPTIONS":
        return this.captions(videoId);
      case "AUDIO":
        return this.audio(videoId);
      case "TRANSCRIPTION":
        return this.transcription(videoId);
      case "CLEANING":
        return this.cleaning(videoId);
      case "CHUNKING":
        return this.chunking(videoId);
      case "FRAMES":
        return this.frames(videoId);
      case "NOTES":
        return this.notes(videoId);
      case "INDEXING":
        return this.indexing(videoId);
    }
  }

  private async capture(videoId: string): Promise<StepResult> {
    const video = await this.prisma.video.findUniqueOrThrow({ where: { id: videoId } });
    const workDir = await this.workDir(videoId);
    const metadata = await this.providers.metadataProvider.getMetadata(video.sourceUrl, workDir);
    const metadataPath = join(workDir, "metadata.json");
    await writeUtf8(metadataPath, JSON.stringify(metadata.raw, null, 2));
    const artifact = await this.upsertArtifact(videoId, "METADATA_JSON", metadataPath, {
      externalId: metadata.externalId,
    });

    await this.prisma.video.update({
      where: { id: videoId },
      data: {
        title: metadata.title,
        channelName: metadata.channelName ?? null,
        description: metadata.description ?? null,
        durationSeconds: metadata.durationSeconds ?? null,
        publicationDate: metadata.publicationDate ?? null,
        thumbnailPath: metadata.thumbnailUrl ?? null,
        canonicalUrl: metadata.canonicalUrl ?? null,
        language: metadata.language ?? null,
      },
    });

    await this.prisma.videoSource.upsert({
      where: { id: `${videoId}:source` },
      update: {
        externalId: metadata.externalId ?? null,
        url: video.sourceUrl,
        canonicalUrl: metadata.canonicalUrl ?? null,
        metadata: metadata.raw as Prisma.InputJsonValue,
      },
      create: {
        id: `${videoId}:source`,
        videoId,
        externalId: metadata.externalId ?? null,
        url: video.sourceUrl,
        canonicalUrl: metadata.canonicalUrl ?? null,
        metadata: metadata.raw as Prisma.InputJsonValue,
      },
    });

    await this.eventForVideo(videoId, "info", "Metadata captured.", { artifactId: artifact.id });
    return "completed";
  }

  private async captions(videoId: string): Promise<StepResult> {
    const video = await this.prisma.video.findUniqueOrThrow({ where: { id: videoId } });
    const workDir = await this.workDir(videoId);
    const tracks = await this.providers.captionProvider.fetchCaptions(
      video.sourceUrl,
      this.config.CAPTION_LANGUAGES,
      workDir,
    );

    if (tracks.length === 0) {
      return "skipped";
    }

    const selected = tracks[0];
    if (!selected) {
      return "skipped";
    }
    const captionArtifact = await this.upsertArtifact(videoId, "CAPTION", selected.path, {
      language: selected.language,
      kind: selected.kind,
    });
    const transcript = await this.providers.captionProvider.parseCaption(selected.path, selected.language);
    const rawPath = join(workDir, "transcripts", "raw.txt");
    await writeUtf8(rawPath, transcript.text);
    const rawArtifact = await this.upsertArtifact(videoId, "TRANSCRIPT_RAW", rawPath, {
      sourceArtifactId: captionArtifact.id,
    });
    await this.upsertTranscript(videoId, "RAW", transcript, rawArtifact.id);
    return "completed";
  }

  private async audio(videoId: string): Promise<StepResult> {
    const existingTranscript = await this.prisma.transcript.findUnique({
      where: { videoId_type: { videoId, type: "RAW" } },
    });
    if (existingTranscript?.text) {
      return "skipped";
    }

    const video = await this.prisma.video.findUniqueOrThrow({ where: { id: videoId } });
    const workDir = await this.workDir(videoId);
    const audio = await this.providers.audioExtractor.extractAudio(video.sourceUrl, workDir);
    await this.upsertArtifact(videoId, "AUDIO", audio.path, { mimeType: audio.mimeType });
    return "completed";
  }

  private async transcription(videoId: string): Promise<StepResult> {
    const existingTranscript = await this.prisma.transcript.findUnique({
      where: { videoId_type: { videoId, type: "RAW" } },
    });
    if (existingTranscript?.text) {
      return "skipped";
    }

    const audio = await this.prisma.artifact.findFirst({
      where: { videoId, type: "AUDIO" },
      orderBy: { createdAt: "desc" },
    });
    if (!audio) {
      throw new Error("Cannot transcribe because no audio artifact exists.");
    }

    const video = await this.prisma.video.findUniqueOrThrow({ where: { id: videoId } });
    const workDir = await this.workDir(videoId);
    const transcript = await this.providers.transcriptionProvider.transcribe(
      audio.path,
      workDir,
      video.language ?? undefined,
    );
    const rawPath = join(workDir, "transcripts", "raw.txt");
    await writeUtf8(rawPath, transcript.text);
    const rawArtifact = await this.upsertArtifact(videoId, "TRANSCRIPT_RAW", rawPath, {
      sourceArtifactId: audio.id,
    });
    await this.upsertTranscript(videoId, "RAW", transcript, rawArtifact.id);
    return "completed";
  }

  private async cleaning(videoId: string): Promise<StepResult> {
    const raw = await this.prisma.transcript.findUniqueOrThrow({
      where: { videoId_type: { videoId, type: "RAW" } },
    });
    const transcript = await this.providers.transcriptCleaner.clean({
      text: raw.text,
      language: raw.language ?? undefined,
      segments: parseJsonSegments(raw.segments),
    });
    const cleanPath = join(await this.workDir(videoId), "transcripts", "clean.txt");
    await writeUtf8(cleanPath, transcript.text);
    const artifact = await this.upsertArtifact(videoId, "TRANSCRIPT_CLEAN", cleanPath);
    await this.upsertTranscript(videoId, "CLEAN", transcript, artifact.id);
    return "completed";
  }

  private async chunking(videoId: string): Promise<StepResult> {
    const video = await this.prisma.video.findUniqueOrThrow({
      where: { id: videoId },
      include: { tags: { include: { tag: true } }, transcripts: true },
    });
    const tags = video.tags.map((item) => item.tag.name);

    await this.prisma.transcriptChunk.deleteMany({ where: { videoId } });

    for (const transcript of video.transcripts) {
      const sourceType: ChunkSourceType =
        transcript.type === "RAW" ? "TRANSCRIPT_RAW" : "TRANSCRIPT_CLEAN";
      const chunks = this.providers.chunker.chunk({
        sourceType,
        text: transcript.text,
        segments: parseJsonSegments(transcript.segments),
        sourceUrl: video.sourceUrl,
        tags,
      });

      if (chunks.length > 0) {
        await this.prisma.transcriptChunk.createMany({
          data: chunks.map((chunk) => ({
            videoId,
            sourceType: chunk.sourceType,
            text: chunk.text,
            normalizedText: chunk.normalizedText,
            startTime: chunk.startTime,
            endTime: chunk.endTime,
            chunkIndex: chunk.chunkIndex,
            tokenCount: chunk.tokenCount,
            characterCount: chunk.characterCount,
            sourceUrl: chunk.sourceUrl,
            tags: chunk.tags,
          })),
        });
      }
    }

    return "completed";
  }

  private async frames(videoId: string): Promise<StepResult> {
    const video = await this.prisma.video.findUniqueOrThrow({ where: { id: videoId } });
    const frames = await this.providers.thumbnailFrameExtractor.extract(video.sourceUrl, await this.workDir(videoId));

    if (frames.length === 0) {
      return "skipped";
    }

    for (const frame of frames) {
      await this.upsertArtifact(videoId, frame.timestamp === null ? "THUMBNAIL" : "FRAME", frame.path, {
        timestamp: frame.timestamp,
      });
    }

    return "completed";
  }

  private async notes(videoId: string): Promise<StepResult> {
    const video = await this.prisma.video.findUniqueOrThrow({
      where: { id: videoId },
      include: {
        tags: { include: { tag: true } },
        transcripts: { where: { type: "CLEAN" } },
      },
    });
    const cleanTranscript = video.transcripts[0];
    if (!cleanTranscript) {
      return "skipped";
    }

    await this.prisma.note.deleteMany({ where: { videoId } });

    const tags = video.tags.map((item) => item.tag.name);
    const generated = await this.providers.noteGenerator.generate({
      title: video.title,
      sourceUrl: video.sourceUrl,
      transcript: {
        text: cleanTranscript.text,
        language: cleanTranscript.language ?? undefined,
        segments: parseJsonSegments(cleanTranscript.segments),
      },
      tags,
    });

    const note = await this.prisma.note.create({
      data: {
        videoId,
        title: generated.title,
        markdown: generated.markdown,
        summary: generated.summary,
        tags: generated.tags,
      },
    });

    const notePath = join(await this.workDir(videoId), "notes", "note.md");
    await writeUtf8(notePath, generated.markdown);
    await this.upsertArtifact(videoId, "NOTE_MARKDOWN", notePath, { noteId: note.id });

    await this.createNoteChunks(videoId, note.id, "NOTE", generated.markdown, video.sourceUrl, generated.tags);
    await this.createNoteChunks(
      videoId,
      note.id,
      "SUMMARY",
      generated.sections.summary.join("\n"),
      video.sourceUrl,
      generated.tags,
    );
    await this.createNoteChunks(
      videoId,
      note.id,
      "COMMAND",
      generated.sections.commands.join("\n"),
      video.sourceUrl,
      generated.tags,
    );
    await this.createNoteChunks(
      videoId,
      note.id,
      "CONCEPT",
      generated.sections.concepts.join("\n"),
      video.sourceUrl,
      generated.tags,
    );

    return "completed";
  }

  private async indexing(videoId: string): Promise<StepResult> {
    const video = await this.prisma.video.findUniqueOrThrow({
      where: { id: videoId },
      include: {
        transcriptChunks: true,
        noteChunks: true,
      },
    });

    await this.prisma.searchIndex.deleteMany({ where: { videoId } });

    const rows: Prisma.SearchIndexCreateManyInput[] = [
      {
        videoId,
        entityType: "video",
        entityId: video.id,
        sourceType: "video",
        text: [video.title, video.channelName, video.description].filter(Boolean).join("\n"),
      },
      ...video.transcriptChunks.map((chunk) => ({
        videoId,
        entityType: "transcript_chunk",
        entityId: chunk.id,
        sourceType: chunk.sourceType,
        text: chunk.text,
        normalizedText: chunk.normalizedText,
      })),
      ...video.noteChunks.map((chunk) => ({
        videoId,
        entityType: "note_chunk",
        entityId: chunk.id,
        sourceType: chunk.sourceType,
        text: chunk.text,
        normalizedText: chunk.normalizedText,
      })),
    ];

    if (rows.length > 0) {
      await this.prisma.searchIndex.createMany({ data: rows });
    }

    return "completed";
  }

  private async createNoteChunks(
    videoId: string,
    noteId: string,
    sourceType: ChunkSourceType,
    text: string,
    sourceUrl: string,
    tags: string[],
  ): Promise<void> {
    if (!text.trim()) {
      return;
    }

    const chunks = this.providers.chunker.chunk({
      sourceType,
      text,
      sourceUrl,
      tags,
    });

    if (chunks.length === 0) {
      return;
    }

    await this.prisma.noteChunk.createMany({
      data: chunks.map((chunk) => ({
        videoId,
        noteId,
        sourceType: chunk.sourceType,
        text: chunk.text,
        normalizedText: chunk.normalizedText,
        startTime: chunk.startTime,
        endTime: chunk.endTime,
        chunkIndex: chunk.chunkIndex,
        tokenCount: chunk.tokenCount,
        characterCount: chunk.characterCount,
        sourceUrl: chunk.sourceUrl,
        tags: chunk.tags,
      })),
    });
  }

  private async upsertTranscript(
    videoId: string,
    type: TranscriptType,
    transcript: { text: string; language?: string | undefined; segments: unknown },
    sourceArtifactId?: string,
  ) {
    return this.prisma.transcript.upsert({
      where: { videoId_type: { videoId, type } },
      update: {
        text: transcript.text,
        language: transcript.language ?? null,
        segments: transcript.segments as Prisma.InputJsonValue,
        sourceArtifactId: sourceArtifactId ?? null,
      },
      create: {
        videoId,
        type,
        text: transcript.text,
        language: transcript.language ?? null,
        segments: transcript.segments as Prisma.InputJsonValue,
        sourceArtifactId: sourceArtifactId ?? null,
      },
    });
  }

  private async upsertArtifact(
    videoId: string,
    type: ArtifactType,
    path: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    const meta = await fileMetadata(path);
    await this.prisma.artifact.deleteMany({ where: { videoId, type, path } });
    return this.prisma.artifact.create({
      data: {
        videoId,
        type,
        path,
        mimeType: meta.mimeType,
        size: meta.size,
        checksum: meta.checksum,
        metadata: metadata ?? Prisma.JsonNull,
      },
    });
  }

  private async workDir(videoId: string): Promise<string> {
    const path = join(this.config.ARTIFACTS_DIR, videoId);
    await mkdir(path, { recursive: true });
    return path;
  }

  private async eventForVideo(videoId: string, level: string, message: string, metadata?: unknown) {
    const run = await this.prisma.pipelineRun.findFirst({
      where: { videoId },
      orderBy: { createdAt: "desc" },
    });

    if (!run) {
      return;
    }

    await this.event(run.id, null, level, message, metadata);
  }

  private async event(
    runId: string,
    stepId: string | null,
    level: string,
    message: string,
    metadata?: unknown,
  ) {
    await this.prisma.pipelineEvent.create({
      data: {
        runId,
        stepId,
        level,
        message,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }
}

function parseJsonSegments(value: Prisma.JsonValue): TranscriptSegment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }
      const record = item as Record<string, unknown>;
      return {
        startTime: typeof record.startTime === "number" ? record.startTime : null,
        endTime: typeof record.endTime === "number" ? record.endTime : null,
        text: typeof record.text === "string" ? record.text : "",
      };
    })
    .filter((item): item is TranscriptSegment => item !== null && item.text.length > 0);
}
