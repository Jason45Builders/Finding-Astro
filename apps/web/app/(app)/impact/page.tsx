"use client";

import React, { useEffect, useState } from "react";
import { TrendingUp, Building2, MapPin, IndianRupee, CheckCircle } from "lucide-react";
import { api, CsrImpactReport } from "../../../lib/api";

export default function ImpactPage() {
  const [report, setReport] = useState<CsrImpactReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCsrImpactReport().then(setReport).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" /> Platform Impact
        </h1>
        <p className="text-sm text-slate-500 mt-1">Complete financial and welfare transparency for all stakeholders</p>
      </div>

      <div className="bg-primary-light border border-emerald-200 rounded-3xl p-6">
        <p className="text-primary font-bold text-lg mb-2">Every rupee, every dog, every ward — accounted for.</p>
        <p className="text-sm text-emerald-800 leading-relaxed">Finding Astro records every treatment, sterilisation, donation, and outcome. CSR sponsors can see exactly where their money goes. Citizens can see what is happening in their ward. Government departments can plan using real data.</p>
      </div>

      {report && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { Icon: IndianRupee, label: "Total Committed", value: `₹${(report.totalCommittedInr / 100000).toFixed(1)}L`, color: "text-primary" },
              { Icon: CheckCircle, label: "Disbursed",       value: `₹${(report.totalDisbursedInr / 100000).toFixed(1)}L`, color: "text-emerald-600" },
              { Icon: Building2,  label: "Active Sponsors",  value: report.activeSponsorCount.toString(), color: "text-accent" },
              { Icon: MapPin,     label: "Wards Covered",    value: report.wardsCovered.toString(), color: "text-blue-600" },
            ].map(({ Icon, label, value, color }) => (
              <div key={label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center">
                <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} />
                <p className={`text-2xl font-black ${color}`}>{value}</p>
                <p className="text-xs text-slate-500 font-semibold mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Utilisation bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-800 text-sm">Fund Utilisation</h3>
              <span className="text-sm font-black text-primary">
                {report.totalCommittedInr > 0 ? Math.round(report.totalDisbursedInr / report.totalCommittedInr * 100) : 0}%
              </span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${report.totalCommittedInr > 0 ? Math.min(100, report.totalDisbursedInr / report.totalCommittedInr * 100) : 0}%` }} />
            </div>
            <p className="text-xs text-slate-400 mt-2">₹{report.totalDisbursedInr.toLocaleString("en-IN")} of ₹{report.totalCommittedInr.toLocaleString("en-IN")} committed funds disbursed</p>
          </div>

          {report.sponsors.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-800">CSR Partners</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {report.sponsors.map(sponsor => {
                  const utilPct = sponsor.committedAmountInr > 0 ? Math.round(sponsor.disbursedAmountInr / sponsor.committedAmountInr * 100) : 0;
                  return (
                    <div key={sponsor.id} className="px-5 py-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm">{sponsor.orgName}</p>
                        <p className="text-xs text-slate-400 capitalize">{sponsor.commitmentType.replace(/_/g, " ")} commitment</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-black text-sm text-primary">₹{sponsor.committedAmountInr.toLocaleString("en-IN")}</p>
                        <p className="text-[10px] text-slate-400">{utilPct}% utilised</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {(!report || report.activeSponsorCount === 0) && (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-3">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="font-bold text-slate-600">No CSR sponsors yet</p>
          <p className="text-sm text-slate-400">Impact data will appear here as the platform grows.</p>
        </div>
      )}

      {/* Principles */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4">Our Transparency Principles</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {[
            ["No cash handling", "Payments go directly from donors to verified hospitals — no intermediary handles cash"],
            ["Verified before paid", "Every treatment bill is verified by a hospital before funds are released"],
            ["Ward-level tracking", "Every rupee is tagged to a ward, case, and outcome for full auditability"],
            ["Open data", "Aggregated ward statistics are public — not just for donors and government"],
          ].map(([title, desc]) => (
            <div key={title} className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-800">{title}</p>
                <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
