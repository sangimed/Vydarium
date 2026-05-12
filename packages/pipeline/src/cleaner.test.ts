import { describe, expect, it } from "vitest";
import { cleanText } from "./cleaner.js";

describe("cleanText", () => {
  it("normalizes spacing, punctuation, and common technical terms", () => {
    expect(cleanText("use yt dlp with mlx whisper  now")).toBe(
      "use yt-dlp with MLX Whisper now.",
    );
  });
});
