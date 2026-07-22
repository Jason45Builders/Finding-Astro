import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  max = 100,
  className,
  barClassName,
  size = "md",
}: {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  size?: "sm" | "md";
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      className={cn(
        "w-full bg-surface-container rounded-full overflow-hidden",
        size === "sm" ? "h-1" : "h-2",
        className
      )}
    >
      <div
        className={cn("h-full bg-primary rounded-full transition-all duration-700 ease-out", barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
