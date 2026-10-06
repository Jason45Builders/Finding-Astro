"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";

type Membership = { orgId: string; orgRole: string; isAdmin: boolean; orgName?: string; orgType?: string; isVerified?: boolean; isActive?: boolean };

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [membershipLoading, setMembershipLoading] = useState(true);
  const [orgError, setOrgError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`); return; }
    let cancelled = false;
    const loadMemberships = async () => {
      try {
        const result = await api.getMyOrgMemberships();
        if (cancelled) return;
        const active = result.memberships.filter((membership) => membership.isActive !== false);
        setMemberships(active);
        const current = api.getActiveOrgId();
        if (current && active.some((membership) => membership.orgId === current)) return;
        if (active.length === 1) { api.setActiveOrgId(active[0].orgId); return; }
        api.setActiveOrgId(null);
      } catch (error) {
        if (!cancelled) setOrgError(error instanceof Error ? error.message : "Unable to load organizations");
      } finally { if (!cancelled) setMembershipLoading(false); }
    };
    void loadMemberships();
    return () => { cancelled = true; };
  }, [user, isLoading, router, pathname]);

  if (isLoading || membershipLoading) return <div className="min-h-screen bg-background flex items-center justify-center">Loading organization workspace...</div>;
  if (!user) return null;

  const activeOrgId = api.getActiveOrgId();
  const activeMembership = memberships.find((membership) => membership.orgId === activeOrgId);

  if (!activeMembership) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-2xl border border-outline-variant bg-surface-container-low p-6 space-y-4">
          <div>
            <h1 className="text-xl font-bold text-on-surface">Your Welfare Groups</h1>
            <p className="text-sm text-on-surface-variant mt-1">Select a group to open its workspace, or create a local rescue collective.</p>
          </div>
          {orgError && <p className="text-sm text-error">{orgError}</p>}
          {memberships.length === 0 && <p className="text-sm text-on-surface-variant">You do not belong to an active welfare group yet.</p>}
          {memberships.length > 0 && <div className="space-y-2">{memberships.map((membership) => (
            <button key={membership.orgId} type="button" className="w-full rounded-xl border border-outline-variant p-4 text-left hover:bg-surface-container-high transition-colors" onClick={() => { api.setActiveOrgId(membership.orgId); window.location.reload(); }}>
              <div className="font-bold text-on-surface">{membership.orgName ?? "Welfare Group"}</div>
              <div className="text-xs text-on-surface-variant mt-1">{membership.orgType === "rescue_collective" ? "Rescue Collective" : "NGO"} · {membership.orgRole.replaceAll("_", " ")}{membership.isVerified ? " · Verified" : " · Unverified"}</div>
            </button>
          ))}</div>}
          <Link href="/org/create"><Button variant="primary" className="w-full">Create a Rescue Collective</Button></Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
