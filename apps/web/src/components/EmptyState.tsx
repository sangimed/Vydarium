import { Inbox } from "lucide-react";

export function EmptyState({ title }: { title: string }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded border border-dashed border-stone-300 bg-white p-6 text-center text-stone-600">
      <Inbox className="mb-3 size-7 text-stone-400" aria-hidden="true" />
      <p className="text-sm font-medium">{title}</p>
    </div>
  );
}
