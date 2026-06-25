"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AlertCircle, Clock, MapPin, ListCollapse } from "lucide-react";
import { api, Case } from "../../../lib/api";
import { formatDateTime } from "../../../lib/utils";

const OpenCasesMap = dynamic(() => import("../../../components/cases/OpenCasesMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 rounded-2xl flex items-center justify-center min-h-[400px]">
      <span className="text-slate-400 text-sm font-semibold">Loading Map View...</span>
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

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-amber-100 text-amber-850 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-6">
      {/* Top Header */}
      <div className="shrink-0">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Active SOS Dispatch</h1>
        <p className="text-sm text-slate-500">Claim and navigate to active animal emergencies in Chennai</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-650 p-4 rounded-xl text-xs font-semibold border border-red-150 shrink-0">
          {error}
        </div>
      )}

      {/* Split view */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Open List */}
        <div className="lg:col-span-5 flex flex-col min-h-0 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm overflow-hidden">
          <div className="flex items-center gap-1.5 mb-4 shrink-0">
            <ListCollapse className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-slate-800 text-lg">Open Alerts ({sortedCases.length})</h2>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : sortedCases.length > 0 ? (
              sortedCases.map((c) => (
                <div key={c.id} className="py-4 flex flex-col gap-3 group">
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${getPriorityBadgeClass(c.priority)}`}>
                        {c.priority} SOS
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {c.caseType.replace("_", " ")}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-800 mt-2 truncate group-hover:text-primary transition-colors text-sm sm:text-base">
                      {c.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {c.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-1.5 pt-2 border-t border-slate-50">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-300" />
                      Reported {formatDateTime(c.createdAt)}
                    </span>
                    <button
                      onClick={() => void handleClaim(c.id)}
                      disabled={claimingId !== null}
                      className="bg-accent hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-sm"
                    >
                      {claimingId === c.id ? "Claiming..." : "Claim & Respond"}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-400 py-20 text-sm">No open emergency alerts found.</div>
            )}
          </div>
        </div>

        {/* Right: Map */}
        <div className="lg:col-span-7 h-full min-h-[400px] bg-white border border-slate-200 rounded-3xl p-2 shadow-sm overflow-hidden relative">
          <OpenCasesMap cases={sortedCases} />
        </div>
      </div>
    </div>
  );
}
