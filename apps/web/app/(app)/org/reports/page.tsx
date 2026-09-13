"use client";

import React, { useEffect, useState } from "react";
import { Plus, TrendingUp, FileText, Calendar } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { ImpactReport } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateSafe } from "@/lib/utils";

export default function OrgReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<ImpactReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reportType, setReportType] = useState("monthly");

  const [form, setForm] = useState({
    reportType: "monthly",
    periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    periodEnd: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api.listOrgReports({ reportType });
        if (!cancelled) setReports(data);
      } catch (err) {
        console.error("Failed to load reports", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [reportType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        reportType: form.reportType,
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
      };
      const created = await api.createOrgReport(payload);
      setReports((prev) => [created, ...prev]);
      setShowForm(false);
    } catch (err: any) {
      alert(err?.message || "Failed to generate report");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Impact Reports</h1>
          <p className="text-sm text-on-surface-variant">Generate and download monthly/quarterly impact reports</p>
        </div>
        <Button variant="primary" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" />Generate Report</Button>
      </div>

      <Card className="p-4">
        <div className="flex gap-2">
          {["monthly", "quarterly", "annual", "custom"].map((t) => (
            <Button key={t} variant={reportType === t ? "primary" : "outline"} size="sm" onClick={() => setReportType(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Button>
          ))}
        </div>
      </Card>

      {reports.length === 0 ? (
        <Card className="p-8">
          <EmptyState icon={FileText} title="No reports generated yet" description="Generate your first impact report to share with donors and government." />
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Card key={report.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-on-surface capitalize">{report.reportType} Report</h3>
                     <Badge variant="neutral">{formatDateSafe(report.periodStart, "?")} - {formatDateSafe(report.periodEnd, "?")}</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                    {(report.data as any)?.rescues !== undefined && (
                      <div className="p-2 bg-surface-container-high rounded">
                        <p className="text-xs text-on-surface-variant">Rescues</p>
                        <p className="font-bold text-on-surface">{(report.data as any).rescues}</p>
                      </div>
                    )}
                    {(report.data as any)?.sterilizations !== undefined && (
                      <div className="p-2 bg-surface-container-high rounded">
                        <p className="text-xs text-on-surface-variant">Sterilizations</p>
                        <p className="font-bold text-on-surface">{(report.data as any).sterilizations}</p>
                      </div>
                    )}
                    {(report.data as any)?.vaccinations !== undefined && (
                      <div className="p-2 bg-surface-container-high rounded">
                        <p className="text-xs text-on-surface-variant">Vaccinations</p>
                        <p className="font-bold text-on-surface">{(report.data as any).vaccinations}</p>
                      </div>
                    )}
                    {(report.data as any)?.adoptions !== undefined && (
                      <div className="p-2 bg-surface-container-high rounded">
                        <p className="text-xs text-on-surface-variant">Adoptions</p>
                        <p className="font-bold text-on-surface">{(report.data as any).adoptions}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Generate Impact Report">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Report Type</Label>
            <Select value={form.reportType} onChange={(e) => setForm({ ...form, reportType: e.target.value })}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
              <option value="custom">Custom</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Period Start</Label>
              <Input type="date" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} required />
            </div>
            <div>
              <Label>Period End</Label>
              <Input type="date" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} required />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Generating..." : "Generate"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}