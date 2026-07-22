import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepState = "done" | "active" | "pending";

export interface StepItem {
  key: string;
  label: string;
  detail?: React.ReactNode;
  state: StepState;
}

export function VerticalStepper({ steps, className }: { steps: StepItem[]; className?: string }) {
  return (
    <div className={cn("space-y-8 relative", className)}>
      {steps.map((step, i) => (
        <div key={step.key} className="relative flex gap-4 items-start">
          {i < steps.length - 1 && (
            <span
              className={cn(
                "absolute left-3 top-6 w-0.5 -translate-x-1/2 h-[calc(100%+8px)]",
                step.state === "done" ? "bg-primary" : "bg-outline-variant"
              )}
            />
          )}
          <div
            className={cn(
              "z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0",
              step.state === "done" && "bg-primary",
              step.state === "active" && "bg-primary-container ring-4 ring-primary/15",
              step.state === "pending" && "bg-surface-container-high"
            )}
          >
            {step.state === "done" ? (
              <Check className="w-3.5 h-3.5 text-on-primary" />
            ) : (
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  step.state === "active" ? "bg-on-primary-container" : "bg-outline"
                )}
              />
            )}
          </div>
          <div className="pb-1">
            <p
              className={cn(
                "font-label-caps text-label-caps uppercase",
                step.state === "pending" ? "text-outline" : "text-primary"
              )}
            >
              {step.label}
            </p>
            {step.detail && <p className="text-xs text-on-surface-variant mt-0.5">{step.detail}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function HorizontalStepper({ steps, className }: { steps: StepItem[]; className?: string }) {
  return (
    <div className={cn("flex items-center", className)}>
      {steps.map((step, i) => (
        <React.Fragment key={step.key}>
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 ease-out",
                step.state === "done" && "bg-primary",
                step.state === "active" && "bg-primary-container ring-4 ring-primary/15",
                step.state === "pending" && "bg-surface-container-high"
              )}
            >
              {step.state === "done" ? (
                <Check className="w-4 h-4 text-on-primary" />
              ) : (
                <span
                  className={cn(
                    "text-xs font-bold",
                    step.state === "active" ? "text-on-primary-container" : "text-outline"
                  )}
                >
                  {i + 1}
                </span>
              )}
            </div>
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-wide text-center max-w-[72px]",
                step.state === "pending" ? "text-outline" : "text-on-surface"
              )}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "flex-1 h-0.5 mx-1 -mt-5 transition-colors duration-300 ease-out",
                step.state === "done" ? "bg-primary" : "bg-outline-variant"
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
