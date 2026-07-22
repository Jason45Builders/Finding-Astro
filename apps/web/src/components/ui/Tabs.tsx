import React from "react";
import { cn } from "@/lib/utils";

export function TabBar({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex items-center gap-1 border-b border-outline-variant overflow-x-auto hide-scrollbar", className)}>
      {children}
    </div>
  );
}

export function TabButton({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors duration-150 ease-out flex items-center gap-1.5",
        active ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
      )}
    >
      {children}
      {count !== undefined && (
        <span
          className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
            active ? "bg-primary-container text-on-primary-container" : "bg-surface-container-high text-on-surface-variant"
          )}
        >
          {count}
        </span>
      )}
      {active && (
        <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-full transition-all duration-200 ease-out" />
      )}
    </button>
  );
}
