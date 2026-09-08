"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Clock, ListCollapse, Users, MapPin, Phone, Truck } from "lucide-react";
import { api, Case, NearbyResponder } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth";
import { statusToken } from "@/lib/status";

const OpenCasesMap = dynamic(() => import("@/components/cases/OpenCasesMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-surface-container rounded-xl flex items-center justify-center min-h-[400px]">
      <span className="text-on-surface-variant text-sm font-bold">Loading Map View...</span>
    </div>
  ),
});

export default function RespondersDispatch() {
  const router = useRouter();
  const { user } = useAuth();
  const [openCases, setOpenCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nearby, setNearby] = useState<NearbyResponder[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [nearbyLat, setNearbyLat] = useState<number | null>(null);
  const [nearbyLng, setNearbyLng] = useState<number | null>(null);

  const fetchOpenCases = async () => {
    try {
      const data = await api.listCases();
      // Filter open cases needing claim
      const open = data.filter((c) => c.status === "open");
      setOpenCases(open);
    } catch (err) {
      console.error("Failed to load dispatch cases", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOpenCases();
  }, []);

  const handleClaim = async (caseId: string) => {
    setClaimingId(caseId);
    setError(null);
    try {
      await api.claimCase(caseId);
      router.push(`/respond/${caseId}`);
    } catch (err: any) {
      setError(err?.message || "Failed to claim case. It might be already claimed.");
      setClaimingId(null);
      void fetchOpenCases();
    }
  };

  // Sort by priority (high first, then medium, then low)
  const sortedCases = [...openCases].sort((a, b) => {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const wA = priorityWeight[a.priority as "high" | "medium" | "low"] || 0;
    const wB = priorityWeight[b.priority as "high" | "medium" | "low"] || 0;
    return wB - wA;
  });

  const loadNearby = async (lat: number, lng: number) => {
    setLoadingNearby(true);
    try {
      const data = await api.listNearbyResponders({ latitude: lat, longitude: lng, radiusKm: 10, availableOnly: true });
      setNearby(data);
    } catch {
      setNearby([]);
    } finally {
      setLoadingNearby(false);
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNearbyLat(pos.coords.latitude);
        setNearbyLng(pos.coords.longitude);
        void loadNearby(pos.coords.latitude, pos.coords.longitude);
      },
      () => {}
    );
  };

  useEffect(() => {
    if (user?.homeLocation) {
      setNearbyLat(user.homeLocation.latitude);
      setNearbyLng(user.homeLocation.longitude);
      void loadNearby(user.homeLocation.latitude, user.homeLocation.longitude);
    }
  }, [user]);

  return (
    <div className="min-h-[calc(100vh-8rem)] sm:h-[calc(100vh-8rem)] flex flex-col gap-4 sm:gap-6">
      {/* Top Header */}
      <div className="shrink-0">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface tracking-tight">Active SOS Dispatch</h1>
        <p className="text-sm text-on-surface-variant">Claim and navigate to active animal emergencies in your area</p>
      </div>

      {error && (
        <div className="bg-error-container text-on-error-container p-4 rounded-md text-sm font-medium shrink-0">
          {error}
        </div>
      )}

      {/* Split view */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Open List */}
        <Card className="lg:col-span-5 flex flex-col min-h-0 p-6 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-4 shrink-0">
            <ListCollapse className="w-5 h-5 text-primary" />
            <h2 className="font-title-md text-title-md text-on-surface">Open Alerts ({sortedCases.length})</h2>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/50 pr-1">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <PageSpinner label="Loading open alerts..." />
              </div>
            ) : sortedCases.length > 0 ? (
              sortedCases.map((c) => (
                <div key={c.id} className="py-4 flex flex-col gap-3 group">
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge token={statusToken.casePriority(c.priority)} />
                      <span className="font-label-caps text-[10px] text-outline uppercase tracking-wider">
                        {c.caseType.replace("_", " ")}
                      </span>
                    </div>
                    <h3 className="font-bold text-on-surface mt-2 truncate group-hover:text-primary transition-colors duration-150 ease-out text-sm sm:text-base">
                      {c.title}
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-1 line-clamp-2 leading-relaxed">
                      {c.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-1.5 pt-2 border-t border-outline-variant/50">
                    <span className="text-[10px] text-outline flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-outline" />
                      Reported {formatDateTime(c.createdAt)}
                    </span>
                    <Button
                      size="sm"
                      variant="coral"
                      onClick={() => void handleClaim(c.id)}
                      disabled={claimingId !== null}
                    >
                      {claimingId === c.id ? "Claiming..." : "Claim & Respond"}
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-outline py-20 text-sm">No open emergency alerts found.</div>
            )}
          </div>
        </Card>

        {/* Right: Map */}
        <Card className="lg:col-span-7 h-full min-h-[400px] p-2 overflow-hidden relative">
          <OpenCasesMap cases={sortedCases.filter((c) => !!c.location).map((c) => ({ id: c.id, title: c.title, location: c.location!, locationText: c.locationText ?? undefined, priority: c.priority })) as any} />
        </Card>
      </div>

      {/* Nearby Responders */}
      <Card className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="font-title-md text-title-md text-on-surface">Nearby Responders ({nearby.length})</h2>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={detectLocation} className="bg-surface-container-high">
              <MapPin className="w-4 h-4" /> {nearbyLat ? "Refresh" : "Detect My Location"}
            </Button>
          </div>
        </div>

        {!nearbyLat ? (
          <div className="text-sm text-on-surface-variant">Detect your location to see nearby available responders and volunteers.</div>
        ) : loadingNearby ? (
          <div className="flex justify-center py-10"><PageSpinner label="Finding nearby responders..." /></div>
        ) : nearby.length === 0 ? (
          <EmptyState icon={Users} title="No nearby responders" description="No available responders found within 10 km. Try expanding your search or check back later." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {nearby.map((r) => (
              <Card key={r.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-on-surface text-sm">{r.fullName ?? "Volunteer"}</p>
                    <p className="text-xs text-on-surface-variant capitalize">{r.role}</p>
                  </div>
                  <Badge variant={r.isAvailable ? "success" : "neutral"} className="capitalize">{r.isAvailable ? "Available" : "Away"}</Badge>
                </div>
                <div className="space-y-1 text-xs text-on-surface-variant">
                  <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {r.distanceKm} km away</div>
                  {r.vehicleType && <div>Vehicle: {r.vehicleType.replace("_", " ")}{r.vehicleCapacity ? ` • ${r.vehicleCapacity} spots` : ""}</div>}
                  <div>Reputation: {r.reputationScore}</div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Available Transport */}
      <AvailableTransportSection />
    </div>
  );
}

function AvailableTransportSection() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.listOpenTransportRequests();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  return (
    <Card className="p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-title-md text-title-md text-on-surface flex items-center gap-2">
          <Truck className="w-5 h-5 text-secondary" /> Available Transport Requests ({items.length})
        </h2>
        <Button variant="ghost" size="sm" onClick={load} className="bg-surface-container-high">Refresh</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><PageSpinner label="Loading transport requests..." /></div>
      ) : items.length === 0 ? (
        <EmptyState icon={Truck} title="No open transport requests" description="Check back later or create a new transport request." />
      ) : (
        <div className="space-y-3">
          {items.map((t) => (
            <div key={t.id} className="p-4 rounded-xl border border-outline-variant bg-surface-container-low space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-on-surface text-sm">Case {t.caseId?.slice(0, 8)}</span>
                <Badge variant="warning" className="capitalize">{t.vehicleTypeRequired}</Badge>
              </div>
              <p className="text-xs text-on-surface-variant">Condition: {t.patientCondition}</p>
              <p className="text-[10px] text-outline">Requested {new Date(t.createdAt).toLocaleString("en-IN")}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
