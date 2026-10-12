"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  HeartHandshake,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

type Membership = {
  orgId: string;
  orgRole: string;
  isAdmin: boolean;
  orgName?: string;
  orgType?: string;
  isVerified?: boolean;
  isActive?: boolean;
};

export default function MyCollectivesPage() {
  const router = useRouter();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingOrgId, setOpeningOrgId] = useState<string | null>(null);

  const loadMemberships = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getMyOrgMemberships();
      setMemberships((result.memberships ?? []).filter((membership) => membership.isActive !== false));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load your collectives. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMemberships();
  }, [loadMemberships]);

  const openCollective = (membership: Membership) => {
    setOpeningOrgId(membership.orgId);
    api.setActiveOrgId(membership.orgId);
    router.push("/org/dashboard");
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Citizen Dashboard
      </Link>

      <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
        <div className="bg-primary px-5 py-7 text-white sm:px-8 sm:py-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-white/15 p-3">
                <HeartHandshake className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Your workspaces</p>
                <h1 className="mt-1 text-2xl font-black sm:text-3xl">My Collectives</h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/80">
                  Open a group to coordinate local animal welfare, or start a new Rescue Collective for your neighbourhood.
                </p>
              </div>
            </div>
            <Link href="/community/rescue-collective/create" className="shrink-0">
              <Button variant="secondary" className="w-full sm:w-auto">
                <Plus className="h-4 w-4" /> Create a Collective
              </Button>
            </Link>
          </div>
        </div>

        <div className="p-4 sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-on-surface">Groups you belong to</h2>
              <p className="mt-1 text-sm text-on-surface-variant">Your role and access are managed separately for each group.</p>
            </div>
            {!loading && (
              <button type="button" onClick={() => void loadMemberships()} className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5" aria-label="Refresh collectives">
                <RefreshCw className="h-4 w-4" /> <span className="hidden sm:inline">Refresh</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-sm text-on-surface-variant">
              <Spinner />
              <p>Loading your collectives…</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-error/30 bg-error/5 p-5">
              <div className="flex items-start gap-3">
                <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-error" />
                <div className="flex-1">
                  <h3 className="font-bold text-on-surface">We couldn’t load your collectives</h3>
                  <p className="mt-1 text-sm text-on-surface-variant">{error}</p>
                  <Button className="mt-4" variant="secondary" onClick={() => void loadMemberships()}>
                    <RefreshCw className="h-4 w-4" /> Try again
                  </Button>
                </div>
              </div>
            </div>
          ) : memberships.length === 0 ? (
            <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-6 text-center sm:p-10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Users className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-on-surface">You haven’t joined a collective yet</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-on-surface-variant">
                Rescue Collectives help local rescuers share animal records, tasks, events and volunteer coordination. You can start one as a citizen; a registered NGO is not required.
              </p>
              <Link href="/community/rescue-collective/create" className="mt-5 inline-flex">
                <Button variant="primary"><Plus className="h-4 w-4" /> Start a Rescue Collective</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {memberships.map((membership) => (
                <Card key={membership.orgId} className="p-4 transition-colors hover:border-primary/50 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-bold text-on-surface">{membership.orgName || "Welfare Group"}</h3>
                      <p className="mt-1 text-xs capitalize text-on-surface-variant">
                        {(membership.orgType === "rescue_collective" ? "Rescue Collective" : membership.orgType === "ngo" ? "NGO" : "Welfare Group")}
                        {" · "}
                        {membership.orgRole.replaceAll("_", " ")}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant">
                          {membership.isAdmin ? <Users className="h-3 w-3" /> : <HeartHandshake className="h-3 w-3" />}
                          {membership.isAdmin ? "Admin access" : "Member access"}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${membership.isVerified ? "bg-success/10 text-success" : "bg-surface-container text-on-surface-variant"}`}>
                          <CheckCircle2 className="h-3 w-3" />
                          {membership.isVerified ? "Verified" : "Not verified"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openCollective(membership)}
                    disabled={openingOrgId !== null}
                    className="mt-5 flex w-full items-center justify-between rounded-lg border border-outline-variant px-4 py-3 text-sm font-bold text-primary transition-colors hover:border-primary hover:bg-primary/5 disabled:cursor-wait disabled:opacity-60"
                  >
                    <span>{openingOrgId === membership.orgId ? "Opening workspace…" : "Open workspace"}</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-xl border border-outline-variant bg-surface-container-low p-4">
        <HeartHandshake className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-bold text-on-surface">One account, separate group workspaces</p>
          <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
            Your citizen tools remain available outside a collective. Inside a workspace, the group’s members, animals, tasks, events, expenses and donation settings are kept in that group’s context.
          </p>
        </div>
      </div>
    </div>
  );
}
