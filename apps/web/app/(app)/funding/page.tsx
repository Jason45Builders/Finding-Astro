"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Clock, Building2, AlertCircle } from "lucide-react";
import { api, FundingCase } from "../../../lib/api";
import { formatDateTime } from "../../../lib/utils";

const STATUS_COLORS: Record<string, string> = {
  OPEN:             "bg-emerald-100 text-emerald-800",
  PARTIALLY_FUNDED: "bg-amber-100 text-amber-800",
  FULLY_FUNDED:     "bg-blue-100 text-blue-800",
  CLOSED:           "bg-slate-100 text-slate-600",
  PAID_OUT:         "bg-purple-100 text-purple-800",
};

export default function FundingListPage() {
  const [cases, setCases] = useState<FundingCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("OPEN");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.listFundingCases()
      .then(setCases)
      .catch(err => setError(err instanceof Error ? err.message : "Failed to load funding cases"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = cases.filter(c => filter === "all" || c.status === filter);
  const totalRaised = cases.reduce((sum, c) => sum + (c.raisedAmount ?? 0), 0);
  const openCount   = cases.filter(c => c.status === "OPEN" || c.status === "PARTIALLY_FUNDED").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <Heart className="w-6 h-6 text-accent" /> Treatment Funding
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Fund verified veterinary treatment. Every rupee goes directly to the clinic — not to any individual.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center">
          <p className="text-2xl font-black text-accent">₹{(totalRaised / 1000).toFixed(0)}k</p>
          <p className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wider">Total Raised</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center">
          <p className="text-2xl font-black text-primary">{openCount}</p>
          <p className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wider">Needs Funding</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center">
          <p className="text-2xl font-black text-slate-700">{cases.length}</p>
          <p className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wider">Total Cases</p>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-primary-light border border-emerald-200 rounded-2xl p-5">
        <p className="text-sm font-bold text-primary mb-3">How Finding Astro Funding Works</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-emerald-800">
          {["Hospital generates bill", "NGO verifies treatment", "Donors fund directly", "Clinic receives payment — not volunteer"].map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white border border-slate-200 rounded-2xl p-1 flex flex-wrap gap-1 shadow-sm">
        {["all", "OPEN", "PARTIALLY_FUNDED", "FULLY_FUNDED", "PAID_OUT"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === f ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}>
            {f === "all" ? "All Cases" : f.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(fc => {
            const pct = fc.totalAmount > 0 ? Math.min(100, Math.round((fc.raisedAmount / fc.totalAmount) * 100)) : 0;
            return (
              <div key={fc.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4">
                <div>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 ${STATUS_COLORS[fc.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {fc.status.replace(/_/g, " ")}
                  </span>
                  <p className="font-bold text-slate-800 text-sm">{fc.fundingType ?? "Treatment Funding"}</p>
                  {fc.hospitalName && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Building2 className="w-3 h-3" />{fc.hospitalName}</p>
                  )}
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span className="text-slate-600">₹{fc.raisedAmount.toLocaleString("en-IN")} raised</span>
                    <span className="text-slate-400">₹{fc.totalAmount.toLocaleString("en-IN")} goal</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-right text-[10px] text-slate-400 mt-1">{pct}% funded</p>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />{formatDateTime(fc.createdAt)}
                  </p>
                  <Link href={`/funding/${fc.id}`}
                    className={`font-bold text-xs px-4 py-2 rounded-xl transition-colors ${fc.status === "OPEN" || fc.status === "PARTIALLY_FUNDED" ? "bg-accent hover:bg-orange-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {fc.status === "OPEN" || fc.status === "PARTIALLY_FUNDED" ? "Donate Now" : "View Details"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center text-slate-400">
          No funding cases with status &quot;{filter}&quot; found.
        </div>
      )}
    </div>
  );
}
