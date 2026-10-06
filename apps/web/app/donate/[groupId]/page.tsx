"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { CheckCircle2, Copy, ExternalLink, HeartHandshake, MapPin, Share2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

export default function PublicDonationPage({ params }: { params: Promise<{ groupId: string }> }) {
  const [data, setData] = useState<any>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void params.then(async ({ groupId }) => {
      try {
        const response = await fetch(`/api/v1/public/rescue-collectives/${groupId}/donation`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.message || "Donations are not available");
        if (!cancelled) setData(payload.data);
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "Unable to load donation page");
      } finally {
        if (!cancelled) setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [params]);

  const upiUri = useMemo(() => {
    if (!data?.donation?.upiId) return null;
    const params = new URLSearchParams({ pa: data.donation.upiId, pn: data.donation.upiName || data.donation.upiId, cu: "INR" });
    return `upi://pay?${params.toString()}`;
  }, [data]);

  useEffect(() => {
    if (!upiUri) return setQr(null);
    let cancelled = false;
    QRCode.toDataURL(upiUri, { width: 420, margin: 3, errorCorrectionLevel: "M" })
      .then(url => { if (!cancelled) setQr(url); })
      .catch(() => { if (!cancelled) setQr(null); });
    return () => { cancelled = true; };
  }, [upiUri]);

  const copy = async (value: string, success: string) => {
    try { await navigator.clipboard.writeText(value); setMessage(success); }
    catch { setMessage("Copy was blocked by your browser."); }
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Donate to ${data.collective.name}`, text: `Support ${data.collective.name} with a direct UPI donation.`, url });
      } else {
        await copy(url, "Donation link copied. Paste it into WhatsApp.");
      }
    } catch {}
  };

  if (loading) return <PageSpinner />;

  if (!data) return (
    <main className="min-h-screen bg-surface-container-low px-4 py-10">
      <Card className="max-w-xl mx-auto p-8 text-center">
        <HeartHandshake className="w-10 h-10 mx-auto text-primary" />
        <h1 className="mt-4 font-headline-lg text-headline-lg text-on-surface">Donation page unavailable</h1>
        <p className="mt-2 text-sm text-on-surface-variant">{message || "This Rescue Collective is not accepting donations right now."}</p>
      </Card>
    </main>
  );

  const { collective, donation } = data;
  const progress = donation.monthlyTargetInr
    ? Math.min(100, Math.round((donation.verifiedAmountInr / donation.monthlyTargetInr) * 100))
    : null;

  return (
    <main className="min-h-screen bg-surface-container-low px-4 py-6 sm:py-10">
      <div className="max-w-4xl mx-auto">
        <Card className="overflow-hidden">
          <header className="bg-primary text-on-primary p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-90">
                  <HeartHandshake className="w-4 h-4" /> Finding Astro Rescue Collective
                </div>
                <h1 className="mt-3 text-2xl sm:text-4xl font-black">{collective.name}</h1>
                {collective.city && <p className="mt-2 inline-flex items-center gap-1.5 text-sm opacity-90"><MapPin className="w-4 h-4" />{collective.city}</p>}
              </div>
              {collective.isVerified && <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold"><CheckCircle2 className="w-4 h-4" />Verified</span>}
            </div>
          </header>

          <div className="p-5 sm:p-8">
            <div className="grid md:grid-cols-[1fr_auto] gap-8 items-center">
              <div>
                <p className="text-sm font-bold text-on-surface-variant uppercase tracking-wide">Monthly rescue fund</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-on-surface">{formatCurrency(donation.verifiedAmountInr)}</span>
                  {donation.monthlyTargetInr != null && <span className="text-sm text-on-surface-variant">of {formatCurrency(donation.monthlyTargetInr)}</span>}
                </div>
                {progress != null && <div className="mt-4">
                  <div className="h-3 rounded-full bg-surface-container-high overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} /></div>
                  <p className="mt-2 text-xs text-on-surface-variant">{progress}% of this month's target · {donation.verifiedCount} verified donations</p>
                </div>}
              </div>

              <div className="flex flex-col items-center">
                {qr ? <img src={qr} alt={`UPI donation QR for ${collective.name}`} className="w-56 h-56 rounded-xl bg-white p-2 shadow-sm" /> : <div className="w-56 h-56 rounded-xl bg-surface-container-high flex items-center justify-center text-sm text-on-surface-variant">QR unavailable</div>}
                {qr && <a href={qr} download={`${collective.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-upi-qr.png`} className="mt-3 text-sm font-bold text-primary hover:underline">Download QR image</a>}
              </div>
            </div>

            <section className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <p className="text-sm font-bold text-on-surface">Donate directly by UPI</p>
              <p className="text-xs text-on-surface-variant mt-1">No Finding Astro account is required. Scan the QR or open the UPI payment link.</p>
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <Button variant="primary" onClick={() => upiUri && (window.location.href = upiUri)} disabled={!upiUri}><Smartphone className="w-4 h-4 mr-2" />Open UPI app</Button>
                <Button variant="secondary" onClick={() => copy(donation.upiId, "UPI ID copied.")}><Copy className="w-4 h-4 mr-2" />Copy UPI ID</Button>
                <Button variant="secondary" onClick={share}><Share2 className="w-4 h-4 mr-2" />Share on WhatsApp</Button>
              </div>
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2">
                <code className="rounded-lg bg-surface-container-lowest border border-outline-variant px-3 py-2 text-sm font-semibold break-all">{donation.upiId}</code>
                {donation.upiName && <span className="text-sm text-on-surface-variant">· {donation.upiName}</span>}
              </div>
            </section>

            <div className="mt-6 grid sm:grid-cols-2 gap-3">
              <Card className="p-4 bg-surface-container-low">
                <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">After you pay</p>
                <p className="mt-1 text-sm text-on-surface">Keep your UPI transaction reference (UTR). The collective admin can reconcile your payment in Finding Astro.</p>
              </Card>
              <Card className="p-4 bg-surface-container-low">
                <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Share with WhatsApp</p>
                <p className="mt-1 text-sm text-on-surface">Send this page or the QR image to your group. Donors do not need to join Finding Astro.</p>
              </Card>
            </div>

            {collective.website && <a href={collective.website} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">Visit collective website <ExternalLink className="w-4 h-4" /></a>}
            {message && <p className="mt-4 text-sm font-semibold text-primary" role="status">{message}</p>}
          </div>
        </Card>
      </div>
    </main>
  );
}
