import type { DashboardStats, RetrievalSearchInput, SearchResult, VideoListItem } from "@vidravault/shared";

const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL ?? "");

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
    ...init,
  });

  const contentType = response.headers.get("content-type");
  const body: unknown = contentType?.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof body === "object" && body && "error" in body
        ? (body as { error: { message: string } }).error.message
        : "Request failed.";
    throw new Error(message);
  }

  return body as T;
}

export type Envelope<T> = { data: T };

export const apiClient = {
  me: () => api<Envelope<{ user: { id: string; email: string; role: string } }>>("/api/auth/me"),
  login: (email: string, password: string) =>
    api<Envelope<{ user: { id: string; email: string; role: string } }>>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => api<Envelope<{ ok: true }>>("/api/auth/logout", { method: "POST" }),
  dashboard: () => api<Envelope<DashboardStats>>("/api/dashboard"),
  videos: (query = "") => api<Envelope<VideoListItem[]>>(`/api/videos${query}`),
  video: (id: string) => api<Envelope<VideoRecord>>(`/api/videos/${id}`),
  addVideo: (body: unknown) =>
    api<Envelope<{ videoId: string; runId: string }>>("/api/videos", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  retryVideo: (id: string, step?: string) =>
    api<Envelope<{ runId: string }>>(`/api/videos/${id}/retry`, {
      method: "POST",
      body: JSON.stringify({ step }),
    }),
  deleteVideo: (id: string) =>
    api<Envelope<{ ok: true }>>(`/api/videos/${id}`, {
      method: "DELETE",
    }),
  search: (body: RetrievalSearchInput) =>
    api<Envelope<{ results: SearchResult[] }>>("/api/retrieval/search", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  settings: () => api<Envelope<Record<string, unknown>>>("/api/settings"),
  exportMarkdown: (id: string) =>
    api<Envelope<{ fileName: string; size: string; checksum: string }>>(`/api/export/videos/${id}/markdown`, {
      method: "POST",
    }),
};

export type VideoRecord = {
  id: string;
  title: string | null;
  sourceUrl: string;
  canonicalUrl: string | null;
  sourceType: string;
  channelName: string | null;
  description: string | null;
  durationSeconds: number | null;
  thumbnailPath: string | null;
  status: string;
  language: string | null;
  createdAt: string;
  updatedAt: string;
  publicationDate: string | null;
  tags: string[];
  artifacts: Array<{
    id: string;
    type: string;
    fileName: string;
    mimeType: string | null;
    size: string | null;
    checksum: string | null;
    metadata: unknown;
    downloadUrl: string;
  }>;
  pipelineRuns: Array<{
    id: string;
    status: string;
    requestedStep: string | null;
    startedAt: string | null;
    completedAt: string | null;
    error: string | null;
    steps: Array<{
      id: string;
      name: string;
      status: string;
      startedAt: string | null;
      completedAt: string | null;
      attempts: number;
      error: string | null;
    }>;
    events: Array<{
      id: string;
      level: string;
      message: string;
      createdAt: string;
    }>;
  }>;
  transcripts: Array<{
    id: string;
    type: string;
    language: string | null;
    text: string;
  }>;
  transcriptChunks: Array<{
    id: string;
    sourceType: string;
    text: string;
    startTime: number | null;
    endTime: number | null;
    chunkIndex: number;
    characterCount: number;
  }>;
  notes: Array<{
    id: string;
    title: string | null;
    markdown: string;
    summary: string | null;
    tags: string[];
  }>;
  noteChunks: Array<{
    id: string;
    sourceType: string;
    text: string;
    chunkIndex: number;
  }>;
};
