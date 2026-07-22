"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Users, CheckCircle, Clock, MapPin, Activity } from "lucide-react";
import { api, WardSummary, PublicOutcome, ResponseMetrics } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { KpiStat } from "@/components/ui/KpiStat";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSpinner } from "@/components/ui/Spinner";

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
        <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-on-surface tracking-tight flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" /> Community Dashboard
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">Live ward-level data for Chennai&apos;s animal welfare progress</p>
      </div>

      {/* City metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-stagger">
        <KpiStat label="Registered Animals" value={totalAnimals.toLocaleString("en-IN")} icon={Users} accent="primary" />
        <KpiStat label="Avg ABC Coverage" value={`${avgCoverage}%`} icon={Activity} accent="secondary" />
        <KpiStat label="Sterilised" value={totalAbc.toLocaleString("en-IN")} icon={CheckCircle} accent="primary" />
        <KpiStat label="Open Cases" value={totalOpenCases.toString()} icon={Clock} accent="secondary" />
      </div>

      {/* Response Metrics */}
      {metrics && (
        <Card className="p-5">
          <h3 className="font-title-md text-sm font-bold text-on-surface mb-4 flex items-center gap-2">
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
                <p className="font-mono text-xl font-bold text-primary">{m.value}</p>
                <p className="text-xs text-on-surface-variant mt-1">{m.label}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Outcomes */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-outline-variant bg-surface-container-low flex items-center justify-between">
          <h3 className="font-title-md text-sm font-bold text-on-surface flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-primary" /> Recent Outcomes
            {selectedWard && <span className="text-xs font-normal text-on-surface-variant ml-1">— {selectedWard}</span>}
          </h3>
          {selectedWard && (
            <Button size="sm" variant="ghost" onClick={() => setSelectedWard(null)}>View All</Button>
          )}
        </div>
        {outcomes.length > 0 ? (
          <div className="divide-y divide-outline-variant/50">
            {outcomes.slice(0, 12).map(outcome => (
              <div key={outcome.id} className="px-5 py-4 flex items-start gap-4 hover:bg-surface-container transition-colors duration-150 ease-out">
                <span className="text-2xl shrink-0">{OUTCOME_ICONS[outcome.outcomeType] ?? "🐾"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-on-surface">{outcome.headline}</p>
                  {outcome.detail && <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-1">{outcome.detail}</p>}
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-outline">
                    {outcome.wardName && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{outcome.wardName}</span>}
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDateTime(outcome.occurredAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4">
            <EmptyState
              icon={CheckCircle}
              title={loading ? "Loading outcomes..." : "No public outcomes recorded yet."}
            />
          </div>
        )}
      </Card>

      {/* Ward Grid */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="font-title-md text-sm font-bold text-on-surface flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Ward-by-Ward Progress
          </h3>
          <Input type="text" placeholder="Search ward..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-xs rounded-md" />
        </div>

        {loading ? (
          <PageSpinner />
        ) : filteredWards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-stagger">
            {filteredWards.map(ward => {
              const pct = ward.abcCoveragePct;
              const textColor = pct >= 70 ? "text-green-700" : pct >= 40 ? "text-amber-700" : "text-error";
              const barColor  = pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-amber-500" : "bg-error";
              const selected = selectedWard === ward.wardName;
              return (
                <Card
                  key={ward.wardName}
                  interactive
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedWard(selected ? null : ward.wardName)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedWard(selected ? null : ward.wardName); } }}
                  className={`text-left p-5 cursor-pointer ${selected ? "border-primary ring-1 ring-primary" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h4 className="font-bold text-on-surface text-sm leading-snug">{ward.wardName}</h4>
                    <span className={`text-sm font-black shrink-0 font-mono ${textColor}`}>{pct}%</span>
                  </div>
                  <div className="mb-3">
                    <ProgressBar value={pct} size="sm" barClassName={barColor} />
                    <p className="text-[10px] text-outline mt-1">ABC Coverage</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-sm font-black text-on-surface font-mono">{ward.totalAnimals}</p>
                      <p className="text-[10px] text-outline">Animals</p>
                    </div>
                    <div>
                      <p className="text-sm font-black text-amber-600 font-mono">{ward.openCases}</p>
                      <p className="text-[10px] text-outline">Open Cases</p>
                    </div>
                    <div>
                      <p className="text-sm font-black text-green-600 font-mono">{ward.resolvedCases30d}</p>
                      <p className="text-[10px] text-outline">Resolved (30d)</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={MapPin} title="No ward data available yet." />
        )}
      </div>
    </div>
  );
}

export default function CommunityPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <CommunityPageInner />
    </Suspense>
  );
}
