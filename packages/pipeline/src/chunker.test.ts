import { describe, expect, it } from "vitest";
import { DeterministicChunker } from "./chunker.js";

describe("DeterministicChunker", () => {
  it("creates stable timestamped chunks from transcript segments", () => {
    const chunker = new DeterministicChunker({ targetCharacters: 60, overlapCharacters: 10 });

    const chunks = chunker.chunk({
      sourceType: "TRANSCRIPT_CLEAN",
      sourceUrl: "https://youtu.be/example",
      text: "",
      segments: [
        { startTime: 0, endTime: 10, text: "MLX Whisper can transcribe locally." },
        { startTime: 10, endTime: 20, text: "Use mlx_whisper with a model name." },
        { startTime: 20, endTime: 30, text: "Index the transcript chunks afterward." },
      ],
      tags: ["whisper"],
    });

    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toMatchObject({
      chunkIndex: 0,
      startTime: 0,
      endTime: 10,
      tags: ["whisper"],
    });
    expect(chunks[1]?.text).toContain("mlx_whisper");
  });
});
