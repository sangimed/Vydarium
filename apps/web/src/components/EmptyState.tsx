import { Inbox } from "lucide-react";

export function EmptyState({ title }: { title: string }) {
  return (
    <div className="surface-soft flex min-h-44 flex-col items-center justify-center rounded-lg border-dashed p-6 text-center text-[#596776]">
      <Inbox className="mb-3 size-7 text-[#8a98a8]" aria-hidden="true" />
      <p className="text-sm font-medium">{title}</p>
    </div>
  );
}
