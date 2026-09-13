"use client";

import React, { useEffect, useState } from "react";
import { Plus, Calendar, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { PostAdoptionFollowup } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateSafe } from "@/lib/utils";

const TYPES = ["adoption_7day", "adoption_30day", "adoption_90day", "medical", "general"] as const;

export default function OrgFollowupsPage() {
  const { user } = useAuth();
  const [followups, setFollowups] = useState<PostAdoptionFollowup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterType, setFilterType] = useState("");

  const [form, setForm] = useState({
    adoptionApplicationId: "", animalId: "", adopterUserId: "", followupType: "general" as typeof TYPES[number],
    scheduledDate: new Date().toISOString().split("T")[0], notes: "", status: "scheduled",
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api.listOrgFollowups(filterType ? { type: filterType } : undefined);
        if (!cancelled) setFollowups(data);
      } catch (err) {
        console.error("Failed to load followups", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [filterType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        adoptionApplicationId: form.adoptionApplicationId,
        animalId: form.animalId,
        adopterUserId: form.adopterUserId,
        followupType: form.followupType,
        scheduledDate: form.scheduledDate ? new Date(form.scheduledDate).toISOString() : new Date().toISOString(),
        notes: form.notes || undefined,
        status: form.status,
      };
      const created = await api.createOrgFollowup(payload);
      setFollowups((prev) => [created, ...prev]);
      setShowForm(false);
      setForm({ adoptionApplicationId: "", animalId: "", adopterUserId: "", followupType: "general", scheduledDate: new Date().toISOString().split("T")[0], notes: "", status: "scheduled" });
    } catch (err: any) {
      alert(err?.message || "Failed to create follow-up");
    } finally {
      setSubmitting(false);
    }
  };

  const typeLabel = (t: string) => {
    switch (t) {
      case "adoption_7day": return "7-Day Follow-up";
      case "adoption_30day": return "30-Day Follow-up";
      case "adoption_90day": return "90-Day Follow-up";
      case "medical": return "Medical Check";
      default: return "General";
    }
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Follow-ups</h1>
          <p className="text-sm text-on-surface-variant">Post-adoption and medical follow-up scheduler</p>
        </div>
        <Button variant="primary" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" />New Follow-up</Button>
      </div>

      <Card className="p-4">
        <div className="flex gap-2 flex-wrap">
          {["", ...TYPES].map((t) => (
            <Button key={t || "all"} variant={filterType === t ? "primary" : "outline"} size="sm" onClick={() => setFilterType(t)}>
              {t ? typeLabel(t) : "All"}
            </Button>
          ))}
        </div>
      </Card>

      {followups.length === 0 ? (
        <Card className="p-8">
          <EmptyState icon={Calendar} title="No follow-ups scheduled" description="Schedule follow-ups for adoptions and medical checks." />
        </Card>
      ) : (
        <div className="space-y-3">
          {followups.map((f) => (
            <Card key={f.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral">{typeLabel(f.followupType)}</Badge>
                    <Badge variant={f.status === "scheduled" ? "warning" : f.status === "completed" ? "success" : "danger"}>{f.status}</Badge>
                  </div>
                  <p className="text-sm text-on-surface-variant mt-1">Animal: {f.animalId} · Adopter: {f.adopterUserId}</p>
                  <p className="text-xs text-on-surface-variant">Scheduled: {formatDateSafe(f.scheduledDate, "TBD")}</p>
                  {f.completedDate && <p className="text-xs text-on-surface-variant">Completed: {formatDateSafe(f.completedDate)}</p>}
                  {f.notes && <p className="text-sm text-on-surface mt-1">{f.notes}</p>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Follow-up">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Adoption Application ID</Label>
              <Input value={form.adoptionApplicationId} onChange={(e) => setForm({ ...form, adoptionApplicationId: e.target.value })} required />
            </div>
            <div>
              <Label>Animal ID</Label>
              <Input value={form.animalId} onChange={(e) => setForm({ ...form, animalId: e.target.value })} required />
            </div>
            <div>
              <Label>Adopter User ID</Label>
              <Input value={form.adopterUserId} onChange={(e) => setForm({ ...form, adopterUserId: e.target.value })} required />
            </div>
            <div>
              <Label>Follow-up Type</Label>
              <Select value={form.followupType} onChange={(e) => setForm({ ...form, followupType: e.target.value as typeof TYPES[number] })}>
                {TYPES.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
              </Select>
            </div>
            <div>
              <Label>Scheduled Date</Label>
              <Input type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} required />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="missed">Missed</option>
              </Select>
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}