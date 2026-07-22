"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChevronLeft,
  Heart,
  Building,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { api, FundingCase } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PageSpinner } from "@/components/ui/Spinner";

const QUICK_AMOUNTS = [100, 500, 1000, 2000];

export default function FundingCaseDetails() {
  const params = useParams<{ id: string }>();

  const [funding, setFunding] = useState<FundingCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [donateAmount, setDonateAmount] = useState<number | "">("");
  const [donating, setDonating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const loadFunding = async () => {
    if (!params?.id) return;
    try {
      const data = await api.getFunding(params.id);
      setFunding(data);
    } catch (err) {
      console.error("Failed to load funding case", err);
      setError("Funding case not found.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFunding();
  }, [params?.id]);

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!funding || !donateAmount || donateAmount <= 0) return;
    setDonating(true);
    setError(null);
    setSuccess(false);

    try {
      await api.donate(funding.id, Number(donateAmount));
      setSuccess(true);
      setDonateAmount("");
      await loadFunding();
    } catch (err: any) {
      setError(err?.message || "Donation failed. Please try again.");
    } finally {
      setDonating(false);
    }
  };

  if (loading) {
    return <PageSpinner />;
  }

  if (error || !funding) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
        <h2 className="font-title-md text-title-md text-on-surface">{error || "Funding Error"}</h2>
        <Link href="/dashboard" className="text-primary font-bold hover:underline mt-4 block">
          &larr; Back to Dashboard
        </Link>
      </div>
    );
  }

  const progressPercent = Math.min(
    100,
    Math.round((funding.raisedAmount / funding.totalAmount) * 100)
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back link */}
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors duration-150 ease-out">
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Funding Details */}
        <Card className="lg:col-span-7 p-6 sm:p-8 space-y-6">
          <div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-label-caps text-label-caps bg-primary-container text-on-primary-container mb-3">
              Medical Fundraiser
            </span>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile sm:font-headline-lg sm:text-headline-lg text-on-surface tracking-tight leading-tight">
              Animal Care &amp; Treatment Payout
            </h1>
            <p className="text-on-surface-variant text-sm mt-1">Supporting street animal recovery under veterinary hospital care</p>
          </div>

          {/* Hospital Information */}
          <div className="flex items-center gap-3 p-4 bg-surface-container-low rounded-xl border border-outline-variant">
            <Building className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="font-label-caps text-label-caps text-on-surface-variant">Hospital Partner</p>
              <p className="text-sm font-bold text-on-surface">{funding.hospitalName || "Partner Vet Clinic, Chennai"}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm font-semibold">
              <span className="font-mono text-on-surface-variant">Raised: ₹{funding.raisedAmount.toLocaleString("en-IN")}</span>
              <span className="font-mono text-on-surface">Goal: ₹{funding.totalAmount.toLocaleString("en-IN")}</span>
            </div>
            <ProgressBar value={funding.raisedAmount} max={Math.max(funding.totalAmount, 1)} />
            <div className="flex justify-between items-center text-xs text-outline">
              <span>{progressPercent}% raised</span>
              <span className="font-mono">₹{(funding.totalAmount - funding.raisedAmount).toLocaleString("en-IN")} remaining</span>
            </div>
          </div>

          <hr className="border-outline-variant" />

          {/* Information */}
          <div className="space-y-3">
            <h3 className="font-bold text-on-surface text-sm">About this campaign</h3>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              Every donation goes directly to paying for the veterinary hospital treatments logged under the animal&apos;s case file. Payout releases are verified by government and platform administrators.
            </p>
          </div>
        </Card>

        {/* Right: Donation form */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6 space-y-6">
            <h3 className="font-bold text-on-surface text-lg flex items-center gap-1.5">
              <Heart className="w-5 h-5 text-secondary fill-secondary" /> Send Donation Support
            </h3>

            {success && (
              <div className="bg-green-100 text-green-800 border border-green-200 p-4 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                Thank you! Your donation was logged successfully.
              </div>
            )}

            {error && (
              <div className="bg-error-container text-on-error-container border border-error/30 p-4 rounded-xl text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleDonate} className="space-y-4">
              {/* Quick Select Buttons */}
              <div className="grid grid-cols-2 gap-2">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDonateAmount(amt)}
                    className={cn(
                      "py-2.5 rounded-full font-bold text-xs border transition-all duration-150 ease-out active:scale-95",
                      donateAmount === amt
                        ? "bg-secondary text-on-secondary border-secondary"
                        : "bg-surface-container-low hover:bg-surface-container border-outline-variant text-on-surface-variant"
                    )}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              {/* Amount input */}
              <div className="space-y-2">
                <Label className="mb-0">Custom Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-3.5 text-outline font-bold text-sm z-10">₹</span>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={donateAmount}
                    onChange={(e) => setDonateAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="pl-7 rounded-md font-bold"
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={donating || !donateAmount} variant="coral" size="lg" className="w-full">
                {donating ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Process Donation Payout"
                )}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
