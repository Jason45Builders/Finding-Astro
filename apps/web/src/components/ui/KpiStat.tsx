import React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";

export function KpiStat({
  label,
  value,
  icon: Icon,
  suffix,
  hint,
  className,
  accent = "primary",
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
  suffix?: string;
  hint?: React.ReactNode;
  className?: string;
  accent?: "primary" | "secondary" | "neutral";
}) {
  const accentClass =
    accent === "primary" ? "text-primary" : accent === "secondary" ? "text-secondary" : "text-on-surface";
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex justify-between items-start mb-2">
        <p className="font-label-caps text-label-caps text-on-surface-variant">{label}</p>
        {Icon && <Icon className={cn("w-5 h-5", accentClass)} />}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn("font-mono font-stat-number text-stat-number", accentClass)}>{value}</span>
        {suffix && <span className="text-sm font-bold text-on-surface-variant">{suffix}</span>}
      </div>
      {hint && <div className="mt-2 text-xs text-on-surface-variant">{hint}</div>}
    </Card>
  );
}
