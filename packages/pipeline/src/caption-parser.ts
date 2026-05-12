import { readFile } from "node:fs/promises";
import type { TranscriptResult, TranscriptSegment } from "./types.js";

const timestampPattern =
  /(?<start>\d{2}:\d{2}:\d{2}[.,]\d{3}|\d{2}:\d{2}[.,]\d{3})\s+-->\s+(?<end>\d{2}:\d{2}:\d{2}[.,]\d{3}|\d{2}:\d{2}[.,]\d{3})/;

export function parseTimestamp(value: string): number {
  const normalized = value.replace(",", ".");
  const parts = normalized.split(":");
  const secondsPart = parts.pop() ?? "0";
  const seconds = Number(secondsPart);
  const minutes = Number(parts.pop() ?? "0");
  const hours = Number(parts.pop() ?? "0");
  return hours * 3600 + minutes * 60 + seconds;
}

export async function parseVttFile(path: string, language?: string): Promise<TranscriptResult> {
  const content = await readFile(path, "utf8");
  const segments = parseVtt(content);
  return {
    language,
    segments,
    text: segments.map((segment) => segment.text).join("\n"),
  };
}

export function parseVtt(content: string): TranscriptSegment[] {
  const blocks = content
    .replace(/\r/g, "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const segments: TranscriptSegment[] = [];

  for (const block of blocks) {
    if (block === "WEBVTT" || block.startsWith("NOTE")) {
      continue;
    }

    const lines = block.split("\n").filter(Boolean);
    const timingIndex = lines.findIndex((line) => timestampPattern.test(line));
    if (timingIndex === -1) {
      continue;
    }

    const timingLine = lines[timingIndex];
    if (!timingLine) {
      continue;
    }
    const match = timestampPattern.exec(timingLine);
    if (!match?.groups?.start || !match.groups.end) {
      continue;
    }

    const text = lines
      .slice(timingIndex + 1)
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .replace(/\{\\.*?\}/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!text) {
      continue;
    }

    segments.push({
      startTime: parseTimestamp(match.groups.start),
      endTime: parseTimestamp(match.groups.end),
      text,
    });
  }

  return segments;
}
