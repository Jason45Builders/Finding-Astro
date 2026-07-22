"use client";

import React, { useEffect, useState } from "react";
import { Building2, Store, CheckCircle, XCircle, Loader2, Eye } from "lucide-react";
import { statusToken } from "@/lib/status";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Textarea, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

interface PartnerRequest {
  id: string;
  type: "clinic" | "store";
  name: string;
  address: string | null;
  phone: string | null;
  city: string | null;
  ward_name: string | null;
  clinic_type?: string | null;
  accepts_strays?: boolean;
  emergency_24hr?: boolean;
  has_surgery?: boolean;
  has_inpatient?: boolean;
  sells_medicine?: boolean;
  sells_food?: boolean;
  operating_hours?: string | null;
  notes?: string | null;
  created_at: string;
}

export default function AdminPartnerRequestsPage() {
  const [requests, setRequests] = useState<PartnerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selected, setSelected] = useState<PartnerRequest | null>(null);
  const [note, setNote] = useState("");

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/partner-requests");
      const json = await res.json();
      if (json.success) setRequests(json.data);
    } catch {
      console.error("Failed to load partner requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      const res = await fetch(`/api/v1/admin/partner-requests/${id}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setNote("");
      setSelected(null);
      fetchRequests();
    } catch (err: any) {
      alert(err?.message || "Approval failed");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Reject this partner request? The applicant will see your note.")) return;
    setProcessing(id);
    try {
      const res = await fetch(`/api/v1/admin/partner-requests/${id}/reject`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setNote("");
      setSelected(null);
      fetchRequests();
    } catch (err: any) {
      alert(err?.message || "Rejection failed");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Partner Requests</h1>
        <p className="text-sm text-on-surface-variant mt-1">Review clinics and stores requesting to join the partner network.</p>
      </div>

      {loading ? (
        <PageSpinner />
      ) : requests.length === 0 ? (
        <EmptyState icon={Building2} title="No pending partner requests" />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="p-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">Name</th>
                  <th className="p-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">Type</th>
                  <th className="p-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">City</th>
                  <th className="p-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">Phone</th>
                  <th className="p-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">Submitted</th>
                  <th className="p-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-surface-container transition-colors duration-150 ease-out">
                    <td className="p-4 font-semibold text-on-surface">{req.name}</td>
                    <td className="p-4">
                      <Badge variant={statusToken.partnerType(req.type).variant} className="inline-flex items-center gap-1.5">
                        {req.type === "clinic" ? <Building2 className="w-3.5 h-3.5" /> : <Store className="w-3.5 h-3.5" />} {req.type}
                      </Badge>
                    </td>
                    <td className="p-4 text-on-surface-variant">{req.city || "—"}</td>
                    <td className="p-4 text-on-surface-variant">{req.phone || "—"}</td>
                    <td className="p-4 text-outline">{new Date(req.created_at).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      <div className="flex gap-1.5 justify-end">
                        <Button size="sm" variant="ghost" className="p-2" onClick={() => setSelected(req)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="p-2 text-primary hover:bg-primary-container/40" onClick={() => handleApprove(req.id)} disabled={processing === req.id}>
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="p-2 text-error hover:bg-error-container/40" onClick={() => handleReject(req.id)} disabled={processing === req.id}>
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={!!selected} onClose={() => { setSelected(null); setNote(""); }} title="Review Request">
        {selected && (
          <div className="space-y-4">
            <div className="space-y-2 text-sm">
              {selected.address && <p><strong>Address:</strong> {selected.address}, {selected.ward_name || ""}</p>}
              {selected.clinic_type && <p><strong>Clinic Type:</strong> {selected.clinic_type}</p>}
              {selected.accepts_strays !== undefined && <p><strong>Accepts Strays:</strong> {selected.accepts_strays ? "Yes" : "No"}</p>}
              {selected.emergency_24hr !== undefined && <p><strong>24/7 Emergency:</strong> {selected.emergency_24hr ? "Yes" : "No"}</p>}
              {selected.has_surgery !== undefined && <p><strong>Surgery:</strong> {selected.has_surgery ? "Yes" : "No"}</p>}
              {selected.has_inpatient !== undefined && <p><strong>Inpatient:</strong> {selected.has_inpatient ? "Yes" : "No"}</p>}
              {selected.sells_medicine !== undefined && <p><strong>Sells Medicine:</strong> {selected.sells_medicine ? "Yes" : "No"}</p>}
              {selected.sells_food !== undefined && <p><strong>Sells Food:</strong> {selected.sells_food ? "Yes" : "No"}</p>}
              {selected.operating_hours && <p><strong>Hours:</strong> {selected.operating_hours}</p>}
              {selected.notes && <p><strong>Notes:</strong> {selected.notes}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Admin Note (optional)</Label>
              <Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} />
            </div>
            <div className="flex gap-3">
              <Button onClick={() => handleApprove(selected.id)} disabled={processing === selected.id} variant="primary" className="flex-1">
                {processing === selected.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve"}
              </Button>
              <Button onClick={() => handleReject(selected.id)} disabled={processing === selected.id} variant="danger" className="flex-1">
                {processing === selected.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
