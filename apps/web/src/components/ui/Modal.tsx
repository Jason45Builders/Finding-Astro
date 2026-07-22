"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(id);
    }
    setMounted(false);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className={cn(
          "absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm transition-opacity duration-200 ease-out",
          mounted ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          "relative w-full max-w-lg bg-surface-container-lowest rounded-xl shadow-xl transition-all duration-200 ease-out origin-center max-h-[90vh] overflow-y-auto",
          mounted ? "opacity-100 scale-100" : "opacity-0 scale-95",
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between p-5 border-b border-outline-variant sticky top-0 bg-surface-container-lowest z-10">
            <h3 className="font-title-md text-title-md text-on-surface">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
