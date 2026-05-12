import { Link } from "react-router-dom";
import { RefreshCcw, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { apiClient } from "../lib/api";
import { shortDate } from "../lib/date";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Input } from "../components/Input";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";

export function VideoList() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (status) params.set("status", status);
    const value = params.toString();
    return value ? `?${value}` : "";
  }, [search, status]);
  const query = useQuery({
    queryKey: ["videos", queryString],
    queryFn: () => apiClient.videos(queryString),
    refetchInterval: 5000,
  });
  const videos = query.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Videos"
        actions={
          <Button onClick={() => void query.refetch()}>
            <RefreshCcw className="size-4" aria-hidden="true" />
            Refresh
          </Button>
        }
      />
      <div className="mb-4 grid gap-3 rounded border border-stone-200 bg-white p-3 md:grid-cols-[1fr_180px]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-stone-400" aria-hidden="true" />
          <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <select
          className="focus-ring h-10 rounded border border-stone-300 bg-white px-3 text-sm"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">Any status</option>
          <option value="QUEUED">Queued</option>
          <option value="PROCESSING">Processing</option>
          <option value="READY">Ready</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>
      {videos.length === 0 ? (
        <EmptyState title="No matching videos." />
      ) : (
        <div className="overflow-x-auto rounded border border-stone-200 bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-600">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Channel</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Failed step</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((video) => (
                <tr key={video.id} className="border-b border-stone-100 last:border-b-0 hover:bg-stone-50">
                  <td className="max-w-md px-3 py-3">
                    <Link to={`/videos/${video.id}`} className="font-semibold text-teal-900 hover:underline">
                      {video.title ?? video.sourceUrl}
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {video.tags.map((tag) => (
                        <span key={tag} className="rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-stone-700">{video.channelName ?? "Unknown"}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={video.status} />
                  </td>
                  <td className="px-3 py-3 text-stone-700">{video.failedStep ?? ""}</td>
                  <td className="px-3 py-3 text-stone-700">{shortDate(video.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
