"use client";

import React, { useEffect, useState } from "react";
import { Heart, Plus, Search, Filter, CheckCircle } from "lucide-react";
import { api, RecoveryRecord, Case, Animal } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime, cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSpinner } from "@/components/ui/Spinner";
import { statusToken } from "@/lib/status";

type ProviderTypeFilter = "all" | "foster" | "ngo_shelter" | "clinic";

export default function FosterPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<RecoveryRecord[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [animals, setAnimals] = useState<Record<string, Animal>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState<ProviderTypeFilter>("all");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    caseId: "",
    animalId: "",
    providerName: "",
    providerType: "foster" as const,
    dailyCostInr: 0,
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    totalRaised: 0,
    status: "active",
    notes: "",
  });

  const isStaff = ["admin", "govt", "ngo", "hospital"].includes(user?.role || "");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [recordsData, casesData] = await Promise.all([
        api.listRecoveryRecords(),
        api.listCases({ limit: 100 }).catch(() => []),
      ]);
      setRecords(recordsData);
      setCases(casesData);
      const animalIds = [...new Set(recordsData.map(r => r.animalId).filter(Boolean) as string[])];
      const animalMap: Record<string, Animal> = {};
      await Promise.all(animalIds.map(async id => {
        try {
          const animal = await api.getAnimal(id);
          animalMap[id] = animal;
        } catch { /* ignore */ }
      }));
      setAnimals(animalMap);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const filtered = records.filter(r => {
    const matchProvider = providerFilter === "all" || r.providerType === providerFilter;
    const matchSearch = !search ||
      (r.providerName && r.providerName.toLowerCase().includes(search.toLowerCase())) ||
      r.caseId.toLowerCase().includes(search.toLowerCase()) ||
      (r.animalId && animals[r.animalId]?.name && animals[r.animalId].name!.toLowerCase().includes(search.toLowerCase()));
    return matchProvider && matchSearch;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true); setError(null);
    try {
      await api.createRecoveryRecord({
        caseId: form.caseId,
        animalId: form.animalId || undefined,
        providerName: form.providerName || undefined,
        providerType: form.providerType,
        dailyCostInr: form.dailyCostInr,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        totalRaised: form.totalRaised,
        status: form.status,
      });
      setSuccess(true);
      setShowForm(false);
      setForm({
        caseId: "", animalId: "", providerName: "", providerType: "foster",
        dailyCostInr: 0, startDate: new Date().toISOString().split("T")[0], endDate: "", totalRaised: 0, status: "active", notes: "",
      });
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create record");
    } finally { setSubmitting(false); }
  };

  const getCaseLabel = (caseId: string) => {
    const c = cases.find(c => c.id === caseId);
    return c ? `Case ${c.id.slice(0, 8)} · ${c.caseType.replace("_", " ")}` : `Case ${caseId.slice(0, 8)}`;
  };

  const providerTypeLabel: Record<string, string> = {
    foster: "Foster Home",
    ngo_shelter: "NGO Shelter",
    clinic: "Clinic",
  };

  const providerTypeToken = (type: string) => {
    switch (type) {
      case "foster": return statusToken.partnerType("foster");
      case "ngo_shelter": return { label: "NGO Shelter", variant: "primary" as const };
      case "clinic": return statusToken.partnerType("clinic");
      default: return { label: type, variant: "neutral" as const };
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-on-surface tracking-tight flex items-center gap-2">
          <Heart className="w-6 h-6 text-secondary" /> Foster & Recovery
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">Register and track foster care, shelter, and clinic recovery placements</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-outline pointer-events-none" />
          <Input type="text" placeholder="Search by provider, case, or animal..." value={search}
            onChange={e => setSearch(e.target.value)} className="pl-9 rounded-md" />
        </div>
        <div className="flex gap-2">
          {(["all", "foster", "ngo_shelter", "clinic"] as ProviderTypeFilter[]).map(type => (
            <button key={type} onClick={() => setProviderFilter(type)}
              className={cn(
                "px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors",
                providerFilter === type ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container"
              )}>
              {type === "all" ? "All" : providerTypeLabel[type]}
            </button>
          ))}
        </div>
        {isStaff && (
          <Button variant="primary" onClick={() => { setShowForm(true); setSuccess(false); setError(null); }}>
            <Plus className="w-4 h-4 mr-1" /> New Record
          </Button>
        )}
      </div>

      {loading ? (
        <PageSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Heart} title="No recovery records found." />
      ) : (
        <div className="space-y-4 animate-stagger">
          {filtered.map(record => {
            const animal = record.animalId ? animals[record.animalId] : null;
            const providerToken = providerTypeToken(record.providerType);
            return (
              <Card key={record.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge token={providerToken} />
                      <span className="text-xs text-outline font-mono">{record.id.slice(0, 8)}</span>
                    </div>
                    <p className="text-sm font-bold text-on-surface">
                      {record.providerName || "Unnamed Provider"}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {getCaseLabel(record.caseId)}
                      {animal && ` · ${animal.name || "Unnamed"} (${animal.species})`}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-outline">
                      <span>₹{record.dailyCostInr}/day</span>
                      <span>Raised: ₹{record.totalRaised}</span>
                      <span>From: {record.startDate}</span>
                      {record.endDate && <span>To: {record.endDate}</span>}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge token={statusToken.recoveryStatus(record.status)} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Recovery / Foster Record">
        {success ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-9 h-9 text-green-600" />
            </div>
            <p className="font-bold text-on-surface">Record Created</p>
            <Button variant="primary" onClick={() => setShowForm(false)}>Done</Button>
          </div>
        ) : (
          <>
            {error && <div className="bg-error-container text-on-error-container p-3 rounded-md text-sm mb-4">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Case ID *</Label>
                <Select value={form.caseId} onChange={e => setForm(p => ({ ...p, caseId: e.target.value }))} required>
                  <option value="">Select a case</option>
                  {cases.map(c => (
                    <option key={c.id} value={c.id}>{c.id.slice(0, 8)} · {c.caseType.replace("_", " ")}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Animal (optional)</Label>
                <Select value={form.animalId} onChange={e => setForm(p => ({ ...p, animalId: e.target.value }))}>
                  <option value="">None</option>
                  {Object.values(animals).map(a => (
                    <option key={a.id} value={a.id}>{a.name || "Unnamed"} ({a.species})</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Provider Name</Label>
                <Input value={form.providerName} onChange={e => setForm(p => ({ ...p, providerName: e.target.value }))} placeholder="Foster parent / Shelter / Clinic name" />
              </div>
              <div>
                <Label>Provider Type *</Label>
                <Select value={form.providerType} onChange={e => setForm(p => ({ ...p, providerType: e.target.value as any }))}>
                  <option value="foster">Foster Home</option>
                  <option value="ngo_shelter">NGO Shelter</option>
                  <option value="clinic">Clinic</option>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Daily Cost (INR) *</Label>
                  <Input type="number" min={0} value={form.dailyCostInr} onChange={e => setForm(p => ({ ...p, dailyCostInr: Number(e.target.value) }))} required />
                </div>
                <div>
                  <Label>Total Raised (INR)</Label>
                  <Input type="number" min={0} value={form.totalRaised} onChange={e => setForm(p => ({ ...p, totalRaised: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Date *</Label>
                  <Input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} required />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" type="button" onClick={() => setShowForm(false)} disabled={submitting}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={submitting}>{submitting ? "Saving..." : "Create Record"}</Button>
              </div>
            </form>
          </>
        )}
      </Modal>
    </div>
  );
}