import clsx from "clsx";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "focus-ring h-10 w-full rounded border border-stone-300 bg-white px-3 text-sm text-stone-950 placeholder:text-stone-400",
        props.className,
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={clsx(
        "focus-ring min-h-32 w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 placeholder:text-stone-400",
        props.className,
      )}
    />
  );
}
