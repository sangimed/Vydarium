import type { AppConfig } from "@vidravault/config";
import {
  CommandRunner,
  DeterministicChunker,
  DeterministicNoteGenerator,
  DeterministicTranscriptCleaner,
  MlxWhisperTranscriptionProvider,
  MockTranscriptionProvider,
  ThumbnailFrameExtractor,
  YtDlpAudioExtractor,
  YtDlpCaptionProvider,
  YtDlpMetadataProvider,
  type PipelineProviders,
  type TranscriptionProvider,
} from "@vidravault/pipeline";

export function makePipelineProviders(config: AppConfig): PipelineProviders & {
  thumbnailFrameExtractor: ThumbnailFrameExtractor;
} {
  const runner = new CommandRunner({
    timeoutMs: config.COMMAND_TIMEOUT_SECONDS * 1000,
  });

  return {
    metadataProvider: new YtDlpMetadataProvider(runner, config.YTDLP_BIN),
    captionProvider: new YtDlpCaptionProvider(runner, config.YTDLP_BIN),
    audioExtractor: new YtDlpAudioExtractor(runner, config.YTDLP_BIN),
    transcriptionProvider: makeTranscriptionProvider(config, runner),
    transcriptCleaner: new DeterministicTranscriptCleaner(),
    chunker: new DeterministicChunker(),
    noteGenerator: new DeterministicNoteGenerator(),
    thumbnailFrameExtractor: new ThumbnailFrameExtractor(runner, config.YTDLP_BIN),
  };
}

function makeTranscriptionProvider(
  config: AppConfig,
  runner: CommandRunner,
): TranscriptionProvider {
  if (config.TRANSCRIPTION_PROVIDER === "mlx-whisper") {
    return new MlxWhisperTranscriptionProvider(
      runner,
      config.MLX_WHISPER_BIN,
      config.MLX_WHISPER_MODEL,
    );
  }

  return new MockTranscriptionProvider();
}
