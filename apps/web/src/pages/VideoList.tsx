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
      <div className="mb-4 grid gap-3 surface rounded-lg p-3 md:grid-cols-[1fr_180px]">
        <label className="relative block">
          <Search
            className="pointer-events-none absolute left-3 top-2.5 size-4 text-[#8a98a8]"
            aria-hidden="true"
          />
          <Input
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <select
          className="focus-ring h-10 rounded-md border border-[#cbd7e1] bg-white px-3 text-sm"
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
        <div className="overflow-x-auto surface rounded-lg">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-[#d8e2ea] bg-[#f7fafc] text-xs uppercase text-[#596776]">
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
                <tr
                  key={video.id}
                  className="border-b border-[#e4ebf1] last:border-b-0 hover:bg-[#f7fafc]"
                >
                  <td className="max-w-md px-3 py-3">
                    <Link
                      to={`/videos/${video.id}`}
                      className="font-semibold text-[#0b5954] hover:underline"
                    >
                      {video.title ?? video.sourceUrl}
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {video.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-[#edf3f7] px-1.5 py-0.5 text-xs text-[#596776]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[#334252]">{video.channelName ?? "Unknown"}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={video.status} />
                  </td>
                  <td className="px-3 py-3 text-[#334252]">{video.failedStep ?? ""}</td>
                  <td className="px-3 py-3 text-[#334252]">{shortDate(video.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
