CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE "Role" AS ENUM ('OWNER', 'MEMBER');
CREATE TYPE "SourceType" AS ENUM ('YOUTUBE', 'OTHER');
CREATE TYPE "VideoStatus" AS ENUM ('QUEUED', 'PROCESSING', 'READY', 'FAILED', 'DELETED');
CREATE TYPE "PipelineRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "PipelineStepName" AS ENUM ('CAPTURE', 'CAPTIONS', 'AUDIO', 'TRANSCRIPTION', 'CLEANING', 'CHUNKING', 'FRAMES', 'NOTES', 'INDEXING');
CREATE TYPE "StepStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED');
CREATE TYPE "ArtifactType" AS ENUM ('CAPTION', 'AUDIO', 'TRANSCRIPT_RAW', 'TRANSCRIPT_CLEAN', 'FRAME', 'NOTE_MARKDOWN', 'METADATA_JSON', 'THUMBNAIL');
CREATE TYPE "TranscriptType" AS ENUM ('RAW', 'CLEAN');
CREATE TYPE "ChunkSourceType" AS ENUM ('TRANSCRIPT_RAW', 'TRANSCRIPT_CLEAN', 'NOTE', 'SUMMARY', 'COMMAND', 'QUOTE', 'CONCEPT');
CREATE TYPE "ExportJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "displayName" TEXT,
  "role" "Role" NOT NULL DEFAULT 'OWNER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApiToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "lastUsedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "ApiToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Video" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT,
  "sourceUrl" TEXT NOT NULL,
  "canonicalUrl" TEXT,
  "sourceType" "SourceType" NOT NULL DEFAULT 'YOUTUBE',
  "title" TEXT,
  "channelName" TEXT,
  "description" TEXT,
  "durationSeconds" INTEGER,
  "publicationDate" TIMESTAMP(3),
  "thumbnailPath" TEXT,
  "status" "VideoStatus" NOT NULL DEFAULT 'QUEUED',
  "language" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VideoSource" (
  "id" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "provider" "SourceType" NOT NULL DEFAULT 'YOUTUBE',
  "externalId" TEXT,
  "url" TEXT NOT NULL,
  "canonicalUrl" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VideoSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PipelineRun" (
  "id" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "createdById" TEXT,
  "status" "PipelineRunStatus" NOT NULL DEFAULT 'QUEUED',
  "requestedStep" "PipelineStepName",
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PipelineRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PipelineStep" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "name" "PipelineStepName" NOT NULL,
  "status" "StepStatus" NOT NULL DEFAULT 'PENDING',
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "error" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "logs" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PipelineStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PipelineEvent" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "stepId" TEXT,
  "level" TEXT NOT NULL DEFAULT 'info',
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PipelineEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Artifact" (
  "id" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "type" "ArtifactType" NOT NULL,
  "path" TEXT NOT NULL,
  "mimeType" TEXT,
  "size" BIGINT,
  "checksum" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Artifact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Transcript" (
  "id" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "type" "TranscriptType" NOT NULL,
  "language" TEXT,
  "text" TEXT NOT NULL,
  "segments" JSONB,
  "sourceArtifactId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Transcript_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TranscriptChunk" (
  "id" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "sourceType" "ChunkSourceType" NOT NULL,
  "text" TEXT NOT NULL,
  "normalizedText" TEXT,
  "startTime" DOUBLE PRECISION,
  "endTime" DOUBLE PRECISION,
  "chunkIndex" INTEGER NOT NULL,
  "tokenCount" INTEGER,
  "characterCount" INTEGER NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "embeddingId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TranscriptChunk_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Note" (
  "id" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "title" TEXT,
  "markdown" TEXT NOT NULL,
  "summary" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NoteChunk" (
  "id" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "noteId" TEXT NOT NULL,
  "sourceType" "ChunkSourceType" NOT NULL,
  "text" TEXT NOT NULL,
  "normalizedText" TEXT,
  "startTime" DOUBLE PRECISION,
  "endTime" DOUBLE PRECISION,
  "chunkIndex" INTEGER NOT NULL,
  "tokenCount" INTEGER,
  "characterCount" INTEGER NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "embeddingId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NoteChunk_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Tag" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VideoTag" (
  "videoId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  CONSTRAINT "VideoTag_pkey" PRIMARY KEY ("videoId","tagId")
);

CREATE TABLE "SearchIndex" (
  "id" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "normalizedText" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SearchIndex_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExportJob" (
  "id" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "target" TEXT NOT NULL,
  "status" "ExportJobStatus" NOT NULL DEFAULT 'QUEUED',
  "artifactId" TEXT,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "ExportJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "ApiToken_tokenHash_key" ON "ApiToken"("tokenHash");
CREATE UNIQUE INDEX "PipelineStep_runId_name_key" ON "PipelineStep"("runId","name");
CREATE UNIQUE INDEX "Transcript_videoId_type_key" ON "Transcript"("videoId","type");
CREATE UNIQUE INDEX "TranscriptChunk_videoId_sourceType_chunkIndex_key" ON "TranscriptChunk"("videoId","sourceType","chunkIndex");
CREATE UNIQUE INDEX "NoteChunk_noteId_sourceType_chunkIndex_key" ON "NoteChunk"("noteId","sourceType","chunkIndex");
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");
CREATE UNIQUE INDEX "SearchIndex_entityType_entityId_key" ON "SearchIndex"("entityType","entityId");

CREATE INDEX "ApiToken_userId_idx" ON "ApiToken"("userId");
CREATE INDEX "Video_status_idx" ON "Video"("status");
CREATE INDEX "Video_sourceType_idx" ON "Video"("sourceType");
CREATE INDEX "Video_createdAt_idx" ON "Video"("createdAt");
CREATE INDEX "VideoSource_provider_externalId_idx" ON "VideoSource"("provider","externalId");
CREATE INDEX "VideoSource_videoId_idx" ON "VideoSource"("videoId");
CREATE INDEX "PipelineRun_videoId_idx" ON "PipelineRun"("videoId");
CREATE INDEX "PipelineRun_status_idx" ON "PipelineRun"("status");
CREATE INDEX "PipelineStep_videoId_name_idx" ON "PipelineStep"("videoId","name");
CREATE INDEX "PipelineStep_status_idx" ON "PipelineStep"("status");
CREATE INDEX "PipelineEvent_runId_createdAt_idx" ON "PipelineEvent"("runId","createdAt");
CREATE INDEX "PipelineEvent_stepId_idx" ON "PipelineEvent"("stepId");
CREATE INDEX "Artifact_videoId_type_idx" ON "Artifact"("videoId","type");
CREATE INDEX "Transcript_videoId_idx" ON "Transcript"("videoId");
CREATE INDEX "TranscriptChunk_videoId_sourceType_idx" ON "TranscriptChunk"("videoId","sourceType");
CREATE INDEX "TranscriptChunk_chunkIndex_idx" ON "TranscriptChunk"("chunkIndex");
CREATE INDEX "Note_videoId_idx" ON "Note"("videoId");
CREATE INDEX "NoteChunk_videoId_sourceType_idx" ON "NoteChunk"("videoId","sourceType");
CREATE INDEX "VideoTag_tagId_idx" ON "VideoTag"("tagId");
CREATE INDEX "SearchIndex_videoId_idx" ON "SearchIndex"("videoId");
CREATE INDEX "SearchIndex_sourceType_idx" ON "SearchIndex"("sourceType");
CREATE INDEX "ExportJob_videoId_idx" ON "ExportJob"("videoId");
CREATE INDEX "ExportJob_status_idx" ON "ExportJob"("status");

CREATE INDEX "Video_search_text_idx" ON "Video" USING GIN (
  to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("description", '') || ' ' || coalesce("channelName", ''))
);
CREATE INDEX "TranscriptChunk_search_text_idx" ON "TranscriptChunk" USING GIN (to_tsvector('simple', "text"));
CREATE INDEX "NoteChunk_search_text_idx" ON "NoteChunk" USING GIN (to_tsvector('simple', "text"));
CREATE INDEX "SearchIndex_text_idx" ON "SearchIndex" USING GIN (to_tsvector('simple', "text"));

ALTER TABLE "ApiToken" ADD CONSTRAINT "ApiToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Video" ADD CONSTRAINT "Video_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VideoSource" ADD CONSTRAINT "VideoSource_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PipelineRun" ADD CONSTRAINT "PipelineRun_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PipelineRun" ADD CONSTRAINT "PipelineRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PipelineStep" ADD CONSTRAINT "PipelineStep_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PipelineRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PipelineStep" ADD CONSTRAINT "PipelineStep_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PipelineEvent" ADD CONSTRAINT "PipelineEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PipelineRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PipelineEvent" ADD CONSTRAINT "PipelineEvent_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "PipelineStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transcript" ADD CONSTRAINT "Transcript_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TranscriptChunk" ADD CONSTRAINT "TranscriptChunk_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NoteChunk" ADD CONSTRAINT "NoteChunk_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NoteChunk" ADD CONSTRAINT "NoteChunk_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoTag" ADD CONSTRAINT "VideoTag_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoTag" ADD CONSTRAINT "VideoTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SearchIndex" ADD CONSTRAINT "SearchIndex_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
