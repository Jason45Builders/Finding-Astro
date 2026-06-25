"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChevronLeft,
  Heart,
  Calendar,
  Building,
  CheckCircle,
  TrendingUp,
  DollarSign,
  AlertCircle
} from "lucide-react";
import { api, FundingCase } from "../../../../lib/api";

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
    return (
      <div className="flex justify-center items-center py-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !funding) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800">{error || "Funding Error"}</h2>
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
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-850">
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Funding Details */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-primary mb-3">
              Medical Fundraiser
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight leading-tight">
              Animal Care & Treatment Payout
            </h1>
            <p className="text-slate-500 text-sm mt-1">Supporting street animal recovery under veterinary hospital care</p>
          </div>

          {/* Hospital Information */}
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <Building className="w-5 h-5 text-primary" />
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Hospital Partner</p>
              <p className="text-sm font-bold text-slate-700">{funding.hospitalName || "Partner Vet Clinic, Chennai"}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm font-semibold">
              <span className="text-slate-500">Raised: ₹{funding.raisedAmount}</span>
              <span className="text-slate-800">Goal: ₹{funding.totalAmount}</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>{progressPercent}% raised</span>
              <span>₹{funding.totalAmount - funding.raisedAmount} remaining</span>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Information */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800 text-sm">About this campaign</h3>
            <p className="text-slate-650 text-sm leading-relaxed">
              Every donation goes directly to paying for the veterinary hospital treatments logged under the animal's case file. Payout releases are verified by government and platform administrators.
            </p>
          </div>
        </div>

        {/* Right: Donation form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-1.5">
              <Heart className="w-5 h-5 text-accent fill-accent" /> Send Donation Support
            </h3>

            {success && (
              <div className="bg-emerald-50 text-emerald-800 border border-emerald-250 p-4 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                Thank you! Your donation was logged successfully.
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-650 border border-red-155 p-4 rounded-xl text-xs font-semibold">
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
                    className="py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs text-slate-650 transition-colors"
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              {/* Amount input */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Custom Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-3.5 text-slate-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    placeholder="Enter amount"
                    value={donateAmount}
                    onChange={(e) => setDonateAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full pl-7 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm font-bold text-slate-700"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={donating || !donateAmount}
                className="w-full bg-accent hover:bg-orange-600 text-white font-extrabold py-3.5 px-4 rounded-xl text-sm transition-colors shadow-md shadow-orange-500/10 flex items-center justify-center gap-1.5"
              >
                {donating ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  "Process Donation Payout"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
