"use client";

import React, { useEffect, useState } from "react";
import { Shield, Search, Filter, Eye, Loader2, ClipboardList } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { statusToken } from "@/lib/status";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Input, Select, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

type AdminCase = {
  id: string;
  animalId: string | null;
  reporterUserId: string | null;
  assignedToUserId: string | null;
  caseType: string;
  status: string;
  priority: string;
  title: string;
  description: string;
  locationText: string | null;
  wardName?: string | null;
  evidenceUrls: string[];
  createdAt: string;
  updatedAt: string;
};

const CASE_STATUSES = ["open", "in_review", "action_taken", "resolved", "closed"];
const CASE_TYPES = ["rescue", "lost_pet", "abc", "conflict", "abuse", "wildlife"];

export default function AdminCasesPage() {
  const { user } = useAuth();
  const [cases, setCases] = useState<AdminCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [filters, setFilters] = useState({ status: "", caseType: "", ward: "" });
  const [selectedCase, setSelectedCase] = useState<AdminCase | null>(null);
  const [newStatus, setNewStatus] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.listAdminCases({ status: filters.status || undefined, caseType: filters.caseType || undefined, ward: filters.ward || undefined });
      setCases(data as AdminCase[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [filters]);

  if (!user || !["admin", "govt", "ngo"].includes(user.role)) {
    return (
      <EmptyState icon={Shield} title="Admin Access Required" className="max-w-xl mx-auto mt-20" />
    );
  }

  const handleStatusUpdate = async (caseId: string) => {
    if (!newStatus) return;
    setSubmitting(caseId);
    try {
      await api.updateAdminCaseStatus(caseId, newStatus);
      await load();
      setSelectedCase(null);
      setNewStatus("");
    } catch (e) {
      alert("Failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Case Oversight</h1>
        <p className="text-sm text-on-surface-variant mt-1">Full case list with status override capability.</p>
      </div>

      <Card className="p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-outline" />
          <Input type="text" value={filters.ward} onChange={e => setFilters(f => ({ ...f, ward: e.target.value }))} placeholder="Search by ward or ID..." className="pl-9 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-outline shrink-0" />
          <Select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="w-auto">
            <option value="">All statuses</option>
            {CASE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select value={filters.caseType} onChange={e => setFilters(f => ({ ...f, caseType: e.target.value }))} className="w-auto">
            <option value="">All types</option>
            {CASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </div>
      </Card>

      {loading ? (
        <PageSpinner />
      ) : cases.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No cases found" description="Try adjusting your filters." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="text-left px-4 py-3 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">ID</th>
                  <th className="text-left px-4 py-3 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">Title</th>
                  <th className="text-left px-4 py-3 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">Priority</th>
                  <th className="text-left px-4 py-3 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">Created</th>
                  <th className="text-right px-4 py-3 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50">
                {cases.map(c => (
                  <tr key={c.id} className="hover:bg-surface-container transition-colors duration-150 ease-out">
                    <td className="px-4 py-3 text-xs font-mono text-on-surface-variant">{c.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 font-semibold text-on-surface text-xs">{c.title}</td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant capitalize">{c.caseType}</td>
                    <td className="px-4 py-3">
                      <StatusBadge token={statusToken.caseStatus(c.status)} />
                    </td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant capitalize">{c.priority}</td>
                    <td className="px-4 py-3 text-[10px] text-outline">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" className="p-1.5" onClick={() => { setSelectedCase(c); setNewStatus(c.status); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={!!selectedCase} onClose={() => setSelectedCase(null)} title="Case Detail">
        {selectedCase && (
          <div className="space-y-4">
            <div className="space-y-2 text-sm">
              <p><span className="text-on-surface-variant">ID:</span> <span className="font-mono text-xs">{selectedCase.id}</span></p>
              <p><span className="text-on-surface-variant">Title:</span> {selectedCase.title}</p>
              <p><span className="text-on-surface-variant">Description:</span> {selectedCase.description}</p>
              <p><span className="text-on-surface-variant">Type:</span> <span className="capitalize">{selectedCase.caseType}</span></p>
              <p><span className="text-on-surface-variant">Current status:</span> <span className="capitalize font-semibold">{selectedCase.status}</span></p>
              <p><span className="text-on-surface-variant">Priority:</span> <span className="capitalize">{selectedCase.priority}</span></p>
              {selectedCase.locationText && <p><span className="text-on-surface-variant">Location:</span> {selectedCase.locationText}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Override Status</Label>
              <Select value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                {CASE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <Button onClick={() => handleStatusUpdate(selectedCase.id)} disabled={submitting === selectedCase.id || newStatus === selectedCase.status} variant="primary" className="w-full">
              {submitting === selectedCase.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Status"}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
