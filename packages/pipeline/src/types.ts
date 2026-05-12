import type { ChunkSourceType } from "@vidravault/shared";

export type VideoMetadata = {
  externalId?: string | undefined;
  title: string;
  channelName?: string | undefined;
  description?: string | undefined;
  durationSeconds?: number | undefined;
  publicationDate?: Date | undefined;
  thumbnailUrl?: string | undefined;
  canonicalUrl?: string | undefined;
  language?: string | undefined;
  raw: unknown;
};

export type CaptionTrack = {
  language: string;
  kind: "manual" | "auto";
  path: string;
  mimeType: string;
};

export type TranscriptSegment = {
  startTime: number | null;
  endTime: number | null;
  text: string;
};

export type TranscriptResult = {
  text: string;
  language?: string | undefined;
  segments: TranscriptSegment[];
};

export type AudioExtractionResult = {
  path: string;
  mimeType: string;
};

export type FrameExtractionResult = {
  path: string;
  mimeType: string;
  timestamp: number | null;
};

export type ChunkInput = {
  sourceType: ChunkSourceType;
  text: string;
  sourceUrl: string;
  segments?: TranscriptSegment[] | undefined;
  tags?: string[] | undefined;
};

export type ChunkOutput = {
  sourceType: ChunkSourceType;
  text: string;
  normalizedText: string;
  startTime: number | null;
  endTime: number | null;
  chunkIndex: number;
  tokenCount: number;
  characterCount: number;
  sourceUrl: string;
  tags: string[];
};

export type GeneratedNote = {
  title: string;
  summary: string;
  markdown: string;
  tags: string[];
  sections: {
    summary: string[];
    keyPoints: string[];
    commands: string[];
    concepts: string[];
    quotes: string[];
    openQuestions: string[];
  };
};

export type VideoMetadataProvider = {
  getMetadata(url: string, workDir: string): Promise<VideoMetadata>;
};

export type CaptionProvider = {
  fetchCaptions(url: string, languages: string[], workDir: string): Promise<CaptionTrack[]>;
  parseCaption(path: string, language?: string): Promise<TranscriptResult>;
};

export type AudioExtractor = {
  extractAudio(url: string, workDir: string): Promise<AudioExtractionResult>;
};

export type TranscriptionProvider = {
  transcribe(audioPath: string, workDir: string, language?: string): Promise<TranscriptResult>;
};

export type TranscriptCleaner = {
  clean(transcript: TranscriptResult): Promise<TranscriptResult>;
};

export type Chunker = {
  chunk(input: ChunkInput): ChunkOutput[];
};

export type NoteGenerator = {
  generate(input: {
    title?: string | null;
    sourceUrl: string;
    transcript: TranscriptResult;
    tags: string[];
  }): Promise<GeneratedNote>;
};

export type SearchIndexer = {
  indexVideo(videoId: string): Promise<void>;
};

export type PipelineProviders = {
  metadataProvider: VideoMetadataProvider;
  captionProvider: CaptionProvider;
  audioExtractor: AudioExtractor;
  transcriptionProvider: TranscriptionProvider;
  transcriptCleaner: TranscriptCleaner;
  chunker: Chunker;
  noteGenerator: NoteGenerator;
};
