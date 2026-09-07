"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ShieldAlert, Activity, Eye } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

type AbuseReview = {
  suspiciousIps: Array<{ ip: string; failedAttempts: number }>;
  recentLoginFailures: Array<Record<string, unknown>>;
  recentReports: Array<Record<string, unknown>>;
};

export default function AdminAbuseReviewPage() {
  const { user, isLoading } = useAuth();
  const [data, setData] = useState<AbuseReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  if (!isLoading && (!user || !["admin", "govt", "ngo", "hospital"].includes(user.role))) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <Card className="p-8">
          <h1 className="font-headline-lg text-on-surface">Admin Access Required</h1>
          <p className="text-sm text-on-surface-variant mt-2">You do not have permission to view abuse review data.</p>
          <Link href="/dashboard"><Button variant="primary" className="mt-4">Back to dashboard</Button></Link>
        </Card>
      </div>
    );
  }

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.getAbuseReview();
      setData(result as AbuseReview);
    } catch {
      setError("Failed to load abuse review data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <PageSpinner label="Loading abuse review..." />;
  if (error) return <div className="text-error text-sm">{error}</div>;
  if (!data) return <EmptyState icon={Activity} title="No review data available" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-1 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors"><ChevronLeft className="w-4 h-4" /> Admin</Link>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-2">Abuse Review</h1>
          <p className="text-sm text-on-surface-variant mt-1">Recent suspicious activity and reports from the last 24 hours.</p>
        </div>
        <Button variant="ghost" onClick={load} className="bg-surface-container-high">Refresh</Button>
      </div>

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-error" /> Suspicious IPs</h2>
        {data.suspiciousIps.length === 0 ? (
          <Card className="p-5"><p className="text-sm text-on-surface-variant">No IPs with 5+ failed attempts in the last 24 hours.</p></Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="bg-surface-container-low border-b border-outline-variant"><th className="p-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">IP</th><th className="p-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">Failed attempts</th></tr></thead>
                <tbody className="divide-y divide-outline-variant/50">{data.suspiciousIps.map((row) => (<tr key={row.ip}><td className="p-4 font-mono text-on-surface">{row.ip}</td><td className="p-4"><Badge variant={row.failedAttempts >= 10 ? "danger" : "warning"}>{row.failedAttempts}</Badge></td></tr>))}</tbody>
              </table>
            </div>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface flex items-center gap-2"><Activity className="w-5 h-5 text-outline" /> Recent Login Failures</h2>
        {!data.recentLoginFailures?.length ? (
          <Card className="p-5"><p className="text-sm text-on-surface-variant">No login failures recorded in the last 24 hours.</p></Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="bg-surface-container-low border-b border-outline-variant"><th className="p-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">Time</th><th className="p-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">Email</th><th className="p-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">IP</th></tr></thead>
                <tbody className="divide-y divide-outline-variant/50">{(data.recentLoginFailures ?? []).slice(0, 50).map((row, idx) => (<tr key={idx}><td className="p-4 text-on-surface-variant">{new Date((row as Record<string, unknown>).attempted_at as string).toLocaleString("en-IN")}</td><td className="p-4 text-on-surface">{(row as Record<string, unknown>).email as string}</td><td className="p-4 font-mono text-on-surface-variant">{(row as Record<string, unknown>).ip_address as string}</td></tr>))}</tbody>
              </table>
            </div>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface flex items-center gap-2"><Eye className="w-5 h-5 text-primary" /> Recent Reports</h2>
        {!data.recentReports?.length ? (
          <Card className="p-5"><p className="text-sm text-on-surface-variant">No reports created in the last 24 hours.</p></Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="bg-surface-container-low border-b border-outline-variant"><th className="p-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">Title</th><th className="p-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">Status</th><th className="p-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">Priority</th><th className="p-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">Created</th></tr></thead>
                <tbody className="divide-y divide-outline-variant/50">{(data.recentReports ?? []).slice(0, 50).map((row) => (<tr key={row.id as string}><td className="p-4 text-on-surface">{row.title as string}</td><td className="p-4"><Badge variant={row.status === "open" ? "warning" : "neutral"}>{row.status as string}</Badge></td><td className="p-4 capitalize text-on-surface-variant">{row.priority as string}</td><td className="p-4 text-on-surface-variant">{new Date(row.created_at as string).toLocaleString("en-IN")}</td></tr>))}</tbody>
              </table>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}
