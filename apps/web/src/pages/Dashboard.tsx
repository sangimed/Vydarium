import { Link } from "react-router-dom";
import { AlertTriangle, Database, FileSearch, Loader2, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api";
import { shortDate } from "../lib/date";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";

export function Dashboard() {
  const query = useQuery({ queryKey: ["dashboard"], queryFn: apiClient.dashboard, refetchInterval: 5000 });
  const stats = query.data?.data;

  return (
    <>
      <PageHeader
        title="Dashboard"
        actions={
          <Link to="/add">
            <Button variant="primary">
              <Plus className="size-4" aria-hidden="true" />
              Add video
            </Button>
          </Link>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Database} label="Videos" value={stats?.videos ?? 0} />
        <Metric icon={Loader2} label="Running" value={stats?.runningPipelines ?? 0} />
        <Metric icon={AlertTriangle} label="Errors" value={stats?.failedPipelines ?? 0} />
        <Metric icon={FileSearch} label="Indexed chunks" value={stats?.indexedChunks ?? 0} />
      </div>
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-stone-950">Latest videos</h2>
        {!stats?.latestVideos.length ? (
          <EmptyState title="No videos ingested yet." />
        ) : (
          <div className="overflow-hidden rounded border border-stone-200 bg-white">
            {stats.latestVideos.map((video) => (
              <Link
                to={`/videos/${video.id}`}
                key={video.id}
                className="grid gap-2 border-b border-stone-100 p-3 last:border-b-0 hover:bg-stone-50 md:grid-cols-[1fr_180px_120px]"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-stone-950">{video.title ?? video.sourceUrl}</p>
                  <p className="truncate text-sm text-stone-600">{video.channelName ?? "Unknown channel"}</p>
                </div>
                <p className="text-sm text-stone-600">{shortDate(video.createdAt)}</p>
                <StatusBadge status={video.status} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded border border-stone-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-stone-600">{label}</p>
        <Icon className="size-5 text-teal-800" aria-hidden="true" />
      </div>
      <p className="text-3xl font-semibold text-stone-950">{value}</p>
    </div>
  );
}
