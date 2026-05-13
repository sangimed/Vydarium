import clsx from "clsx";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

export function Button({ className, variant = "secondary", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={clsx(
        "focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "border-[#0f766e] bg-[#0f766e] text-white hover:bg-[#115e59]",
        variant === "secondary" && "border-[#cbd7e1] bg-white text-[#1d2935] hover:bg-[#f5f8fb]",
        variant === "danger" && "border-rose-700 bg-rose-700 text-white hover:bg-rose-800",
        className,
      )}
    />
  );
}
