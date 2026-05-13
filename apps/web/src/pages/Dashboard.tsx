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
  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: apiClient.dashboard,
    refetchInterval: 5000,
  });
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Database} label="Videos" value={stats?.videos ?? 0} tone="teal" />
        <Metric icon={Loader2} label="Running" value={stats?.runningPipelines ?? 0} tone="sky" />
        <Metric
          icon={AlertTriangle}
          label="Errors"
          value={stats?.failedPipelines ?? 0}
          tone="rose"
        />
        <Metric
          icon={FileSearch}
          label="Indexed chunks"
          value={stats?.indexedChunks ?? 0}
          tone="amber"
        />
      </div>
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-[#17212b]">Latest videos</h2>
        {!stats?.latestVideos.length ? (
          <EmptyState title="No videos ingested yet." />
        ) : (
          <div className="surface overflow-hidden rounded-lg">
            {stats.latestVideos.map((video) => (
              <Link
                to={`/videos/${video.id}`}
                key={video.id}
                className="grid gap-2 border-b border-[#e4ebf1] p-4 last:border-b-0 hover:bg-[#f7fafc] md:grid-cols-[1fr_180px_120px]"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#17212b]">
                    {video.title ?? video.sourceUrl}
                  </p>
                  <p className="truncate text-sm text-[#596776]">
                    {video.channelName ?? "Unknown channel"}
                  </p>
                </div>
                <p className="text-sm text-[#596776]">{shortDate(video.createdAt)}</p>
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
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "teal" | "sky" | "rose" | "amber";
}) {
  const tones = {
    teal: "bg-[#e7f5f3] text-[#0f766e]",
    sky: "bg-sky-100 text-sky-800",
    rose: "bg-rose-100 text-rose-800",
    amber: "bg-amber-100 text-amber-900",
  };

  return (
    <div className="surface rounded-lg p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-[#596776]">{label}</p>
        <span className={`flex size-9 items-center justify-center rounded-md ${tones[tone]}`}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
      <p className="text-3xl font-semibold text-[#17212b]">{value}</p>
    </div>
  );
}
