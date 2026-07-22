"use client";

import React, { useEffect, useState } from "react";
import { Shield, CheckCircle, Loader2, DollarSign, FileText, Stethoscope, Building2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

type Reimbursement = {
  id: string;
  case_id: string;
  volunteer_id: string;
  amount_claimed: number;
  bill_url: string;
  prescription_url: string;
  doctor_name: string;
  hospital_id: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type Gates = { proof: boolean; hospitalVerified: boolean; surgeryDone: boolean };

export default function AdminReimbursementsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Reimbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [gatesMap, setGatesMap] = useState<Record<string, Gates>>({});

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.listReimbursementRequests();
      setItems(data);
      const gates: Record<string, Gates> = {};
      for (const r of data) {
        const proof = !!r.bill_url && !!r.prescription_url;
        const hospitalVerified = false;
        gates[r.id] = { proof, hospitalVerified, surgeryDone: r.status !== "PENDING_VERIFICATION" };
      }
      setGatesMap(gates);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  if (!user || !["admin", "govt", "ngo"].includes(user.role)) {
    return (
      <EmptyState icon={Shield} title="Admin Access Required" className="max-w-xl mx-auto mt-20" />
    );
  }

  const handleApprove = async (item: Reimbursement) => {
    if (!confirm(`Approve reimbursement of ₹${item.amount_claimed}?`)) return;
    setSubmitting(item.id);
    try {
      const result = await api.releasePayout(item.case_id);
      if ((result as any).approved) {
        await load();
      } else {
        alert(`Gates not cleared: ${JSON.stringify((result as any).gates)}`);
      }
    } catch (e) {
      alert("Failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSubmitting(null);
    }
  };

  const handleReject = async (item: Reimbursement) => {
    if (!confirm("Reject this reimbursement?")) return;
    setSubmitting(item.id);
    try {
      await api.releasePayout(item.case_id);
      await load();
    } catch (e) {
      alert("Failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSubmitting(null);
    }
  };

  const allGates = (item: Reimbursement): Gates => gatesMap[item.id] || { proof: false, hospitalVerified: false, surgeryDone: false };
  const allPassed = (g: Gates) => g.proof && g.hospitalVerified && g.surgeryDone;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-secondary" /> Reimbursement Approvals
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">3-gate approval flow: proof documents, hospital verification, surgery completion.</p>
      </div>

      {loading ? (
        <PageSpinner />
      ) : items.length === 0 ? (
        <EmptyState icon={DollarSign} title="No reimbursement requests" />
      ) : (
        <div className="space-y-4 animate-stagger">
          {items.map(item => {
            const gates = allGates(item);
            const passed = allPassed(gates);
            return (
              <Card key={item.id} className={cn("p-6 space-y-4", passed && "border-primary ring-1 ring-primary/30")}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-on-surface font-mono">Case {item.case_id.slice(0, 8)}</h3>
                    <p className="text-xs text-on-surface-variant mt-0.5 font-mono">Volunteer: {item.volunteer_id.slice(0, 8)} · Hospital: {item.hospital_id.slice(0, 8)}</p>
                    <p className="text-xs text-on-surface-variant">Doctor: {item.doctor_name} · Amount: <span className="font-mono">₹{item.amount_claimed}</span></p>
                    <p className="text-[10px] text-outline mt-0.5">{new Date(item.created_at).toLocaleString()} · Status: {item.status}</p>
                  </div>
                  <Badge variant={passed ? "success" : "warning"}>{passed ? "Ready for payout" : "Gates pending"}</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className={cn("p-3 rounded-md border", gates.proof ? "bg-green-50 border-green-200" : "bg-error-container/40 border-error/30")}>
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-bold">Proof Documents</span>
                    </div>
                    <p className="text-[10px] text-on-surface-variant">{gates.proof ? "Bill + prescription on file" : "Documents missing"}</p>
                    <div className="mt-2 space-y-1">
                      {item.bill_url && <a href={item.bill_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline block">Bill</a>}
                      {item.prescription_url && <a href={item.prescription_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline block">Prescription</a>}
                    </div>
                  </div>
                  <div className={cn("p-3 rounded-md border", gates.hospitalVerified ? "bg-green-50 border-green-200" : "bg-error-container/40 border-error/30")}>
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-bold">Hospital Verification</span>
                    </div>
                    <p className="text-[10px] text-on-surface-variant">{gates.hospitalVerified ? "Verified by hospital" : "Awaiting hospital sign-off"}</p>
                  </div>
                  <div className={cn("p-3 rounded-md border", gates.surgeryDone ? "bg-green-50 border-green-200" : "bg-error-container/40 border-error/30")}>
                    <div className="flex items-center gap-2 mb-1">
                      <Stethoscope className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-bold">Surgery Completion</span>
                    </div>
                    <p className="text-[10px] text-on-surface-variant">{gates.surgeryDone ? "Case progressed past PENDING_VERIFICATION" : "Still in pending verification"}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => handleApprove(item)} disabled={submitting === item.id || !passed} variant="primary" className="flex-1">
                    {submitting === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" /> Release Payout</>}
                  </Button>
                  <Button onClick={() => handleReject(item)} disabled={submitting === item.id} variant="danger" className="flex-1">
                    Reject
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
