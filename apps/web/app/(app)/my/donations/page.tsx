"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api, WelfarePayment } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";

export default function MyDonationsPage() {
  const { user, isLoading } = useAuth();
  const [donations, setDonations] = useState<WelfarePayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const data = await api.listMyDonations();
        if (!cancelled) setDonations(data);
      } catch (err) {
        console.error("Failed to load donations", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (!isLoading) void load();
    return () => { cancelled = true; };
  }, [user, isLoading]);

  if (loading) return <PageSpinner />;

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <Card className="p-8">
          <h1 className="font-headline-lg text-on-surface">Sign in required</h1>
          <p className="text-on-surface-variant text-sm mt-2">Please sign in to view your donations.</p>
          <Link href="/auth/login"><Button variant="primary" className="mt-4">Sign In</Button></Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile sm:font-headline-lg sm:text-headline-lg text-on-surface">My Donations</h1>
        <p className="text-sm text-on-surface-variant mt-1">Track your payment claims and their verification status</p>
      </div>

      {donations.length === 0 ? (
        <Card className="p-8 text-center">
          <Heart className="w-12 h-12 text-outline mx-auto mb-3" />
          <p className="text-on-surface-variant">You haven&apos;t made any donations yet.</p>
          <Link href="/partners"><Button variant="primary" className="mt-4">Browse Welfare Groups</Button></Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {donations.map((donation) => (
            <Card key={donation.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-on-surface text-base">₹{donation.amount.toLocaleString()}</span>
                      <Badge variant={donation.status === "VERIFIED" ? "success" : donation.status === "REJECTED" ? "danger" : "warning"}>
                        {donation.status}
                      </Badge>
                  </div>
                  <p className="text-xs text-on-surface-variant">Receipt: {donation.receiptNumber}</p>
                  <p className="text-xs text-on-surface-variant">UTR: {donation.utr}</p>
                  <p className="text-xs text-on-surface-variant">Date: {donation.paymentDate}</p>
                  {donation.purpose && <p className="text-xs text-on-surface-variant">Purpose: {donation.purpose}</p>}
                  {donation.rejectionReason && <p className="text-xs text-error mt-1">Reason: {donation.rejectionReason}</p>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
