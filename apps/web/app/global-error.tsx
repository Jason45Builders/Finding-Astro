"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => { console.error("Global app error:", error); }, [error]);

  return (
    <html lang="en">
      <body className="bg-slate-50">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-black text-slate-800">Application Error</h2>
            <p className="text-sm text-slate-500">{error.message || "Something went wrong."}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={reset}
                className="bg-primary hover:bg-emerald-800 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors">
                <RefreshCw className="w-4 h-4" /> Try Again
              </button>
              <Link href="/"
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
                Home
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
