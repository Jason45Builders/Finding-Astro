"use client";

import React, { useEffect, useState } from "react";
import { Shield, CheckCircle, XCircle, User, Building2, FileText, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Textarea, Select, Label } from "@/components/ui/Input";
import { TabBar, TabButton } from "@/components/ui/Tabs";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

type Verification = {
  id: string;
  user_id: string;
  org_name?: string;
  org_type?: string;
  registration_number?: string;
  document_urls: string[];
  requested_tier: number;
  status: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
  document_type?: string;
  document_ref?: string;
};

type Tab = "ngo" | "identity";

export default function AdminVerificationsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("ngo");
  const [items, setItems] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [tierOverrides, setTierOverrides] = useState<Record<string, number>>({});

  const load = async () => {
    setLoading(true);
    try {
      const result = await api.listVerifications();
      setItems(tab === "ngo" ? result.ngo : result.identity);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [tab]);

  if (!user || !["admin", "govt", "ngo"].includes(user.role)) {
    return (
      <EmptyState
        icon={Shield}
        title="Admin Access Required"
        description="You don't have permission to review verifications."
        className="max-w-xl mx-auto mt-20"
      />
    );
  }

  const handleApprove = async (item: Verification) => {
    if (!confirm(`Approve this ${tab} verification? This will update the user's identity_tier to ${tierOverrides[item.id] ?? item.requested_tier}.`)) return;
    setSubmitting(item.id);
    try {
      const tier = tierOverrides[item.id] ?? item.requested_tier;
      await api.approveVerification(tab, item.id, true, notes[item.id] || undefined, tier);
      await load();
    } catch (e) {
      alert("Failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSubmitting(null);
    }
  };

  const handleReject = async (item: Verification) => {
    if (!confirm("Reject this verification?")) return;
    setSubmitting(item.id);
    try {
      await api.approveVerification(tab, item.id, false, notes[item.id] || undefined);
      await load();
    } catch (e) {
      alert("Failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSubmitting(null);
    }
  };

  const pending = items.filter(i => i.status === "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Verification Queue</h1>
        <p className="text-sm text-on-surface-variant mt-1">Review and approve organisation and identity verifications.</p>
      </div>

      <TabBar>
        <TabButton active={tab === "ngo"} onClick={() => setTab("ngo")} count={pending.filter(i => i.org_name).length}>
          <Building2 className="w-4 h-4" /> NGO/Organisation
        </TabButton>
        <TabButton active={tab === "identity"} onClick={() => setTab("identity")} count={pending.filter(i => i.document_type).length}>
          <User className="w-4 h-4" /> Identity
        </TabButton>
      </TabBar>

      {loading ? (
        <PageSpinner />
      ) : pending.length === 0 ? (
        <EmptyState icon={CheckCircle} title="No pending verifications" description="You're all caught up." />
      ) : (
        <div className="space-y-4 animate-stagger">
          {pending.map(item => (
            <Card key={item.id} className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {tab === "ngo" ? (
                    <Building2 className="w-5 h-5 text-primary shrink-0" />
                  ) : (
                    <User className="w-5 h-5 text-primary shrink-0" />
                  )}
                  <div>
                    <h3 className="font-bold text-on-surface">
                      {tab === "ngo" ? item.org_name || "Unnamed Organisation" : `${item.document_type || "Identity"} — ${item.document_ref || item.id.slice(0, 8)}`}
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-0.5 font-mono">User ID: {item.user_id}</p>
                    <p className="text-[10px] text-outline mt-0.5">Requested tier: {item.requested_tier} · {new Date(item.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <Badge variant="warning">Pending</Badge>
              </div>

              {tab === "ngo" && item.org_type && (
                <p className="text-xs text-on-surface-variant">Org type: <span className="font-semibold text-on-surface">{item.org_type}</span></p>
              )}
              {item.registration_number && (
                <p className="text-xs text-on-surface-variant">Registration: <span className="font-semibold text-on-surface">{item.registration_number}</span></p>
              )}
              {item.document_urls && item.document_urls.length > 0 && (
                <div className="space-y-1">
                  <p className="text-label-caps font-label-caps text-outline uppercase tracking-wider">Documents</p>
                  <div className="flex flex-wrap gap-2">
                    {item.document_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Doc {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Admin notes</Label>
                <Textarea value={notes[item.id] || ""} onChange={e => setNotes(n => ({ ...n, [item.id]: e.target.value }))} rows={2} placeholder="Review notes..." />
              </div>

              {tab === "ngo" && (
                <div className="space-y-1.5">
                  <Label>Override identity tier (optional)</Label>
                  <Select value={tierOverrides[item.id] ?? item.requested_tier} onChange={e => setTierOverrides(o => ({ ...o, [item.id]: parseInt(e.target.value) }))} className="w-40">
                    {[0, 1, 2, 3, 4, 5].map(t => <option key={t} value={t}>Tier {t}</option>)}
                  </Select>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={() => handleApprove(item)} disabled={submitting === item.id} variant="primary" className="flex-1">
                  {submitting === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" /> Approve</>}
                </Button>
                <Button onClick={() => handleReject(item)} disabled={submitting === item.id} variant="danger" className="flex-1">
                  {submitting === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4" /> Reject</>}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
