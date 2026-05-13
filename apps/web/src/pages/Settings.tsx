import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api";
import { PageHeader } from "../components/PageHeader";

export function Settings() {
  const query = useQuery({ queryKey: ["settings"], queryFn: apiClient.settings });
  const settings = query.data?.data ?? {};

  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-4 lg:grid-cols-2">
        {Object.entries(settings).map(([section, value]) => (
          <section key={section} className="surface rounded-lg p-4">
            <h2 className="mb-3 text-lg font-semibold capitalize text-[#17212b]">{section}</h2>
            <pre className="overflow-x-auto rounded-md bg-[#111827] p-3 text-xs leading-6 text-[#f4f7fb]">
              {JSON.stringify(value, null, 2)}
            </pre>
          </section>
        ))}
      </div>
    </>
  );
}
