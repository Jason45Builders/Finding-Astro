"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { use } from "react";
import { CheckCircle2, XCircle, Clock, DollarSign, Settings, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api, WelfarePayment, WelfareGroup } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { PageSpinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";

type Tab = "pending" | "verified" | "rejected" | "settings";

export default function WelfareGroupAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [group, setGroup] = useState<WelfareGroup | null>(null);
  const [payments, setPayments] = useState<WelfarePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [verifyModal, setVerifyModal] = useState<{ open: boolean; payment: WelfarePayment | null }>({ open: false, payment: null });
  const [rejectModal, setRejectModal] = useState<{ open: boolean; payment: WelfarePayment | null }>({ open: false, payment: null });
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const isAdmin = ["admin", "govt"].includes(user?.role || "");
  const canAccess = isAdmin || user?.id;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [groupData, donationsData] = await Promise.all([
          api.getWelfareGroup(id),
          api.listWelfareGroupDonations(id, { status: activeTab === "settings" ? undefined : activeTab.toUpperCase() }),
        ]);
        if (!cancelled) {
          setGroup(groupData);
          setPayments(donationsData);
        }
      } catch (err: any) {
        console.error("Failed to load admin data", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (canAccess) void load();
  }, [id, activeTab, canAccess]);

  const handleVerify = async () => {
    if (!verifyModal.payment) return;
    setActionLoading(true);
    try {
      await api.verifyWelfarePayment(verifyModal.payment.id);
      setPayments((prev) => prev.filter((p) => p.id !== verifyModal.payment!.id));
      setVerifyModal({ open: false, payment: null });
    } catch (err: any) {
      alert(err?.message || "Failed to verify payment");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal.payment || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await api.rejectWelfarePayment(rejectModal.payment.id, rejectReason.trim());
      setPayments((prev) => prev.filter((p) => p.id !== rejectModal.payment!.id));
      setRejectModal({ open: false, payment: null });
      setRejectReason("");
    } catch (err: any) {
      alert(err?.message || "Failed to reject payment");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <PageSpinner />;

  if (!group) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <Card className="p-8 text-center">
          <p className="text-error">Welfare group not found or you do not have access.</p>
          <Link href="/partners"><Button variant="outline" className="mt-4">Back to Partners</Button></Link>
        </Card>
      </div>
    );
  }

  const filteredPayments = payments;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/welfare-groups/${id}`}>
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
        </Link>
        <div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile sm:font-headline-lg sm:text-headline-lg text-on-surface">{group.name} — Admin</h1>
          <p className="text-sm text-on-surface-variant">Manage donations and payment settings</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-outline-variant">
        {[
          { key: "pending", label: "Pending", icon: Clock },
          { key: "verified", label: "Verified", icon: CheckCircle2 },
          { key: "rejected", label: "Rejected", icon: XCircle },
          { key: "settings", label: "Settings", icon: Settings },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as Tab)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${
              activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "settings" ? (
        <WelfareGroupSettings group={group} onUpdate={setGroup} />
      ) : (
        <div className="space-y-4">
          {filteredPayments.length === 0 ? (
            <Card className="p-8 text-center text-on-surface-variant">
              No {activeTab} donations yet.
            </Card>
          ) : (
            filteredPayments.map((payment) => (
              <Card key={payment.id} className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-on-surface text-base">₹{payment.amount.toLocaleString()}</span>
                      <Badge variant={payment.status === "VERIFIED" ? "success" : payment.status === "REJECTED" ? "danger" : "warning"}>
                        {payment.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-on-surface-variant">Receipt: {payment.receiptNumber}</p>
                    <p className="text-xs text-on-surface-variant">UTR: {payment.utr}</p>
                    <p className="text-xs text-on-surface-variant">Date: {payment.paymentDate}</p>
                    {payment.purpose && <p className="text-xs text-on-surface-variant">Purpose: {payment.purpose}</p>}
                    {payment.note && <p className="text-xs text-on-surface-variant mt-1">Note: {payment.note}</p>}
                    {payment.rejectionReason && <p className="text-xs text-error mt-1">Reason: {payment.rejectionReason}</p>}
                  </div>
                  {payment.status === "PENDING" && (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="primary" onClick={() => setVerifyModal({ open: true, payment })}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Verify
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setRejectModal({ open: true, payment })}>
                        <XCircle className="w-3.5 h-3.5 mr-1" />Reject
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      <Modal open={verifyModal.open} onClose={() => setVerifyModal({ open: false, payment: null })} title="Verify Payment">
        {verifyModal.payment && (
          <div className="space-y-4">
            <div className="p-4 bg-surface-container-high rounded-lg space-y-2">
              <p className="text-sm text-on-surface"><strong>Amount:</strong> ₹{verifyModal.payment.amount.toLocaleString()}</p>
              <p className="text-sm text-on-surface"><strong>UTR:</strong> {verifyModal.payment.utr}</p>
              <p className="text-sm text-on-surface"><strong>UPI Destination:</strong> {verifyModal.payment.upiIdSnapshot}</p>
              <p className="text-sm text-on-surface"><strong>Date:</strong> {verifyModal.payment.paymentDate}</p>
            </div>
            <p className="text-sm text-on-surface-variant">
              Have you confirmed that this amount was actually received in the organization&apos;s UPI/bank account?
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setVerifyModal({ open: false, payment: null })} disabled={actionLoading}>Cancel</Button>
              <Button variant="primary" onClick={handleVerify} disabled={actionLoading}>
                {actionLoading ? "Verifying..." : "Confirm Payment"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={rejectModal.open} onClose={() => { setRejectModal({ open: false, payment: null }); setRejectReason(""); }} title="Reject Payment">
        {rejectModal.payment && (
          <div className="space-y-4">
            <div className="p-4 bg-surface-container-high rounded-lg space-y-2">
              <p className="text-sm text-on-surface"><strong>Amount:</strong> ₹{rejectModal.payment.amount.toLocaleString()}</p>
              <p className="text-sm text-on-surface"><strong>UTR:</strong> {rejectModal.payment.utr}</p>
              <p className="text-sm text-on-surface"><strong>Date:</strong> {rejectModal.payment.paymentDate}</p>
            </div>
            <div>
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea
                id="reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., Payment not received, incorrect UTR, duplicate transaction..."
                required
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setRejectModal({ open: false, payment: null }); setRejectReason(""); }} disabled={actionLoading}>Cancel</Button>
              <Button variant="danger" onClick={handleReject} disabled={actionLoading || !rejectReason.trim()}>
                {actionLoading ? "Rejecting..." : "Reject Payment"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function WelfareGroupSettings({ group, onUpdate }: { group: WelfareGroup; onUpdate: (g: WelfareGroup) => void }) {
  const [upiId, setUpiId] = useState(group.upiId || "");
  const [upiName, setUpiName] = useState(group.upiName || "");
  const [paymentEnabled, setPaymentEnabled] = useState(group.paymentEnabled);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await api.updateWelfareGroupPaymentSettings(group.id, {
        upiId: upiId || undefined,
        upiName: upiName || undefined,
        paymentEnabled,
      });
      onUpdate({ ...group, ...updated });
      setMessage({ type: "success", text: "Payment settings updated" });
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Failed to update settings" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6 space-y-5">
      <h3 className="font-headline-md text-headline-md text-on-surface">Payment Settings</h3>
      <p className="text-sm text-on-surface-variant">
        Configure the UPI account where donors should send payments. This UPI ID will be displayed to donors along with a QR code.
      </p>

      <div>
        <Label htmlFor="upiId">UPI ID</Label>
        <Input
          id="upiId"
          type="text"
          placeholder="e.g. welfare@okaxis"
          value={upiId}
          onChange={(e) => setUpiId(e.target.value)}
        />
        <p className="text-xs text-on-surface-variant mt-1">Format: yourhandle@bankprovider</p>
      </div>

      <div>
        <Label htmlFor="upiName">UPI Name</Label>
        <Input
          id="upiName"
          type="text"
          placeholder="e.g. Chennai Animal Welfare Trust"
          value={upiName}
          onChange={(e) => setUpiName(e.target.value)}
        />
        <p className="text-xs text-on-surface-variant mt-1">Name as registered with UPI</p>
      </div>

      <div className="flex items-center gap-3">
        <input
          id="paymentEnabled"
          type="checkbox"
          checked={paymentEnabled}
          onChange={(e) => setPaymentEnabled(e.target.checked)}
          className="w-4 h-4 rounded border-outline text-primary focus:ring-primary"
        />
        <Label htmlFor="paymentEnabled" className="mb-0">Accepting donations</Label>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === "success" ? "bg-primary/10 text-primary" : "bg-error/10 text-error"}`}>
          {message.text}
        </div>
      )}

      <Button variant="primary" onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </Card>
  );
}
