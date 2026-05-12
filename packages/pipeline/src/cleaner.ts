import { normalizeWhitespace } from "@vidravault/shared";
import type { TranscriptCleaner, TranscriptResult, TranscriptSegment } from "./types.js";

const technicalTerms: Array<[RegExp, string]> = [
  [/\bml x\b/gi, "MLX"],
  [/\bmlx whisper\b/gi, "MLX Whisper"],
  [/\bmlx_whisper\b/gi, "mlx_whisper"],
  [/\byt dlp\b/gi, "yt-dlp"],
  [/\byt-dlp\b/gi, "yt-dlp"],
  [/\bwhisper\b/gi, "Whisper"],
  [/\bllm\b/gi, "LLM"],
  [/\bapi\b/gi, "API"],
];

export class DeterministicTranscriptCleaner implements TranscriptCleaner {
  clean(transcript: TranscriptResult): Promise<TranscriptResult> {
    const segments = transcript.segments.length > 0 ? transcript.segments : textToSegments(transcript.text);

    const cleanedSegments = segments.map((segment) => ({
      ...segment,
      text: cleanText(segment.text),
    }));

    return Promise.resolve({
      language: transcript.language,
      segments: cleanedSegments,
      text: cleanedSegments.map((segment) => segment.text).join("\n"),
    });
  }
}

export function cleanText(input: string): string {
  let text = normalizeWhitespace(input)
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([([{])\s+/g, "$1")
    .replace(/\s+([)\]}])/g, "$1")
    .replace(/\s+'\s+/g, "'")
    .replace(/[’`]/g, "'")
    .replace(/\bi\s+('|’)m\b/gi, "I'm")
    .replace(/\bcan\s+('|’)t\b/gi, "can't")
    .replace(/\bdon\s+('|’)t\b/gi, "don't")
    .replace(/\s+-\s+/g, " - ");

  for (const [pattern, replacement] of technicalTerms) {
    text = text.replace(pattern, replacement);
  }

  if (text && !/[.!?:;)]$/.test(text)) {
    text += ".";
  }

  return text;
}

function textToSegments(text: string): TranscriptSegment[] {
  return text
    .split(/\n+/)
    .map((line) => cleanText(line))
    .filter(Boolean)
    .map((line) => ({
      startTime: null,
      endTime: null,
      text: line,
    }));
}
