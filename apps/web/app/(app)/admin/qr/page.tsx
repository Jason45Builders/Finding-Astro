"use client";

import React, { useEffect, useState } from "react";
import { Shield, Plus, Search, QrCode as QrCodeIcon } from "lucide-react";
import { api, QrCode as QrCodeType } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Select, Label } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

const QR_TYPES = ["animal", "zone", "case", "shelter"];

export default function AdminQrPage() {
  const { user } = useAuth();
  const [codes, setCodes] = useState<QrCodeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ code: "", qrType: "animal", linkedAnimalId: "", linkedZoneId: "", linkedCaseId: "", latitude: 13.0, longitude: 80.0, locationText: "", displayLabel: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setCodes(await api.listQrCodes());
    } catch { setCodes([]); }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  if (!user || !["admin", "govt", "ngo"].includes(user.role)) {
    return (
      <div className="max-w-xl mx-auto py-20">
        <EmptyState
          icon={Shield}
          title="Admin Access Required"
          description="You don't have permission to manage QR codes."
        />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.createQrCode({
        code: form.code,
        qrType: form.qrType,
        linkedAnimalId: form.linkedAnimalId || undefined,
        linkedZoneId: form.linkedZoneId || undefined,
        linkedCaseId: form.linkedCaseId || undefined,
        latitude: form.latitude,
        longitude: form.longitude,
        locationText: form.locationText || undefined,
        displayLabel: form.displayLabel || undefined,
      });
      setShowForm(false);
      setForm({ code: "", qrType: "animal", linkedAnimalId: "", linkedZoneId: "", linkedCaseId: "", latitude: 13.0, longitude: 80.0, locationText: "", displayLabel: "" });
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to create QR code.");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = codes.filter(c => c.code.toLowerCase().includes(search.toLowerCase()) || c.displayLabel?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface tracking-tight flex items-center gap-2">
            <QrCodeIcon className="w-6 h-6 text-primary" /> QR Codes
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">Generate and manage QR codes for animals, zones, and cases.</p>
        </div>
        <Button variant="primary" onClick={() => setShowForm(!showForm)} className="shrink-0">
          <Plus className="w-4 h-4" />{showForm ? "Cancel" : "New QR Code"}
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 space-y-5">
          <h3 className="font-bold text-on-surface">Create QR Code</h3>
          {error && <div className="bg-error-container text-on-error-container p-4 rounded-xl text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Code *</Label>
                <Input required value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. ANIMAL-001" className="rounded-md" />
              </div>
              <div>
                <Label>Type *</Label>
                <Select value={form.qrType} onChange={e => setForm(f => ({ ...f, qrType: e.target.value }))} className="rounded-md">
                  {QR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Linked Animal ID</Label>
                <Input value={form.linkedAnimalId} onChange={e => setForm(f => ({ ...f, linkedAnimalId: e.target.value }))} className="rounded-md text-xs" />
              </div>
              <div>
                <Label>Linked Zone ID</Label>
                <Input value={form.linkedZoneId} onChange={e => setForm(f => ({ ...f, linkedZoneId: e.target.value }))} className="rounded-md text-xs" />
              </div>
              <div>
                <Label>Linked Case ID</Label>
                <Input value={form.linkedCaseId} onChange={e => setForm(f => ({ ...f, linkedCaseId: e.target.value }))} className="rounded-md text-xs" />
              </div>
            </div>
            <div>
              <Label>Display Label</Label>
              <Input value={form.displayLabel} onChange={e => setForm(f => ({ ...f, displayLabel: e.target.value }))} placeholder="Human-readable label" className="rounded-md" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Latitude</Label>
                <Input type="number" step="any" value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: parseFloat(e.target.value) || 0 }))} className="rounded-md" />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input type="number" step="any" value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: parseFloat(e.target.value) || 0 }))} className="rounded-md" />
              </div>
            </div>
            <Button type="submit" variant="primary" size="lg" disabled={submitting} className="w-full">
              {submitting ? "Creating..." : "Create QR Code"}
            </Button>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-outline-variant">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
            <Input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search QR codes..."
              className="rounded-md pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : filtered.length > 0 ? (
          <div className="divide-y divide-outline-variant/50 animate-stagger">
            {filtered.map(qr => (
              <div key={qr.id} className="p-4 flex items-center justify-between gap-4 hover:bg-surface-container transition-colors duration-150 ease-out">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-on-surface text-sm">{qr.displayLabel || qr.code}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5 capitalize">{qr.qrType} · {qr.code}</p>
                  <p className="text-[10px] text-outline mt-0.5">{qr.locationText || `${qr.location?.latitude ?? "?"}, ${qr.location?.longitude ?? "?"}`}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={qr.isActive ? "success" : "danger"}>
                    {qr.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <span className="font-mono text-[10px] text-outline">{qr.scanCount} scans</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-outline text-sm">No QR codes found.</div>
        )}
      </Card>
    </div>
  );
}
