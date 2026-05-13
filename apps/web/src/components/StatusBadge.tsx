import clsx from "clsx";

const styles: Record<string, string> = {
  READY: "bg-emerald-100 text-emerald-800 border-emerald-200",
  COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  PROCESSING: "bg-sky-100 text-sky-800 border-sky-200",
  RUNNING: "bg-sky-100 text-sky-800 border-sky-200",
  QUEUED: "bg-amber-100 text-amber-900 border-amber-200",
  PENDING: "bg-[#edf3f7] text-[#334252] border-[#d8e2ea]",
  SKIPPED: "bg-[#edf3f7] text-[#334252] border-[#d8e2ea]",
  FAILED: "bg-rose-100 text-rose-800 border-rose-200",
  DELETED: "bg-zinc-200 text-zinc-700 border-zinc-300",
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) {
    return null;
  }

  return (
    <span
      className={clsx(
        "inline-flex h-7 items-center rounded-md border px-2 text-xs font-semibold uppercase tracking-normal",
        styles[status] ?? "bg-[#edf3f7] text-[#334252] border-[#d8e2ea]",
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}
