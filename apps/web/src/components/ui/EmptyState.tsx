import React from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center gap-2 p-10 rounded-xl bg-surface-container-low border border-dashed border-outline-variant",
        className
      )}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-outline mb-1">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <p className="font-bold text-sm text-on-surface">{title}</p>
      {description && <p className="text-sm text-on-surface-variant max-w-xs">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
