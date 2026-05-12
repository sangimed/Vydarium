import { ExternalLink, Search } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { buildTimestampUrl } from "@vidravault/shared";
import { apiClient } from "../lib/api";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Input } from "../components/Input";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [tags, setTags] = useState("");
  const mutation = useMutation({
    mutationFn: apiClient.search,
  });
  const results = mutation.data?.data.results ?? [];

  return (
    <>
      <PageHeader title="Search" />
      <form
        className="mb-4 grid gap-3 rounded border border-stone-200 bg-white p-3 lg:grid-cols-[1fr_260px_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate({
            query,
            filters: {
              tags: splitList(tags),
            },
            limit: 12,
          });
        }}
      >
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search transcripts, notes, commands, concepts" />
        <Input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="tags" />
        <Button type="submit" variant="primary" disabled={!query || mutation.isPending}>
          <Search className="size-4" aria-hidden="true" />
          Search
        </Button>
      </form>
      {mutation.isSuccess && results.length === 0 ? <EmptyState title="No matching excerpts." /> : null}
      <div className="grid gap-3">
        {results.map((result) => (
          <article key={result.id} className="rounded border border-stone-200 bg-white p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={result.chunkType} />
              <span className="text-sm text-stone-600">score {result.score.toFixed(3)}</span>
            </div>
            <h2 className="text-lg font-semibold text-stone-950">{result.videoTitle}</h2>
            <p className="mt-1 text-sm text-stone-600">{result.channel ?? "Unknown channel"}</p>
            <p className="mt-3 leading-7 text-stone-800">{result.excerpt}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a
                href={buildTimestampUrl(result.sourceUrl, result.startTime)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm font-semibold text-teal-900 hover:underline"
              >
                {result.timestamp ?? "Open source"}
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
              {result.tags.map((tag) => (
                <span key={tag} className="rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600">
                  {tag}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}
