import { formatTimestamp, normalizeWhitespace } from "@vidravault/shared";
import type { GeneratedNote, NoteGenerator, TranscriptResult } from "./types.js";

const commandPattern =
  /\b(?:pnpm|npm|npx|yarn|bun|docker|docker compose|yt-dlp|ffmpeg|mlx_whisper|python|pip|uv|curl|wget|git)\b[^\n.]{0,220}/gi;

export class DeterministicNoteGenerator implements NoteGenerator {
  generate(input: {
    title?: string | null;
    sourceUrl: string;
    transcript: TranscriptResult;
    tags: string[];
  }): Promise<GeneratedNote> {
    const sentences = splitSentences(input.transcript.text);
    const summary = sentences.slice(0, 4).join(" ");
    const keyPoints = pickKeyPoints(sentences);
    const commands = extractCommands(input.transcript.text);
    const concepts = extractConcepts(input.transcript.text, input.tags);
    const quotes = pickTimestampedQuotes(input.transcript);
    const suggestedTags = Array.from(new Set([...input.tags, ...concepts.map(slugify)])).slice(0, 12);
    const title = input.title ?? "Untitled video";

    const markdown = [
      `# ${title}`,
      "",
      "## Summary",
      "",
      summary || "No transcript text was available for summary generation.",
      "",
      "## Key points",
      "",
      ...listOrFallback(keyPoints, "No key points detected yet."),
      "",
      "## Commands",
      "",
      ...listOrFallback(commands, "No commands detected."),
      "",
      "## Concepts",
      "",
      ...listOrFallback(concepts, "No technical concepts detected."),
      "",
      "## Transcript excerpts",
      "",
      ...listOrFallback(quotes, "No timestamped excerpts available."),
      "",
      "## Sources",
      "",
      `- ${input.sourceUrl}`,
      "",
      "## Open questions",
      "",
      "- What should be verified before reusing this information?",
    ].join("\n");

    return Promise.resolve({
      title,
      summary,
      markdown,
      tags: suggestedTags,
      sections: {
        summary: summary ? [summary] : [],
        keyPoints,
        commands,
        concepts,
        quotes,
        openQuestions: ["What should be verified before reusing this information?"],
      },
    });
  }
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\n/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map(normalizeWhitespace)
    .filter((sentence) => sentence.length > 40);
}

function pickKeyPoints(sentences: string[]): string[] {
  return sentences
    .filter((sentence) =>
      /\b(should|important|because|use|configure|install|run|local|search|index|transcript|caption|Whisper|MLX|API|LLM)\b/i.test(
        sentence,
      ),
    )
    .slice(0, 8);
}

function extractCommands(text: string): string[] {
  return Array.from(new Set(Array.from(text.matchAll(commandPattern)).map((match) => normalizeWhitespace(match[0]))))
    .filter((command) => command.length > 4)
    .slice(0, 12);
}

function extractConcepts(text: string, tags: string[]): string[] {
  const concepts = new Set<string>(tags);
  const known = [
    "MLX",
    "Whisper",
    "yt-dlp",
    "ffmpeg",
    "LLM",
    "API",
    "transcription",
    "captions",
    "retrieval",
    "indexing",
    "chunking",
  ];

  for (const concept of known) {
    if (new RegExp(`\\b${escapeRegExp(concept)}\\b`, "i").test(text)) {
      concepts.add(concept);
    }
  }

  return Array.from(concepts).slice(0, 12);
}

function pickTimestampedQuotes(transcript: TranscriptResult): string[] {
  return transcript.segments
    .filter((segment) => segment.text.length > 80 && segment.startTime !== null)
    .slice(0, 8)
    .map((segment) => {
      const timestamp = formatTimestamp(segment.startTime);
      return timestamp ? `${timestamp} - ${segment.text}` : segment.text;
    });
}

function listOrFallback(items: string[], fallback: string): string[] {
  return items.length > 0 ? items.map((item) => `- ${item}`) : [`- ${fallback}`];
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
