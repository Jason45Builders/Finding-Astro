"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { use } from "react";
import { Heart, MapPin, Phone, Mail, Globe, CheckCircle2, Clock, Copy, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api, WelfareGroup } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { PageSpinner } from "@/components/ui/Spinner";

const DONATION_PURPOSES = [
  { value: "general", label: "General Welfare" },
  { value: "rescue", label: "Specific Rescue" },
  { value: "treatment", label: "Animal Treatment" },
  { value: "abc", label: "ABC Programme" },
  { value: "recovery", label: "Recovery / Foster" },
  { value: "other", label: "Other" },
];

export default function WelfareGroupProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [group, setGroup] = useState<WelfareGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [utr, setUtr] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [purpose, setPurpose] = useState("general");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [groupData] = await Promise.all([
          api.getWelfareGroup(id),
        ]);
        if (!cancelled) {
          setGroup(groupData);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load welfare group");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [id]);

  const loadQr = async () => {
    if (!group?.paymentEnabled || !group?.upiId) return;
    setLoadingQr(true);
    try {
      const res = await fetch(`/api/v1/welfare-groups/${id}/qr`);
      const data = await res.json();
      if (data.success) setQrDataUrl(data.data.qrDataUrl);
    } catch {
      // ignore
    } finally {
      setLoadingQr(false);
    }
  };

  useEffect(() => {
    if (group?.paymentEnabled && group?.upiId) {
      void loadQr();
    }
  }, [group?.paymentEnabled, group?.upiId]);

  const handleCopyUpi = async () => {
    if (!group?.upiId) return;
    await navigator.clipboard.writeText(group.upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenUpi = () => {
    if (!group?.upiId || !amount) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return;
    const upiString = `upi://pay?pa=${encodeURIComponent(group.upiId)}&pn=${encodeURIComponent(group.upiName || group.upiId)}&am=${amt.toFixed(2)}&cu=INR`;
    window.open(upiString, "_blank");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);
    setSubmitting(true);

    try {
      const amt = parseFloat(amount);
      if (isNaN(amt) || amt <= 0) throw new Error("Please enter a valid amount");
      if (!utr.trim()) throw new Error("Please enter the UTR / transaction reference number");

      await api.submitWelfareDonation(id, {
        amount: amt,
        utr: utr.trim(),
        paymentDate,
        purpose: purpose !== "general" ? purpose : undefined,
        note: note.trim() || undefined,
      });

      setSubmitSuccess(`Payment claim submitted for ₹${amt}. Awaiting verification by ${group?.name}.`);
      setAmount("");
      setUtr("");
      setNote("");
      setPurpose("general");
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to submit donation");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageSpinner />;

  if (error || !group) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="p-8 text-center">
          <p className="text-error font-body-md">{error || "Welfare group not found"}</p>
          <Link href="/partners"><Button variant="outline" className="mt-4">Back to Partners</Button></Link>
        </Card>
      </div>
    );
  }

  const canDonate = user && group.paymentEnabled && group.upiId;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile sm:font-headline-lg sm:text-headline-lg text-on-surface">{group.name}</h1>
              {group.isVerified && (
                <span className="shrink-0" title="Verified Welfare Group">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-on-surface-variant">
              {group.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{group.city}</span>}
              {group.phone && <a href={`tel:${group.phone}`} className="flex items-center gap-1 hover:text-primary"><Phone className="w-3.5 h-3.5" />{group.phone}</a>}
              {group.email && <a href={`mailto:${group.email}`} className="flex items-center gap-1 hover:text-primary"><Mail className="w-3.5 h-3.5" />{group.email}</a>}
              {group.website && <a href={group.website} target="_blank" rel="noopener" className="flex items-center gap-1 hover:text-primary"><Globe className="w-3.5 h-3.5" />Website<ExternalLink className="w-3 h-3" /></a>}
            </div>
            {group.address && <p className="text-sm text-on-surface-variant mt-2">{group.address}</p>}
          </div>
        </div>

        {!user && (
          <div className="mt-6 p-4 bg-surface-container-high rounded-lg text-sm text-on-surface-variant">
            Please <Link href="/auth/login" className="text-primary font-bold underline">log in</Link> to make a donation.
          </div>
        )}

        {user && !group.paymentEnabled && (
          <div className="mt-6 p-4 bg-surface-container-high rounded-lg text-sm text-on-surface-variant">
            This welfare group is not accepting donations at this time.
          </div>
        )}

        {user && group.paymentEnabled && !group.upiId && (
          <div className="mt-6 p-4 bg-surface-container-high rounded-lg text-sm text-on-surface-variant">
            This welfare group has not yet configured their UPI payment details.
          </div>
        )}

        {canDonate && (
          <div className="mt-8 space-y-6">
            <div className="border-t border-outline-variant pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-headline-md text-headline-md text-on-surface mb-1">Support {group.name}</h2>
                  <p className="text-sm text-on-surface-variant">
                    Pay directly to the welfare group&apos;s UPI account. Finding Astro does not receive or hold this money.
                  </p>
                </div>
                {(user?.role === "admin" || user?.role === "govt") && (
                  <Link href={`/welfare-groups/${id}/admin`}>
                    <Button variant="outline" size="sm">Admin Dashboard</Button>
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-4 bg-surface-container-high rounded-lg space-y-3">
                    <div>
                      <Label className="text-xs text-on-surface-variant">UPI ID</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 bg-surface-container-lowest px-3 py-2 rounded text-sm font-mono text-on-surface break-all">{group.upiId}</code>
                        <Button variant="outline" size="sm" onClick={handleCopyUpi} className="shrink-0">
                          {copied ? "Copied" : <><Copy className="w-3.5 h-3.5 mr-1" />Copy</>}
                        </Button>
                      </div>
                    </div>
                    {group.upiName && (
                      <div>
                        <Label className="text-xs text-on-surface-variant">UPI Name</Label>
                        <p className="text-sm text-on-surface mt-1">{group.upiName}</p>
                      </div>
                    )}

                    <div className="pt-2">
                      <Label className="text-xs text-on-surface-variant mb-2">Payment QR Code</Label>
                      {loadingQr ? (
                        <div className="w-40 h-40 bg-surface-container-lowest rounded-lg flex items-center justify-center">
                          <PageSpinner />
                        </div>
                      ) : qrDataUrl ? (
                        <img src={qrDataUrl} alt="UPI QR Code" className="w-40 h-40 rounded-lg border border-outline-variant" />
                      ) : (
                        <div className="w-40 h-40 bg-surface-container-lowest rounded-lg flex items-center justify-center text-xs text-on-surface-variant p-4 text-center">
                          QR not available
                        </div>
                      )}
                    </div>

                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full"
                      disabled={!amount || parseFloat(amount) <= 0}
                      onClick={handleOpenUpi}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Pay via UPI
                    </Button>
                    <p className="text-xs text-on-surface-variant text-center">
                      Opens your UPI app with pre-filled amount
                    </p>
                  </div>
                </div>

                <div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="amount">Amount (INR)</Label>
                      <Input
                        id="amount"
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="500"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="utr">UTR / Transaction Reference</Label>
                      <Input
                        id="utr"
                        type="text"
                        placeholder="e.g. 123456789012"
                        value={utr}
                        onChange={(e) => setUtr(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="paymentDate">Payment Date</Label>
                      <Input
                        id="paymentDate"
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="purpose">Donation Purpose</Label>
                      <select
                        id="purpose"
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        className="w-full bg-surface-container-low border-b-2 border-outline focus:border-primary focus:ring-0 focus:outline-none px-4 py-3 rounded-t-md transition-colors font-body-md text-on-surface"
                      >
                        {DONATION_PURPOSES.map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="note">Note (optional)</Label>
                      <textarea
                        id="note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Any message for the welfare group..."
                        className="w-full bg-surface-container-low border-b-2 border-outline focus:border-primary focus:ring-0 focus:outline-none px-4 py-3 rounded-t-md transition-colors font-body-md text-on-surface resize-none min-h-[80px]"
                      />
                    </div>

                    {submitError && (
                      <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error">{submitError}</div>
                    )}
                    {submitSuccess && (
                      <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm text-primary">{submitSuccess}</div>
                    )}

                    <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
                      {submitting ? "Submitting..." : "I've Made the Payment"}
                    </Button>
                    <p className="text-xs text-on-surface-variant text-center">
                      Your payment claim will be verified by the welfare group before being recorded.
                    </p>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
