"use client";

import React, { useEffect, useState } from "react";
import { Plus, Calendar, MapPin, Activity } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { AbcCampaign } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateSafe } from "@/lib/utils";

const STATUSES = ["planned", "active", "completed", "cancelled"] as const;

export default function OrgCampaignsPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<AbcCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState("");

  const [form, setForm] = useState({
    title: "", description: "", locationText: "", startDate: new Date().toISOString().split("T")[0],
    endDate: "", targetAnimals: "", clinicName: "", vetName: "", status: "planned" as typeof STATUSES[number],
    latitude: "", longitude: "",
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api.listOrgCampaigns(filter ? { status: filter } : undefined);
        if (!cancelled) setCampaigns(data);
      } catch (err) {
        console.error("Failed to load campaigns", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [filter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        description: form.description || undefined,
        locationText: form.locationText || undefined,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : new Date().toISOString(),
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        targetAnimals: form.targetAnimals ? parseInt(form.targetAnimals, 10) : undefined,
        clinicName: form.clinicName || undefined,
        vetName: form.vetName || undefined,
        status: form.status,
      };
      if (form.latitude && form.longitude) {
        payload.location = { latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude) };
      }
      const created = await api.createOrgCampaign(payload);
      setCampaigns((prev) => [created, ...prev]);
      setShowForm(false);
      setForm({ title: "", description: "", locationText: "", startDate: new Date().toISOString().split("T")[0], endDate: "", targetAnimals: "", clinicName: "", vetName: "", status: "planned", latitude: "", longitude: "" });
    } catch (err: any) {
      alert(err?.message || "Failed to create campaign");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">ABC Campaigns</h1>
          <p className="text-sm text-on-surface-variant">Track sterilization and vaccination drives</p>
        </div>
        <Button variant="primary" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" />New Campaign</Button>
      </div>

      <Card className="p-4">
        <div className="flex gap-2">
          {["", ...STATUSES].map((s) => (
            <Button key={s || "all"} variant={filter === s ? "primary" : "outline"} size="sm" onClick={() => setFilter(s)}>
              {s || "All"}
            </Button>
          ))}
        </div>
      </Card>

      {campaigns.length === 0 ? (
        <Card className="p-8">
          <EmptyState icon={Activity} title="No campaigns yet" description="Schedule your first ABC campaign." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-bold text-on-surface">{campaign.title}</h3>
                  {campaign.description && <p className="text-sm text-on-surface-variant mt-1 line-clamp-2">{campaign.description}</p>}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant={campaign.status === "active" ? "success" : campaign.status === "completed" ? "neutral" : campaign.status === "cancelled" ? "danger" : "warning"}>{campaign.status}</Badge>
                    {campaign.locationText && <span className="text-xs text-on-surface-variant flex items-center gap-1"><MapPin className="w-3 h-3" /> {campaign.locationText}</span>}
                     <span className="text-xs text-on-surface-variant flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDateSafe(campaign.startDate, "TBD")}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    <div className="text-center p-2 bg-surface-container-high rounded">
                      <p className="text-xs text-on-surface-variant">Captured</p>
                      <p className="font-bold text-on-surface">{campaign.capturedCount}</p>
                    </div>
                    <div className="text-center p-2 bg-surface-container-high rounded">
                      <p className="text-xs text-on-surface-variant">Sterilized</p>
                      <p className="font-bold text-on-surface">{campaign.sterilizedCount}</p>
                    </div>
                    <div className="text-center p-2 bg-surface-container-high rounded">
                      <p className="text-xs text-on-surface-variant">Vaccinated</p>
                      <p className="font-bold text-on-surface">{campaign.vaccinatedCount}</p>
                    </div>
                    <div className="text-center p-2 bg-surface-container-high rounded">
                      <p className="text-xs text-on-surface-variant">Returned</p>
                      <p className="font-bold text-on-surface">{campaign.returnedCount}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New ABC Campaign">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Campaign Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Location Text</Label>
            <Input value={form.locationText} onChange={(e) => setForm({ ...form, locationText: e.target.value })} placeholder="e.g. Zone 4, Tambaram" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Target Animals</Label>
              <Input type="number" value={form.targetAnimals} onChange={(e) => setForm({ ...form, targetAnimals: e.target.value })} />
            </div>
            <div>
              <Label>Clinic Name</Label>
              <Input value={form.clinicName} onChange={(e) => setForm({ ...form, clinicName: e.target.value })} />
            </div>
            <div>
              <Label>Vet Name</Label>
              <Input value={form.vetName} onChange={(e) => setForm({ ...form, vetName: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as typeof STATUSES[number] })}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
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