import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { normalizeWhitespace } from "@vidravault/shared";
import { parseVttFile } from "./caption-parser.js";
import type { CommandRunner } from "./command-runner.js";
import type {
  AudioExtractionResult,
  AudioExtractor,
  CaptionProvider,
  CaptionTrack,
  FrameExtractionResult,
  TranscriptResult,
  TranscriptionProvider,
  VideoMetadata,
  VideoMetadataProvider,
} from "./types.js";

export type ProviderBinaries = {
  ytdlpBin: string;
  ffmpegBin: string;
  mlxWhisperBin: string;
  mlxWhisperModel: string;
};

export class YtDlpMetadataProvider implements VideoMetadataProvider {
  constructor(
    private readonly runner: CommandRunner,
    private readonly ytdlpBin: string,
  ) {}

  async getMetadata(url: string, workDir: string): Promise<VideoMetadata> {
    await mkdir(workDir, { recursive: true });
    const result = await this.runner.run(
      this.ytdlpBin,
      ["--dump-single-json", "--no-playlist", "--no-warnings", url],
      workDir,
    );
    const raw = JSON.parse(result.stdout) as YtDlpMetadataJson;

    return {
      externalId: raw.id,
      title: raw.title ?? "Untitled video",
      channelName: raw.channel ?? raw.uploader,
      description: raw.description,
      durationSeconds: typeof raw.duration === "number" ? Math.round(raw.duration) : undefined,
      publicationDate: parseYtDlpDate(raw.upload_date),
      thumbnailUrl: raw.thumbnail,
      canonicalUrl: raw.webpage_url ?? url,
      language: raw.language,
      raw,
    };
  }
}

export class YtDlpCaptionProvider implements CaptionProvider {
  constructor(
    private readonly runner: CommandRunner,
    private readonly ytdlpBin: string,
  ) {}

  async fetchCaptions(url: string, languages: string[], workDir: string): Promise<CaptionTrack[]> {
    const captionsDir = join(workDir, "captions");
    await mkdir(captionsDir, { recursive: true });
    const languageArg = languages.join(",");

    await this.runner.run(
      this.ytdlpBin,
      [
        "--skip-download",
        "--write-subs",
        "--write-auto-subs",
        "--sub-langs",
        languageArg,
        "--sub-format",
        "vtt",
        "--no-playlist",
        "--output",
        join(captionsDir, "%(id)s.%(ext)s"),
        url,
      ],
      workDir,
    );

    const files = await readdir(captionsDir);
    return files
      .filter((file) => file.endsWith(".vtt"))
      .sort((a, b) => captionPriority(a, languages) - captionPriority(b, languages))
      .map((file) => {
        const language = inferCaptionLanguage(file, languages);
        return {
          language,
          kind: file.includes(".auto.") ? "auto" : "manual",
          path: join(captionsDir, file),
          mimeType: "text/vtt",
        };
      });
  }

  parseCaption(path: string, language?: string): Promise<TranscriptResult> {
    return parseVttFile(path, language);
  }
}

export class YtDlpAudioExtractor implements AudioExtractor {
  constructor(
    private readonly runner: CommandRunner,
    private readonly ytdlpBin: string,
  ) {}

  async extractAudio(url: string, workDir: string): Promise<AudioExtractionResult> {
    const audioDir = join(workDir, "audio");
    await mkdir(audioDir, { recursive: true });

    await this.runner.run(
      this.ytdlpBin,
      [
        "--no-playlist",
        "--extract-audio",
        "--audio-format",
        "wav",
        "--output",
        join(audioDir, "audio.%(ext)s"),
        url,
      ],
      workDir,
    );

    const files = await readdir(audioDir);
    const audioFile = files.find((file) => /\.(wav|mp3|m4a|opus)$/i.test(file));
    if (!audioFile) {
      throw new Error("yt-dlp completed but no audio file was produced.");
    }

    return {
      path: join(audioDir, audioFile),
      mimeType: mimeTypeFromPath(audioFile),
    };
  }
}

export class MlxWhisperTranscriptionProvider implements TranscriptionProvider {
  constructor(
    private readonly runner: CommandRunner,
    private readonly mlxWhisperBin: string,
    private readonly model: string,
  ) {}

  async transcribe(audioPath: string, workDir: string, language?: string): Promise<TranscriptResult> {
    const outputDir = join(workDir, "transcription");
    await mkdir(outputDir, { recursive: true });
    const args = [
      audioPath,
      "--model",
      this.model,
      "--output-format",
      "txt",
      "--output-dir",
      outputDir,
    ];

    if (language) {
      args.push("--language", language);
    }

    await this.runner.run(this.mlxWhisperBin, args, workDir);
    const files = await readdir(outputDir);
    const transcriptFile = files.find((file) => file.endsWith(".txt"));
    if (!transcriptFile) {
      throw new Error("mlx_whisper completed but no transcript text file was produced.");
    }

    const text = await readFile(join(outputDir, transcriptFile), "utf8");
    return textTranscript(text, language);
  }
}

export class MockTranscriptionProvider implements TranscriptionProvider {
  transcribe(_audioPath: string, _workDir: string, language?: string): Promise<TranscriptResult> {
    return Promise.resolve(
      textTranscript(
        "Mock transcription provider was used. Configure TRANSCRIPTION_PROVIDER=mlx-whisper to run local Whisper transcription.",
        language,
      ),
    );
  }
}

export class ThumbnailFrameExtractor {
  constructor(
    private readonly runner: CommandRunner,
    private readonly ytdlpBin: string,
  ) {}

  async extract(url: string, workDir: string): Promise<FrameExtractionResult[]> {
    const frameDir = join(workDir, "frames");
    await mkdir(frameDir, { recursive: true });
    await this.runner.run(
      this.ytdlpBin,
      [
        "--skip-download",
        "--write-thumbnail",
        "--convert-thumbnails",
        "jpg",
        "--no-playlist",
        "--output",
        join(frameDir, "thumbnail.%(ext)s"),
        url,
      ],
      workDir,
    );

    const files = await readdir(frameDir);
    return files
      .filter((file) => /\.(jpg|jpeg|png|webp)$/i.test(file))
      .map((file) => ({
        path: join(frameDir, file),
        mimeType: mimeTypeFromPath(file),
        timestamp: null,
      }));
  }
}

export async function fileMetadata(path: string): Promise<{
  size: bigint;
  checksum: string;
  mimeType: string;
}> {
  const [stats, buffer] = await Promise.all([stat(path), readFile(path)]);
  return {
    size: BigInt(stats.size),
    checksum: createHash("sha256").update(buffer).digest("hex"),
    mimeType: mimeTypeFromPath(path),
  };
}

export async function writeTextArtifact(path: string, content: string): Promise<void> {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, content, "utf8");
}

export function textTranscript(text: string, language?: string): TranscriptResult {
  const lines = text
    .split(/\n+/)
    .map(normalizeWhitespace)
    .filter(Boolean);

  return {
    language,
    text: lines.join("\n"),
    segments: lines.map((line) => ({
      startTime: null,
      endTime: null,
      text: line,
    })),
  };
}

function captionPriority(file: string, languages: string[]): number {
  const kindScore = file.includes(".auto.") ? 10 : 0;
  const language = inferCaptionLanguage(file, languages);
  const languageScore = languages.indexOf(language);
  return kindScore + (languageScore === -1 ? 99 : languageScore);
}

function inferCaptionLanguage(file: string, languages: string[]): string {
  const name = basename(file);
  const match = languages.find((language) => name.includes(`.${language}.`));
  return match ?? languages[0] ?? "en";
}

function parseYtDlpDate(value?: string): Date | undefined {
  if (!value || !/^\d{8}$/.test(value)) {
    return undefined;
  }

  const year = value.slice(0, 4);
  const month = value.slice(4, 6);
  const day = value.slice(6, 8);
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
}

function mimeTypeFromPath(path: string): string {
  const extension = extname(path).toLowerCase();
  if (extension === ".vtt") return "text/vtt";
  if (extension === ".txt") return "text/plain";
  if (extension === ".md") return "text/markdown";
  if (extension === ".json") return "application/json";
  if (extension === ".wav") return "audio/wav";
  if (extension === ".mp3") return "audio/mpeg";
  if (extension === ".m4a") return "audio/mp4";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  return "application/octet-stream";
}

type YtDlpMetadataJson = {
  id?: string;
  title?: string;
  channel?: string;
  uploader?: string;
  description?: string;
  duration?: number;
  upload_date?: string;
  thumbnail?: string;
  webpage_url?: string;
  language?: string;
};
