import { cn } from "@/lib/utils";

export function Spinner({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "h-5 w-5 border-2" : size === "lg" ? "h-12 w-12 border-4" : "h-8 w-8 border-[3px]";
  return (
    <div
      className={cn("animate-spin rounded-full border-primary/20 border-t-primary", sizeClass, className)}
      role="status"
      aria-label="Loading"
    />
  );
}

export function PageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24">
      <Spinner size="lg" />
      {label && <span className="text-sm font-bold text-on-surface-variant">{label}</span>}
    </div>
  );
}
