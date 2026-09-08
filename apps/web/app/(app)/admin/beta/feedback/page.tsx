"use client";

import React, { useEffect, useState } from "react";
import { ChevronLeft, MessageSquare, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Label } from "@/components/ui/Input";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import Link from "next/link";

type BetaFeedbackRow = {
  id: string;
  user_id: string | null;
  category: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export default function AdminBetaFeedbackPage() {
  const { user, isLoading } = useAuth();
  const [items, setItems] = useState<BetaFeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  if (!isLoading && (!user || !["admin", "govt", "ngo", "hospital"].includes(user.role))) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <Card className="p-8">
          <h1 className="font-headline-lg text-on-surface">Admin Access Required</h1>
          <p className="text-sm text-on-surface-variant mt-2">You do not have permission to view beta feedback.</p>
          <Link href="/dashboard"><Button variant="primary" className="mt-4">Back to dashboard</Button></Link>
        </Card>
      </div>
    );
  }

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.request<any>("/admin/beta/feedback");
      const list = Array.isArray(result) ? result : [];
      setItems(list);
    } catch {
      setError("Failed to load feedback");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
    }
    return true;
  });

  const updateStatus = async (id: string, status: "open" | "in_review" | "resolved" | "wont_fix") => {
    setUpdatingId(id);
    try {
      await api.request(`/admin/beta/feedback/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, adminNotes: adminNotes[id] ?? itemByid(id)?.admin_notes ?? "" }),
      });
      await load();
    } catch {
      setError("Failed to update feedback");
    } finally {
      setUpdatingId(null);
    }
  };

  const itemByid = (id: string) => items.find((item) => item.id === id);

  if (loading) return <PageSpinner label="Loading beta feedback..." />;
  if (error) return <div className="text-error text-sm">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-1 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors"><ChevronLeft className="w-4 h-4" /> Admin</Link>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-2">Beta Feedback</h1>
          <p className="text-sm text-on-surface-variant mt-1">Review suggestions, bug reports, and recommendations from testers.</p>
        </div>
        <Button variant="ghost" onClick={load} className="bg-surface-container-high">Refresh</Button>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search feedback..." className="pl-9" />
          </div>
          <div className="flex gap-2">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-surface-container-low border-b-2 border-outline focus:border-primary focus:ring-0 focus:outline-none px-3 py-2 rounded-t-md font-body-md text-on-surface">
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="in_review">In Review</option>
              <option value="resolved">Resolved</option>
              <option value="wont_fix">Won&apos;t Fix</option>
            </select>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-surface-container-low border-b-2 border-outline focus:border-primary focus:ring-0 focus:outline-none px-3 py-2 rounded-t-md font-body-md text-on-surface">
              <option value="all">All categories</option>
              {["bug", "feature_request", "ui_ux", "performance", "accessibility", "documentation", "other"].map((c) => (
                <option key={c} value={c}>{c.replace("_", " ")}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-8"><EmptyState icon={MessageSquare} title="No feedback found" description="Adjust filters or wait for new beta submissions." /></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <Card key={item.id} className="p-4 sm:p-5 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-on-surface truncate">{item.title}</h3>
                    <Badge variant="neutral" className="uppercase text-[10px]">{item.category.replace("_", " ")}</Badge>
                    <Badge variant={item.severity === "critical" ? "danger" : item.severity === "high" ? "warning" : "neutral"} className="capitalize">{item.severity}</Badge>
                    <Badge variant={item.status === "open" ? "warning" : item.status === "resolved" ? "success" : "neutral"} className="capitalize">{item.status.replace("_", " ")}</Badge>
                  </div>
                  <p className="text-sm text-on-surface-variant mt-1">{item.description}</p>
                  <p className="text-[10px] text-outline mt-1">Submitted {new Date(item.created_at).toLocaleString("en-IN")}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="mb-0">Admin Notes</Label>
                  <Input value={adminNotes[item.id] ?? item.admin_notes ?? ""} onChange={(e) => setAdminNotes((prev) => ({ ...prev, [item.id]: e.target.value }))} placeholder="Add review notes..." />
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <Label className="mb-0">Status</Label>
                  <div className="flex flex-wrap gap-2">
                    {(["open", "in_review", "resolved", "wont_fix"] as const).map((status) => (
                      <Button key={status} size="sm" variant={item.status === status ? "primary" : "ghost"} disabled={updatingId === item.id} onClick={() => updateStatus(item.id, status)} className="capitalize">
                        {status.replace("_", " ")}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
