import { useState } from "react";
import { useParams } from "react-router-dom";
import { Download, ExternalLink, RefreshCcw, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buildTimestampUrl, formatTimestamp } from "@vidravault/shared";
import { apiBasePath } from "../runtime";
import { apiClient, type VideoRecord } from "../lib/api";
import { shortDate } from "../lib/date";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";

const tabs = ["pipeline", "transcripts", "chunks", "notes", "frames", "logs"] as const;
type Tab = (typeof tabs)[number];

export function VideoDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("pipeline");
  const query = useQuery({
    queryKey: ["video", id],
    queryFn: () => apiClient.video(id ?? ""),
    enabled: Boolean(id),
    refetchInterval: 5000,
  });
  const retry = useMutation({
    mutationFn: (step?: string) => apiClient.retryVideo(id ?? "", step),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["video", id] });
    },
  });
  const exportMarkdown = useMutation({
    mutationFn: () => apiClient.exportMarkdown(id ?? ""),
  });
  const remove = useMutation({
    mutationFn: () => apiClient.deleteVideo(id ?? ""),
  });
  const video = query.data?.data;

  if (!video) {
    return (
      <>
        <PageHeader title="Video" />
        <EmptyState title="Loading video record." />
      </>
    );
  }

  const latestRun = video.pipelineRuns[0];

  return (
    <>
      <PageHeader
        title={video.title ?? "Untitled video"}
        actions={
          <>
            <Button onClick={() => retry.mutate(undefined)} disabled={retry.isPending}>
              <RefreshCcw className="size-4" aria-hidden="true" />
              Retry
            </Button>
            <Button onClick={() => exportMarkdown.mutate()} disabled={exportMarkdown.isPending}>
              <Download className="size-4" aria-hidden="true" />
              Export
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirm("Delete this video and its artifacts?")) {
                  remove.mutate();
                }
              }}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </>
        }
      />
      <section className="mb-4 surface rounded-lg p-4">
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <div className="aspect-video overflow-hidden rounded-md bg-[#edf3f7]">
            {video.thumbnailPath ? (
              <img src={video.thumbnailPath} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-sm text-[#6b7a89]">
                No thumbnail
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={video.status} />
              {video.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-[#edf3f7] px-2 py-1 text-xs font-semibold text-[#596776]"
                >
                  {tag}
                </span>
              ))}
            </div>
            <dl className="grid gap-3 text-sm md:grid-cols-2">
              <Meta label="Channel" value={video.channelName ?? "Unknown"} />
              <Meta label="Language" value={video.language ?? "Unknown"} />
              <Meta label="Created" value={shortDate(video.createdAt)} />
              <Meta label="Duration" value={formatTimestamp(video.durationSeconds) ?? "Unknown"} />
            </dl>
            <a
              href={video.canonicalUrl ?? video.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#0b5954] hover:underline"
            >
              Open source
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {tabs.map((item) => (
          <button
            key={item}
            className={`focus-ring h-9 shrink-0 rounded-md border px-3 text-sm font-semibold capitalize ${
              tab === item
                ? "border-[#0f766e] bg-[#0f766e] text-white"
                : "border-[#cbd7e1] bg-white text-[#334252]"
            }`}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {tab === "pipeline" ? (
        <PipelineTab video={video} onRetry={(step) => retry.mutate(step)} />
      ) : null}
      {tab === "transcripts" ? <TranscriptTab video={video} /> : null}
      {tab === "chunks" ? <ChunksTab video={video} /> : null}
      {tab === "notes" ? <NotesTab video={video} /> : null}
      {tab === "frames" ? <FramesTab video={video} /> : null}
      {tab === "logs" ? <LogsTab run={latestRun} /> : null}
    </>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-[#6b7a89]">{label}</dt>
      <dd className="mt-1 truncate text-[#334252]">{value}</dd>
    </div>
  );
}

function PipelineTab({ video, onRetry }: { video: VideoRecord; onRetry: (step: string) => void }) {
  const latest = video.pipelineRuns[0];
  if (!latest) return <EmptyState title="No pipeline run recorded." />;

  return (
    <div className="surface rounded-lg">
      {latest.steps.map((step) => (
        <div
          key={step.id}
          className="grid gap-3 border-b border-[#e4ebf1] p-3 last:border-b-0 md:grid-cols-[180px_120px_1fr_auto]"
        >
          <p className="font-semibold text-[#17212b]">{step.name}</p>
          <StatusBadge status={step.status} />
          <p className="min-w-0 text-sm text-rose-700">{step.error}</p>
          <Button onClick={() => onRetry(step.name)}>Retry</Button>
        </div>
      ))}
    </div>
  );
}

function TranscriptTab({ video }: { video: VideoRecord }) {
  if (video.transcripts.length === 0) return <EmptyState title="No transcripts available." />;
  return (
    <div className="grid gap-4">
      {video.transcripts.map((transcript) => (
        <section key={transcript.id} className="surface rounded-lg p-4">
          <div className="mb-3 flex items-center gap-2">
            <StatusBadge status={transcript.type} />
            <span className="text-sm text-[#596776]">{transcript.language ?? ""}</span>
          </div>
          <pre className="max-h-[520px] whitespace-pre-wrap overflow-auto rounded-md bg-[#111827] p-4 text-sm leading-7 text-[#f4f7fb]">
            {transcript.text}
          </pre>
        </section>
      ))}
    </div>
  );
}

function ChunksTab({ video }: { video: VideoRecord }) {
  const chunks = video.transcriptChunks;
  if (chunks.length === 0) return <EmptyState title="No chunks generated." />;
  return (
    <div className="grid gap-3">
      {chunks.map((chunk) => (
        <article key={chunk.id} className="surface rounded-lg p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={chunk.sourceType} />
            <span className="text-sm text-[#596776]">#{chunk.chunkIndex}</span>
            {chunk.startTime !== null ? (
              <a
                className="text-sm font-semibold text-[#0b5954] hover:underline"
                href={buildTimestampUrl(video.sourceUrl, chunk.startTime)}
                target="_blank"
                rel="noreferrer"
              >
                {formatTimestamp(chunk.startTime)}
              </a>
            ) : null}
          </div>
          <p className="leading-7 text-[#334252]">{chunk.text}</p>
        </article>
      ))}
    </div>
  );
}

function NotesTab({ video }: { video: VideoRecord }) {
  if (video.notes.length === 0) return <EmptyState title="No notes generated." />;
  return (
    <div className="grid gap-4">
      {video.notes.map((note) => (
        <section key={note.id} className="surface rounded-lg p-4">
          <pre className="whitespace-pre-wrap text-sm leading-7 text-[#334252]">
            {note.markdown}
          </pre>
        </section>
      ))}
    </div>
  );
}

function FramesTab({ video }: { video: VideoRecord }) {
  const frames = video.artifacts.filter(
    (artifact) => artifact.type === "FRAME" || artifact.type === "THUMBNAIL",
  );
  if (frames.length === 0) return <EmptyState title="No frames extracted." />;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {frames.map((frame) => (
        <a
          key={frame.id}
          href={`${apiBasePath}${frame.downloadUrl}`}
          target="_blank"
          rel="noreferrer"
          className="overflow-hidden surface rounded-lg"
        >
          <img
            src={`${apiBasePath}${frame.downloadUrl}`}
            alt={frame.fileName}
            className="aspect-video w-full object-cover"
          />
          <p className="truncate p-2 text-sm font-semibold text-[#334252]">{frame.fileName}</p>
        </a>
      ))}
    </div>
  );
}

function LogsTab({ run }: { run: VideoRecord["pipelineRuns"][number] | undefined }) {
  if (!run) return <EmptyState title="No logs available." />;
  return (
    <div className="surface rounded-lg">
      {run.events.map((event) => (
        <div
          key={event.id}
          className="grid gap-2 border-b border-[#e4ebf1] p-3 text-sm last:border-b-0 md:grid-cols-[180px_90px_1fr]"
        >
          <span className="text-[#6b7a89]">{shortDate(event.createdAt)}</span>
          <span
            className={
              event.level === "error"
                ? "font-semibold text-rose-700"
                : "font-semibold text-[#334252]"
            }
          >
            {event.level}
          </span>
          <span className="text-[#334252]">{event.message}</span>
        </div>
      ))}
    </div>
  );
}
