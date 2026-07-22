"use client";

import React, { useEffect, useState } from "react";
import { TrendingUp, Building2, MapPin, IndianRupee, CheckCircle } from "lucide-react";
import { api, CsrImpactReport } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { KpiStat } from "@/components/ui/KpiStat";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSpinner } from "@/components/ui/Spinner";

export default function ImpactPage() {
  const [report, setReport] = useState<CsrImpactReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCsrImpactReport().then(setReport).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-on-surface tracking-tight flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" /> Platform Impact
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">Complete financial and welfare transparency for all stakeholders</p>
      </div>

      <div className="bg-primary-container/20 border border-primary-container rounded-xl p-6">
        <p className="text-primary font-title-md text-title-md mb-2">Every rupee, every dog, every ward — accounted for.</p>
        <p className="text-sm text-on-surface-variant leading-relaxed">Finding Astro records every treatment, sterilisation, donation, and outcome. CSR sponsors can see exactly where their money goes. Citizens can see what is happening in their ward. Government departments can plan using real data.</p>
      </div>

      {report && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-stagger">
            <KpiStat label="Total Committed" value={`₹${(report.totalCommittedInr / 100000).toFixed(1)}L`} icon={IndianRupee} accent="primary" />
            <KpiStat label="Disbursed" value={`₹${(report.totalDisbursedInr / 100000).toFixed(1)}L`} icon={CheckCircle} accent="primary" />
            <KpiStat label="Active Sponsors" value={report.activeSponsorCount.toString()} icon={Building2} accent="secondary" />
            <KpiStat label="Wards Covered" value={report.wardsCovered.toString()} icon={MapPin} accent="neutral" />
          </div>

          {/* Utilisation bar */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-on-surface text-sm">Fund Utilisation</h3>
              <span className="font-mono text-sm font-black text-primary">
                {report.totalCommittedInr > 0 ? Math.round(report.totalDisbursedInr / report.totalCommittedInr * 100) : 0}%
              </span>
            </div>
            <ProgressBar
              value={report.totalCommittedInr > 0 ? Math.min(100, report.totalDisbursedInr / report.totalCommittedInr * 100) : 0}
              size="md"
            />
            <p className="text-xs text-outline mt-2">₹{report.totalDisbursedInr.toLocaleString("en-IN")} of ₹{report.totalCommittedInr.toLocaleString("en-IN")} committed funds disbursed</p>
          </Card>

          {report.sponsors.length > 0 && (
            <Card className="overflow-hidden">
              <div className="px-5 py-4 border-b border-outline-variant bg-surface-container-low">
                <h3 className="font-bold text-on-surface">CSR Partners</h3>
              </div>
              <div className="divide-y divide-outline-variant/50">
                {report.sponsors.map(sponsor => {
                  const utilPct = sponsor.committedAmountInr > 0 ? Math.round(sponsor.disbursedAmountInr / sponsor.committedAmountInr * 100) : 0;
                  return (
                    <div key={sponsor.id} className="px-5 py-4 flex items-center gap-4 hover:bg-surface-container transition-colors duration-150 ease-out">
                      <div className="w-10 h-10 rounded-md bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-on-surface text-sm">{sponsor.orgName}</p>
                        <p className="text-xs text-outline capitalize">{sponsor.commitmentType.replace(/_/g, " ")} commitment</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono font-black text-sm text-primary">₹{sponsor.committedAmountInr.toLocaleString("en-IN")}</p>
                        <p className="text-[10px] text-outline">{utilPct}% utilised</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}

      {(!report || report.activeSponsorCount === 0) && (
        <EmptyState
          icon={Building2}
          title="No CSR sponsors yet"
          description="Impact data will appear here as the platform grows."
          className="p-10"
        />
      )}

      {/* Principles */}
      <Card className="p-6">
        <h3 className="font-title-md text-title-md text-on-surface mb-4">Our Transparency Principles</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {[
            ["No cash handling", "Payments go directly from donors to verified hospitals — no intermediary handles cash"],
            ["Verified before paid", "Every treatment bill is verified by a hospital before funds are released"],
            ["Ward-level tracking", "Every rupee is tagged to a ward, case, and outcome for full auditability"],
            ["Open data", "Aggregated ward statistics are public — not just for donors and government"],
          ].map(([title, desc]) => (
            <div key={title} className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-on-surface">{title}</p>
                <p className="text-on-surface-variant text-xs mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
