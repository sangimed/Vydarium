import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { youtubeUrlSchema } from "@vidravault/shared";
import { apiClient } from "../lib/api";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { PageHeader } from "../components/PageHeader";

const formSchema = z.object({
  sourceUrl: youtubeUrlSchema,
  captionsFirst: z.boolean(),
  tagText: z.string().optional(),
  languageText: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

export function AddVideo() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sourceUrl: "",
      languageText: "en,fr",
      tagText: "",
      captionsFirst: true,
    },
  });
  const mutation = useMutation({
    mutationFn: apiClient.addVideo,
    onSuccess: (result) => navigate(`/videos/${result.data.videoId}`),
  });

  return (
    <>
      <PageHeader title="Add video" />
      <form
        className="max-w-3xl rounded border border-stone-200 bg-white p-4"
        onSubmit={form.handleSubmit(async (values) => {
          setError(null);
          try {
            await mutation.mutateAsync({
              sourceUrl: values.sourceUrl,
              languages: splitList(values.languageText),
              tags: splitList(values.tagText ?? ""),
              captionsFirst: values.captionsFirst,
            });
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Could not add video.");
          }
        })}
      >
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-semibold text-stone-700">YouTube URL</span>
          <Input placeholder="https://www.youtube.com/watch?v=..." {...form.register("sourceUrl")} />
          {form.formState.errors.sourceUrl ? (
            <span className="mt-1 block text-sm text-rose-700">{form.formState.errors.sourceUrl.message}</span>
          ) : null}
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-stone-700">Caption languages</span>
            <Input {...form.register("languageText")} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-stone-700">Tags</span>
            <Input placeholder="mlx, whisper, transcription" {...form.register("tagText")} />
          </label>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-stone-700">
          <input type="checkbox" className="size-4 accent-teal-800" {...form.register("captionsFirst")} />
          Captions before audio
        </label>
        {error ? <p className="mt-4 rounded bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}
        <div className="mt-5 flex justify-end">
          <Button type="submit" variant="primary" disabled={mutation.isPending}>
            Queue ingestion
          </Button>
        </div>
      </form>
    </>
  );
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}
