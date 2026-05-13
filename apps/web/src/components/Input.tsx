import clsx from "clsx";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "focus-ring h-10 w-full rounded-md border border-[#cbd7e1] bg-white px-3 text-sm text-[#17212b] shadow-[inset_0_1px_0_rgba(16,24,40,0.03)] placeholder:text-[#8a98a8]",
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
        "focus-ring min-h-32 w-full rounded-md border border-[#cbd7e1] bg-white px-3 py-2 text-sm text-[#17212b] shadow-[inset_0_1px_0_rgba(16,24,40,0.03)] placeholder:text-[#8a98a8]",
        props.className,
      )}
    />
  );
}
