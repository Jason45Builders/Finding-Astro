"use client";

import React, { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { CheckCircle2, Clock3, HeartHandshake, QrCode, ShieldCheck, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { PageSpinner } from "@/components/ui/Spinner";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

export default function OrgDonationsPage() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [report, setReport] = useState({ amount: "", utr: "", paymentDate: new Date().toISOString().slice(0, 10), note: "", isAnonymous: false });
  const [settings, setSettings] = useState({ upiId: "", upiName: "", monthlyTargetInr: "", donationsEnabled: true });

  const load = async () => {
    setLoading(true);
    try {
      const result = await api.listOrgDonations(month);
      setData(result);
      if (result.settings) {
        setSettings({
          upiId: result.settings.upiId || "",
          upiName: result.settings.upiName || "",
          monthlyTargetInr: result.settings.monthlyTargetInr == null ? "" : String(result.settings.monthlyTargetInr),
          donationsEnabled: result.settings.donationsEnabled,
        });
      }
    } catch (err: any) {
      setMessage(err?.message || "Unable to load donations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [month]);

  const upiUri = useMemo(() => {
    if (!data?.settings?.upiId) return null;
    const params = new URLSearchParams({
      pa: data.settings.upiId,
      pn: data.settings.upiName || data.settings.upiId,
      cu: "INR",
    });
    return `upi://pay?${params.toString()}`;
  }, [data]);

  useEffect(() => {
    let cancelled = false;
    if (!upiUri) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(upiUri, { width: 280, margin: 2 }).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    }).catch(() => setQrDataUrl(null));
    return () => { cancelled = true; };
  }, [upiUri]);

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMessage(null);
    try {
      await api.updateOrgDonationSettings({
        upiId: settings.upiId,
        upiName: settings.upiName || null,
        monthlyTargetInr: settings.monthlyTargetInr === "" ? null : Number(settings.monthlyTargetInr),
        donationsEnabled: settings.donationsEnabled,
      });
      setShowSetup(false);
      await load();
      setMessage("Monthly UPI collection settings saved.");
    } catch (err: any) {
      setMessage(err?.message || "Unable to save donation settings");
    } finally {
      setSaving(false);
    }
  };

  const submitDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMessage(null);
    try {
      await api.reportOrgDonation({
        amount: Number(report.amount),
        utr: report.utr,
        paymentDate: report.paymentDate,
        note: report.note || undefined,
        isAnonymous: report.isAnonymous,
      });
      setShowReport(false);
      setReport({ amount: "", utr: "", paymentDate: new Date().toISOString().slice(0, 10), note: "", isAnonymous: false });
      await load();
      setMessage("Payment recorded as pending. The donation admin will verify it.");
    } catch (err: any) {
      setMessage(err?.message || "Unable to record payment");
    } finally {
      setSaving(false);
    }
  };

  const review = async (donationId: string, status: "VERIFIED" | "REJECTED") => {
    const rejectionReason = status === "REJECTED" ? window.prompt("Reason for rejecting this donation?") || "Donation could not be verified" : undefined;
    setSaving(true);
    try {
      await api.reviewOrgDonation({ donationId, status, rejectionReason });
      await load();
    } catch (err: any) {
      setMessage(err?.message || "Unable to review donation");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) return <PageSpinner />;

  const summary = data?.summary ?? { verifiedAmountInr: 0, verifiedCount: 0, pendingCount: 0, donationCount: 0, targetInr: null };
  const progress = summary.targetInr ? Math.min(100, Math.round(summary.verifiedAmountInr / summary.targetInr * 100)) : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-7 h-7 text-primary" />
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Monthly Donations</h1>
          </div>
          <p className="text-sm text-on-surface-variant mt-1">Direct UPI collection for your Rescue Collective — no payment gateway.</p>
        </div>
        <div className="flex gap-2">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-auto" />
          {data?.settings && (
            <Button variant="primary" onClick={() => setShowReport(true)} disabled={!data.settings.donationsEnabled}>I Paid This Month</Button>
          )}
        </div>
      </div>

      {message && <div className="rounded-lg bg-primary/10 text-primary p-3 text-sm">{message}</div>}

      {!data?.settings ? (
        <Card className="p-8">
          <div className="max-w-2xl">
            <ShieldCheck className="w-10 h-10 text-primary mb-4" />
            <h2 className="text-xl font-black text-on-surface">Set up the collective&apos;s monthly UPI collection</h2>
            <p className="text-sm text-on-surface-variant mt-2">
              One designated donation admin controls the collection UPI. Once initialized, only that same admin can change the UPI, name, monthly target, or collection status.
            </p>
            {data?.canInitialize ? (
              <Button className="mt-5" onClick={() => setShowSetup(true)}>Set Up Donations</Button>
            ) : (
              <p className="mt-5 text-sm font-semibold text-on-surface-variant">The collective admin needs to configure the donation account.</p>
            )}
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5"><p className="text-xs text-on-surface-variant">Verified this month</p><p className="text-2xl font-black text-on-surface mt-1">{formatCurrency(summary.verifiedAmountInr)}</p></Card>
            <Card className="p-5"><p className="text-xs text-on-surface-variant">Contributors</p><p className="text-2xl font-black text-on-surface mt-1">{summary.verifiedCount}</p></Card>
            <Card className="p-5"><p className="text-xs text-on-surface-variant">Pending verification</p><p className="text-2xl font-black text-on-surface mt-1">{summary.pendingCount}</p></Card>
            <Card className="p-5"><p className="text-xs text-on-surface-variant">Monthly target</p><p className="text-2xl font-black text-on-surface mt-1">{summary.targetInr == null ? "—" : formatCurrency(summary.targetInr)}</p></Card>
          </div>

          {progress !== null && (
            <Card className="p-5">
              <div className="flex justify-between text-sm font-bold"><span>Monthly progress</span><span>{progress}%</span></div>
              <div className="mt-3 h-3 rounded-full bg-surface-container-high overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} /></div>
            </Card>
          )}

          <div className="grid lg:grid-cols-[340px_1fr] gap-6">
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4"><QrCode className="w-5 h-5 text-primary" /><h2 className="font-bold">Pay the collective</h2></div>
              {qrDataUrl && <img src={qrDataUrl} alt="UPI payment QR code" className="w-full max-w-[280px] mx-auto rounded-xl border border-outline-variant" />}
              <p className="text-center text-xs text-on-surface-variant mt-3">UPI ID: <strong>{data.settings.upiId}</strong></p>
              {data.settings.upiName && <p className="text-center text-xs text-on-surface-variant">{data.settings.upiName}</p>}
              <Button className="w-full mt-4" variant="outline" onClick={() => upiUri && (window.location.href = upiUri)} disabled={!upiUri || !data.settings.donationsEnabled}>Open UPI App</Button>
              <p className="text-[11px] text-on-surface-variant mt-3">Scan with your UPI app, complete the bank payment, then tap “I Paid This Month” and enter the transaction reference.</p>
              <div className="mt-4 rounded-lg bg-surface-container-low p-3 text-[11px] text-on-surface-variant">
                <strong className="text-on-surface">Collection admin:</strong> {data.settings.donationAdminName || "Designated admin"}
              </div>
              {data.currentUserIsDonationAdmin && (
                <Button className="w-full mt-3" variant="outline" onClick={() => setShowSetup(true)}>Manage Collection</Button>
              )}
            </Card>

            <Card className="overflow-hidden">
              <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
                <div><h2 className="font-bold">This month&apos;s payment ledger</h2><p className="text-xs text-on-surface-variant mt-1">Payments are reported by members and verified by the designated donation admin.</p></div>
              </div>
              <div className="divide-y divide-outline-variant/50">
                {(data.donations ?? []).map((d: any) => (
                  <div key={d.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2"><span className="font-bold text-on-surface">{d.donorName}</span><Badge variant={d.status === "VERIFIED" ? "success" : d.status === "REJECTED" ? "danger" : "warning"}>{d.status}</Badge></div>
                      <p className="text-xs text-on-surface-variant mt-1">{formatCurrency(d.amount)} · {d.paymentDate} · UTR {d.utr}</p>
                      {d.note && <p className="text-xs text-on-surface-variant mt-1">{d.note}</p>}
                    </div>
                    {data.currentUserIsDonationAdmin && d.status === "PENDING" && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="primary" onClick={() => void review(d.id, "VERIFIED")} disabled={saving}><CheckCircle2 className="w-4 h-4 mr-1" />Verify</Button>
                        <Button size="sm" variant="danger" onClick={() => void review(d.id, "REJECTED")} disabled={saving}><XCircle className="w-4 h-4 mr-1" />Reject</Button>
                      </div>
                    )}
                  </div>
                ))}
                {(!data.donations || data.donations.length === 0) && <div className="p-10 text-center text-sm text-on-surface-variant"><Clock3 className="w-6 h-6 mx-auto mb-2" />No payments recorded for this month.</div>}
              </div>
            </Card>
          </div>
        </>
      )}

      <Modal open={showSetup} onClose={() => setShowSetup(false)} title={data?.settings ? "Manage Monthly Collection" : "Set Up Monthly Collection"}>
        <form onSubmit={saveSettings} className="space-y-4">
          <div><Label>Fixed UPI ID</Label><Input value={settings.upiId} onChange={(e) => setSettings({ ...settings, upiId: e.target.value })} placeholder="rescuegroup@upi" required /><p className="text-[11px] text-on-surface-variant mt-1">This becomes the collective&apos;s fixed collection UPI. Only the designated donation admin can change it.</p></div>
          <div><Label>UPI account name</Label><Input value={settings.upiName} onChange={(e) => setSettings({ ...settings, upiName: e.target.value })} placeholder="Name shown with the UPI account" /></div>
          <div><Label>Monthly target (INR)</Label><Input type="number" min="0" step="1" value={settings.monthlyTargetInr} onChange={(e) => setSettings({ ...settings, monthlyTargetInr: e.target.value })} placeholder="Optional" /></div>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={settings.donationsEnabled} onChange={(e) => setSettings({ ...settings, donationsEnabled: e.target.checked })} /> Accept monthly contributions</label>
          <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setShowSetup(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Collection"}</Button></div>
        </form>
      </Modal>

      <Modal open={showReport} onClose={() => setShowReport(false)} title="Record My UPI Payment">
        <form onSubmit={submitDonation} className="space-y-4">
          <div><Label>Amount (INR)</Label><Input type="number" min="1" step="1" value={report.amount} onChange={(e) => setReport({ ...report, amount: e.target.value })} required /></div>
          <div><Label>UPI transaction reference / UTR</Label><Input value={report.utr} onChange={(e) => setReport({ ...report, utr: e.target.value })} placeholder="Enter the reference from your UPI app" required /><p className="text-[11px] text-on-surface-variant mt-1">This lets the collection admin reconcile your reported payment against the receiving account.</p></div>
          <div><Label>Payment date</Label><Input type="date" value={report.paymentDate} onChange={(e) => setReport({ ...report, paymentDate: e.target.value })} required /></div>
          <div><Label>Note</Label><Textarea value={report.note} onChange={(e) => setReport({ ...report, note: e.target.value })} rows={2} placeholder="Optional" /></div>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={report.isAnonymous} onChange={(e) => setReport({ ...report, isAnonymous: e.target.checked })} /> Show me as anonymous in the group ledger</label>
          <div className="rounded-lg bg-surface-container-low p-3 text-xs text-on-surface-variant">Finding Astro does not receive the bank transaction automatically. Your payment is made directly to the collective&apos;s UPI account; this form records your declaration and the UTR for the designated admin to verify.</div>
          <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setShowReport(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Recording..." : "Record Payment"}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
