import { normalizeWhitespace } from "@vidravault/shared";
import type { ChunkInput, ChunkOutput, Chunker, TranscriptSegment } from "./types.js";

export type DeterministicChunkerOptions = {
  targetCharacters: number;
  overlapCharacters: number;
};

export class DeterministicChunker implements Chunker {
  constructor(
    private readonly options: DeterministicChunkerOptions = {
      targetCharacters: 1200,
      overlapCharacters: 160,
    },
  ) {}

  chunk(input: ChunkInput): ChunkOutput[] {
    if (input.segments && input.segments.length > 0) {
      return this.chunkSegments(input);
    }

    return this.chunkText(input);
  }

  private chunkSegments(input: ChunkInput): ChunkOutput[] {
    const segments = input.segments ?? [];
    const chunks: ChunkOutput[] = [];
    let buffer: TranscriptSegment[] = [];
    let characterCount = 0;

    const flush = () => {
      if (buffer.length === 0) {
        return;
      }

      const text = normalizeWhitespace(buffer.map((segment) => segment.text).join(" "));
      if (!text) {
        buffer = [];
        characterCount = 0;
        return;
      }

      chunks.push(toChunk(input, text, chunks.length, buffer[0]?.startTime ?? null, buffer.at(-1)?.endTime ?? null));

      const overlap: TranscriptSegment[] = [];
      let overlapSize = 0;
      for (let index = buffer.length - 1; index >= 0; index -= 1) {
        const segment = buffer[index];
        if (!segment) {
          continue;
        }
        overlap.unshift(segment);
        overlapSize += segment.text.length;
        if (overlapSize >= this.options.overlapCharacters) {
          break;
        }
      }

      buffer = overlap;
      characterCount = overlapSize;
    };

    for (const segment of segments) {
      const text = normalizeWhitespace(segment.text);
      if (!text) {
        continue;
      }

      if (characterCount + text.length > this.options.targetCharacters && buffer.length > 0) {
        flush();
      }

      buffer.push({ ...segment, text });
      characterCount += text.length;
    }

    flush();
    return dedupeSequential(chunks);
  }

  private chunkText(input: ChunkInput): ChunkOutput[] {
    const paragraphs = input.text
      .split(/\n{2,}|\n/)
      .map(normalizeWhitespace)
      .filter(Boolean);
    const chunks: ChunkOutput[] = [];
    let buffer = "";

    const flush = () => {
      const text = normalizeWhitespace(buffer);
      if (text) {
        chunks.push(toChunk(input, text, chunks.length, null, null));
      }
      buffer = "";
    };

    for (const paragraph of paragraphs) {
      if (buffer.length + paragraph.length > this.options.targetCharacters && buffer) {
        flush();
      }
      buffer = normalizeWhitespace(`${buffer} ${paragraph}`);
    }

    flush();
    return chunks;
  }
}

function toChunk(
  input: ChunkInput,
  text: string,
  index: number,
  startTime: number | null,
  endTime: number | null,
): ChunkOutput {
  const normalizedText = normalizeWhitespace(text.toLowerCase());
  return {
    sourceType: input.sourceType,
    text,
    normalizedText,
    startTime,
    endTime,
    chunkIndex: index,
    tokenCount: estimateTokens(text),
    characterCount: text.length,
    sourceUrl: input.sourceUrl,
    tags: input.tags ?? [],
  };
}

function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.3);
}

function dedupeSequential(chunks: ChunkOutput[]): ChunkOutput[] {
  return chunks.filter((chunk, index) => index === 0 || chunk.text !== chunks[index - 1]?.text);
}
