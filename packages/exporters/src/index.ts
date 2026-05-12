import { formatTimestamp } from "@vidravault/shared";

export type ExportVideoRecord = {
  title: string;
  sourceUrl: string;
  channelName?: string | null;
  durationSeconds?: number | null;
  tags: string[];
  createdAt: Date;
  summary?: string | null;
  markdownNotes?: string | null;
  transcriptExcerpts: Array<{
    startTime?: number | null;
    text: string;
  }>;
};

export type ExportResult = {
  fileName: string;
  content: string;
  mimeType: string;
};

export interface WikiExporter {
  export(record: ExportVideoRecord): Promise<ExportResult>;
}

export class MarkdownExporter implements WikiExporter {
  export(record: ExportVideoRecord): Promise<ExportResult> {
    const frontmatter = [
      "---",
      `title: ${quoteYaml(record.title)}`,
      `source_url: ${quoteYaml(record.sourceUrl)}`,
      `channel: ${quoteYaml(record.channelName ?? "")}`,
      `duration: ${quoteYaml(formatDuration(record.durationSeconds))}`,
      "tags:",
      ...(record.tags.length > 0 ? record.tags.map((tag) => `  - ${quoteYaml(tag)}`) : ["  []"]),
      `created_at: ${quoteYaml(record.createdAt.toISOString())}`,
      "---",
      "",
    ].join("\n");

    const body = [
      "# Summary",
      "",
      record.summary ?? "No summary generated.",
      "",
      "# Key points",
      "",
      sectionFromMarkdown(record.markdownNotes, "Key points") ?? "- No key points generated.",
      "",
      "# Commands",
      "",
      sectionFromMarkdown(record.markdownNotes, "Commands") ?? "- No commands detected.",
      "",
      "# Concepts",
      "",
      sectionFromMarkdown(record.markdownNotes, "Concepts") ?? "- No concepts detected.",
      "",
      "# Transcript excerpts",
      "",
      ...record.transcriptExcerpts.map((excerpt) => {
        const stamp = formatTimestamp(excerpt.startTime);
        return `- ${stamp ? `${stamp} - ` : ""}${excerpt.text}`;
      }),
      "",
      "# Sources",
      "",
      `- ${record.sourceUrl}`,
      "",
    ].join("\n");

    return Promise.resolve({
      fileName: `${slugify(record.title)}.md`,
      content: frontmatter + body,
      mimeType: "text/markdown",
    });
  }
}

export class NotionExporter implements WikiExporter {
  export(): Promise<ExportResult> {
    return Promise.reject(new Error("Notion export is intentionally stubbed in V1. Use MarkdownExporter."));
  }
}

export class ObsidianVaultExporter extends MarkdownExporter {}
export class MkDocsExporter extends MarkdownExporter {}
export class DocusaurusExporter extends MarkdownExporter {}
export class WikiJsExporter extends MarkdownExporter {}
export class OutlineExporter extends MarkdownExporter {}

function quoteYaml(value: string): string {
  return JSON.stringify(value);
}

function formatDuration(durationSeconds?: number | null): string {
  const stamp = formatTimestamp(durationSeconds);
  return stamp ?? "";
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function sectionFromMarkdown(markdown: string | null | undefined, heading: string): string | null {
  if (!markdown) {
    return null;
  }

  const pattern = new RegExp(`## ${heading}\\n\\n(?<body>[\\s\\S]*?)(\\n\\n## |$)`, "i");
  const match = pattern.exec(markdown);
  return match?.groups?.body?.trim() ?? null;
}
