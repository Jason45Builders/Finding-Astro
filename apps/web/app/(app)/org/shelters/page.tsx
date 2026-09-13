"use client";

import React, { useEffect, useState } from "react";
import { Plus, Home as HomeIcon, AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Shelter } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

export default function OrgSheltersPage() {
  const { user } = useAuth();
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", locationText: "", totalCapacity: "0", occupiedCount: "0", quarantineCount: "0", medicalCount: "0", adoptionReadyCount: "0", isActive: true, latitude: "", longitude: "" });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api.listOrgShelters();
        if (!cancelled) setShelters(data);
      } catch (err) {
        console.error("Failed to load shelters", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        locationText: form.locationText || undefined,
        totalCapacity: parseInt(form.totalCapacity, 10) || 0,
        occupiedCount: parseInt(form.occupiedCount, 10) || 0,
        quarantineCount: parseInt(form.quarantineCount, 10) || 0,
        medicalCount: parseInt(form.medicalCount, 10) || 0,
        adoptionReadyCount: parseInt(form.adoptionReadyCount, 10) || 0,
        isActive: form.isActive,
      };
      if (form.latitude && form.longitude) {
        payload.location = { latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude) };
      }
      const created = await api.createOrgShelter(payload);
      setShelters((prev) => [created, ...prev]);
      setShowForm(false);
      setForm({ name: "", locationText: "", totalCapacity: "0", occupiedCount: "0", quarantineCount: "0", medicalCount: "0", adoptionReadyCount: "0", isActive: true, latitude: "", longitude: "" });
    } catch (err: any) {
      alert(err?.message || "Failed to create shelter");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Shelters</h1>
          <p className="text-sm text-on-surface-variant">Manage shelter capacity and assignments</p>
        </div>
        <Button variant="primary" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" />Add Shelter</Button>
      </div>

      {shelters.length === 0 ? (
        <Card className="p-8">
          <EmptyState icon={HomeIcon} title="No shelters registered" description="Add your first shelter to track capacity." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shelters.map((shelter) => {
            const occupancy = shelter.totalCapacity > 0 ? Math.round((shelter.occupiedCount / shelter.totalCapacity) * 100) : 0;
            return (
              <Card key={shelter.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-on-surface">{shelter.name}</h3>
                    {shelter.locationText && <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-1"><HomeIcon className="w-3 h-3" /> {shelter.locationText}</p>}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge variant={shelter.isActive ? "success" : "danger"}>{shelter.isActive ? "Active" : "Inactive"}</Badge>
                      <Badge variant="neutral">Total: {shelter.totalCapacity}</Badge>
                      <Badge variant="neutral">Occupied: {shelter.occupiedCount}</Badge>
                      <Badge variant={occupancy > 90 ? "danger" : occupancy > 70 ? "warning" : "neutral"}>{occupancy}% full</Badge>
                    </div>
                    <div className="flex gap-3 mt-2 text-xs text-on-surface-variant">
                      <span>Quarantine: {shelter.quarantineCount}</span>
                      <span>Medical: {shelter.medicalCount}</span>
                      <span>Adoption-ready: {shelter.adoptionReadyCount}</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Shelter">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Shelter Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <Label>Location Text</Label>
            <Input value={form.locationText} onChange={(e) => setForm({ ...form, locationText: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Total Capacity</Label>
              <Input type="number" value={form.totalCapacity} onChange={(e) => setForm({ ...form, totalCapacity: e.target.value })} />
            </div>
            <div>
              <Label>Occupied</Label>
              <Input type="number" value={form.occupiedCount} onChange={(e) => setForm({ ...form, occupiedCount: e.target.value })} />
            </div>
            <div>
              <Label>Quarantine</Label>
              <Input type="number" value={form.quarantineCount} onChange={(e) => setForm({ ...form, quarantineCount: e.target.value })} />
            </div>
            <div>
              <Label>Medical</Label>
              <Input type="number" value={form.medicalCount} onChange={(e) => setForm({ ...form, medicalCount: e.target.value })} />
            </div>
            <div>
              <Label>Adoption-ready</Label>
              <Input type="number" value={form.adoptionReadyCount} onChange={(e) => setForm({ ...form, adoptionReadyCount: e.target.value })} />
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