import React from "react";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export default function ErrorState({ title = "Something went wrong", description = "Please try again or contact support if the problem persists.", onRetry }: ErrorStateProps) {
  return (
    <div className="text-center py-12 space-y-3">
      <p className="font-bold text-on-surface">{title}</p>
      <p className="text-sm text-on-surface-variant">{description}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="text-sm font-bold text-primary">
          Retry
        </button>
      )}
    </div>
  );
}
