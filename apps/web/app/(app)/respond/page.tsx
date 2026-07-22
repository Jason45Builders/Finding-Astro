"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Clock, ListCollapse } from "lucide-react";
import { api, Case } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { statusToken } from "@/lib/status";

const OpenCasesMap = dynamic(() => import("@/components/cases/OpenCasesMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-surface-container rounded-xl flex items-center justify-center min-h-[400px]">
      <span className="text-on-surface-variant text-sm font-bold">Loading Map View...</span>
    </div>
  ),
});

export default function RespondersDispatch() {
  const router = useRouter();
  const [openCases, setOpenCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOpenCases = async () => {
    try {
      const data = await api.listCases();
      // Filter open cases needing claim
      const open = data.filter((c) => c.status === "open");
      setOpenCases(open);
    } catch (err) {
      console.error("Failed to load dispatch cases", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOpenCases();
  }, []);

  const handleClaim = async (caseId: string) => {
    setClaimingId(caseId);
    setError(null);
    try {
      await api.claimCase(caseId);
      router.push(`/respond/${caseId}`);
    } catch (err: any) {
      setError(err?.message || "Failed to claim case. It might be already claimed.");
      setClaimingId(null);
      void fetchOpenCases();
    }
  };

  // Sort by priority (high first, then medium, then low)
  const sortedCases = [...openCases].sort((a, b) => {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const wA = priorityWeight[a.priority as "high" | "medium" | "low"] || 0;
    const wB = priorityWeight[b.priority as "high" | "medium" | "low"] || 0;
    return wB - wA;
  });

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-6">
      {/* Top Header */}
      <div className="shrink-0">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface tracking-tight">Active SOS Dispatch</h1>
        <p className="text-sm text-on-surface-variant">Claim and navigate to active animal emergencies in Chennai</p>
      </div>

      {error && (
        <div className="bg-error-container text-on-error-container p-4 rounded-md text-sm font-medium shrink-0">
          {error}
        </div>
      )}

      {/* Split view */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Open List */}
        <Card className="lg:col-span-5 flex flex-col min-h-0 p-6 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-4 shrink-0">
            <ListCollapse className="w-5 h-5 text-primary" />
            <h2 className="font-title-md text-title-md text-on-surface">Open Alerts ({sortedCases.length})</h2>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/50 pr-1">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Spinner />
              </div>
            ) : sortedCases.length > 0 ? (
              sortedCases.map((c) => (
                <div key={c.id} className="py-4 flex flex-col gap-3 group">
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge token={statusToken.casePriority(c.priority)} />
                      <span className="font-label-caps text-[10px] text-outline uppercase tracking-wider">
                        {c.caseType.replace("_", " ")}
                      </span>
                    </div>
                    <h3 className="font-bold text-on-surface mt-2 truncate group-hover:text-primary transition-colors duration-150 ease-out text-sm sm:text-base">
                      {c.title}
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-1 line-clamp-2 leading-relaxed">
                      {c.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-1.5 pt-2 border-t border-outline-variant/50">
                    <span className="text-[10px] text-outline flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-outline" />
                      Reported {formatDateTime(c.createdAt)}
                    </span>
                    <Button
                      size="sm"
                      variant="coral"
                      onClick={() => void handleClaim(c.id)}
                      disabled={claimingId !== null}
                    >
                      {claimingId === c.id ? "Claiming..." : "Claim & Respond"}
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-outline py-20 text-sm">No open emergency alerts found.</div>
            )}
          </div>
        </Card>

        {/* Right: Map */}
        <Card className="lg:col-span-7 h-full min-h-[400px] p-2 overflow-hidden relative">
          <OpenCasesMap cases={sortedCases} />
        </Card>
      </div>
    </div>
  );
}
