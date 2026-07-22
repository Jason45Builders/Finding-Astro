"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => { console.error("App segment error:", error); }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-error mx-auto" />
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Something went wrong</h2>
        <p className="text-sm text-on-surface-variant">{error.message || "We couldn't load this page. Please try again."}</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="primary">
            <RefreshCw className="w-4 h-4" /> Try Again
          </Button>
          <Link href="/dashboard">
            <Button variant="ghost" className="bg-surface-container-high">Back to Dashboard</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
