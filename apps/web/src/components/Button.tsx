import clsx from "clsx";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

export function Button({ className, variant = "secondary", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={clsx(
        "focus-ring inline-flex h-10 items-center justify-center gap-2 rounded border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "border-teal-800 bg-teal-800 text-white hover:bg-teal-900",
        variant === "secondary" && "border-stone-300 bg-white text-stone-900 hover:bg-stone-50",
        variant === "danger" && "border-rose-700 bg-rose-700 text-white hover:bg-rose-800",
        className,
      )}
    />
  );
}
