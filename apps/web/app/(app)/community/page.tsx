"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Users, CheckCircle, Clock, MapPin, Activity } from "lucide-react";
import { api, WardSummary, PublicOutcome, ResponseMetrics } from "../../../lib/api";
import { formatDateTime } from "../../../lib/utils";

const OUTCOME_ICONS: Record<string, string> = {
  rescued: "🐾", adopted: "🏠", sterilized: "✂️", vaccinated: "💉",
  reunited: "🔗", transferred: "🏥", released: "🌿",
};

function CommunityPageInner() {
  const searchParams = useSearchParams();
  const [wards, setWards] = useState<WardSummary[]>([]);
  const [outcomes, setOutcomes] = useState<PublicOutcome[]>([]);
  const [metrics, setMetrics] = useState<ResponseMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedWard, setSelectedWard] = useState<string | null>(searchParams?.get("ward") ?? null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [w, o, m] = await Promise.all([
        api.getWardSummaries(),
        api.getPublicOutcomes(selectedWard ?? undefined),
        api.getResponseMetrics(),
      ]);
      setWards(w); setOutcomes(o); setMetrics(m);
      setLoading(false);
    };
    load();
  }, [selectedWard]);

  const filteredWards = wards.filter(w => !search || w.wardName.toLowerCase().includes(search.toLowerCase()));
  const totalAnimals   = wards.reduce((s, w) => s + w.totalAnimals, 0);
  const totalAbc       = wards.reduce((s, w) => s + w.sterilisedCount, 0);
  const avgCoverage    = wards.length > 0 ? Math.round(wards.reduce((s, w) => s + w.abcCoveragePct, 0) / wards.length) : 0;
  const totalOpenCases = wards.reduce((s, w) => s + w.openCases, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" /> Community Dashboard
        </h1>
        <p className="text-sm text-slate-500 mt-1">Live ward-level data for Chennai&apos;s animal welfare progress</p>
      </div>

      {/* City metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { value: totalAnimals.toLocaleString("en-IN"), label: "Registered Animals", color: "text-primary" },
          { value: `${avgCoverage}%`, label: "Avg ABC Coverage",  color: "text-accent" },
          { value: totalAbc.toLocaleString("en-IN"),    label: "Sterilised",          color: "text-emerald-600" },
          { value: totalOpenCases.toString(),           label: "Open Cases",           color: "text-amber-600" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Response Metrics */}
      {metrics && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Platform Response Times (Last 30 Days)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Avg. First Response", value: metrics.avgMinsToFirstClaim ? `${metrics.avgMinsToFirstClaim} min` : "—" },
              { label: "Avg. Pickup Time",    value: metrics.avgMinsToPickup ? `${metrics.avgMinsToPickup} min` : "—" },
              { label: "Responded < 15 min",  value: metrics.totalCasesTracked > 0 ? `${Math.round(metrics.casesRespondedWithin15Mins / metrics.totalCasesTracked * 100)}%` : "—" },
              { label: "Cases Tracked",       value: metrics.totalCasesTracked.toString() },
            ].map(m => (
              <div key={m.label} className="text-center">
                <p className="text-xl font-black text-primary">{m.value}</p>
                <p className="text-xs text-slate-500 mt-1">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Outcomes */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" /> Recent Outcomes
            {selectedWard && <span className="text-xs font-normal text-slate-500 ml-1">— {selectedWard}</span>}
          </h3>
          {selectedWard && (
            <button onClick={() => setSelectedWard(null)} className="text-xs text-primary font-bold hover:underline">View All</button>
          )}
        </div>
        {outcomes.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {outcomes.slice(0, 12).map(outcome => (
              <div key={outcome.id} className="px-5 py-4 flex items-start gap-4">
                <span className="text-2xl shrink-0">{OUTCOME_ICONS[outcome.outcomeType] ?? "🐾"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{outcome.headline}</p>
                  {outcome.detail && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{outcome.detail}</p>}
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                    {outcome.wardName && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{outcome.wardName}</span>}
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDateTime(outcome.occurredAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center text-slate-400 text-sm">
            {loading ? "Loading outcomes..." : "No public outcomes recorded yet."}
          </div>
        )}
      </div>

      {/* Ward Grid */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Ward-by-Ward Progress
          </h3>
          <input type="text" placeholder="Search ward..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm max-w-xs" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
        ) : filteredWards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWards.map(ward => {
              const pct = ward.abcCoveragePct;
              const barColor  = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-400";
              const textColor = pct >= 70 ? "text-emerald-700" : pct >= 40 ? "text-amber-700" : "text-red-700";
              return (
                <button key={ward.wardName}
                  onClick={() => setSelectedWard(selectedWard === ward.wardName ? null : ward.wardName)}
                  className={`text-left bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all ${selectedWard === ward.wardName ? "border-primary ring-1 ring-primary" : "border-slate-200"}`}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h4 className="font-bold text-slate-800 text-sm leading-snug">{ward.wardName}</h4>
                    <span className={`text-sm font-black shrink-0 ${textColor}`}>{pct}%</span>
                  </div>
                  <div className="mb-3">
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">ABC Coverage</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-sm font-black text-slate-700">{ward.totalAnimals}</p>
                      <p className="text-[10px] text-slate-400">Animals</p>
                    </div>
                    <div>
                      <p className="text-sm font-black text-amber-600">{ward.openCases}</p>
                      <p className="text-[10px] text-slate-400">Open Cases</p>
                    </div>
                    <div>
                      <p className="text-sm font-black text-emerald-600">{ward.resolvedCases30d}</p>
                      <p className="text-[10px] text-slate-400">Resolved (30d)</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
            No ward data available yet.
          </div>
        )}
      </div>
    </div>
  );
}

export default function CommunityPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
      <CommunityPageInner />
    </Suspense>
  );
}
