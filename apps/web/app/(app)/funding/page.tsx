"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Clock, Building2, AlertCircle, IndianRupee, HandCoins, ListChecks } from "lucide-react";
import { api, FundingCase } from "@/lib/api";
import { formatDateTime, cn } from "@/lib/utils";
import { statusToken } from "@/lib/status";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { KpiStat } from "@/components/ui/KpiStat";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

const FILTERS = ["all", "OPEN", "PARTIALLY_FUNDED", "FULLY_FUNDED", "PAID_OUT"];

const HOW_IT_WORKS = [
  "Hospital generates bill",
  "NGO verifies treatment",
  "Donors fund directly",
  "Clinic receives payment — not volunteer",
];

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
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile sm:font-headline-lg sm:text-headline-lg text-on-surface tracking-tight flex items-center gap-2">
          <Heart className="w-6 h-6 text-secondary fill-secondary" /> Treatment Funding
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Fund verified veterinary treatment. Every rupee goes directly to the clinic — not to any individual.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiStat
          label="Total Raised"
          value={`₹${(totalRaised / 1000).toFixed(0)}k`}
          icon={IndianRupee}
          accent="secondary"
        />
        <KpiStat label="Needs Funding" value={openCount} icon={HandCoins} accent="primary" />
        <KpiStat label="Total Cases" value={cases.length} icon={ListChecks} accent="neutral" />
      </div>

      {/* How it works */}
      <Card className="p-5 bg-primary-container/20">
        <p className="text-sm font-bold text-primary mb-3">How Finding Astro Funding Works</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-on-surface-variant">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-on-primary text-[10px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Filter */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-1 flex flex-wrap gap-1 shadow-sm">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-bold transition-colors duration-150 ease-out",
              filter === f ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container"
            )}
          >
            {f === "all" ? "All Cases" : f.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <PageSpinner />
      ) : error ? (
        <div className="bg-error-container border border-error/30 rounded-xl p-6 flex items-center gap-3 text-on-error-container">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-stagger">
          {filtered.map(fc => {
            const isOpenForDonation = fc.status === "OPEN" || fc.status === "PARTIALLY_FUNDED";
            return (
              <Card key={fc.id} interactive className="p-6 flex flex-col gap-4">
                <div>
                  <StatusBadge token={statusToken.fundingStatus(fc.status)} className="mb-2" />
                  <p className="font-bold text-on-surface text-sm">{fc.fundingType ?? "Treatment Funding"}</p>
                  {fc.hospitalName && (
                    <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-1"><Building2 className="w-3 h-3" />{fc.hospitalName}</p>
                  )}
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span className="font-mono text-on-surface-variant">₹{fc.raisedAmount.toLocaleString("en-IN")} raised</span>
                    <span className="font-mono text-outline">₹{fc.totalAmount.toLocaleString("en-IN")} goal</span>
                  </div>
                  <ProgressBar value={fc.raisedAmount} max={Math.max(fc.totalAmount, 1)} />
                  <p className="text-right text-[10px] text-outline mt-1">
                    {fc.totalAmount > 0 ? Math.min(100, Math.round((fc.raisedAmount / fc.totalAmount) * 100)) : 0}% funded
                  </p>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <p className="text-[10px] text-outline flex items-center gap-1">
                    <Clock className="w-3 h-3" />{formatDateTime(fc.createdAt)}
                  </p>
                  <Link href={`/funding/${fc.id}`}>
                    <Button variant={isOpenForDonation ? "coral" : "ghost"} size="sm" className="rounded-full">
                      {isOpenForDonation ? "Donate Now" : "View Details"}
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Heart}
          title="No funding cases found"
          description={`No funding cases with status "${filter}" found.`}
        />
      )}
    </div>
  );
}
