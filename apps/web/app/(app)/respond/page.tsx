"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Activity, AlertTriangle, ArrowDownUp, Clock, Crosshair, Filter,
  ListFilter, MapPin, MapPinned, RefreshCw, Search, ShieldAlert,
  Truck, Users, X,
} from "lucide-react";
import { api, Case, NearbyResponder } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { statusToken } from "@/lib/status";

const OpenCasesMap = dynamic(() => import("@/components/cases/OpenCasesMap"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[320px] h-full items-center justify-center rounded-xl bg-surface-container text-sm font-semibold text-on-surface-variant">
      Loading emergency map…
    </div>
  ),
});

type PriorityFilter = "all" | "high" | "medium" | "low";
type SortMode = "priority" | "newest" | "oldest";

const PRIORITY_WEIGHT: Record<string, number> = { high: 3, medium: 2, low: 1 };

export default function RespondersDispatch() {
  const router = useRouter();
  const [openCases, setOpenCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("priority");
  const [nearby, setNearby] = useState<NearbyResponder[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [nearbyLat, setNearbyLat] = useState<number | null>(null);
  const [nearbyLng, setNearbyLng] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [transportItems, setTransportItems] = useState<any[]>([]);
  const [loadingTransport, setLoadingTransport] = useState(false);

  const fetchOpenCases = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await api.listCases();
      setOpenCases(data.filter((c) => c.status === "open"));
    } catch (err: any) {
      setError(err?.message || "Emergency alerts could not be loaded. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchTransport = useCallback(async () => {
    setLoadingTransport(true);
    try {
      const data = await api.listOpenTransportRequests();
      setTransportItems(Array.isArray(data) ? data : []);
    } catch {
      setTransportItems([]);
    } finally {
      setLoadingTransport(false);
    }
  }, []);

  useEffect(() => {
    void fetchOpenCases();
    void fetchTransport();
  }, [fetchOpenCases, fetchTransport]);

  const loadNearby = useCallback(async (lat: number, lng: number) => {
    setLoadingNearby(true);
    setLocationError(null);
    try {
      const data = await api.listNearbyResponders({
        latitude: lat, longitude: lng, radiusKm: 10, availableOnly: true,
      });
      setNearby(data);
    } catch {
      setNearby([]);
      setLocationError("Nearby responders could not be loaded. Please try again.");
    } finally {
      setLoadingNearby(false);
    }
  }, []);

  useEffect(() => {
    // Use the saved home location only as a starting point; users can request
    // a fresh device location at any time.
    // Location permission is never requested automatically.
  }, []);

  const detectLocation = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Location detection is not supported by this browser.");
      return;
    }
    setLoadingNearby(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNearbyLat(pos.coords.latitude);
        setNearbyLng(pos.coords.longitude);
        void loadNearby(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setLoadingNearby(false);
        setLocationError("Location access was unavailable. Allow location permission and try again.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const filteredCases = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const result = openCases.filter((c) => {
      const matchesPriority = priorityFilter === "all" || c.priority === priorityFilter;
      const searchable = [c.title, c.description, c.caseType, c.locationText]
        .filter(Boolean).join(" ").toLowerCase();
      return matchesPriority && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
    return result.sort((a, b) => {
      if (sortMode === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortMode === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      const priorityDifference = (PRIORITY_WEIGHT[b.priority] || 0) - (PRIORITY_WEIGHT[a.priority] || 0);
      return priorityDifference || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [openCases, query, priorityFilter, sortMode]);

  const highPriorityCount = openCases.filter((c) => c.priority === "high").length;
  const mappedCount = openCases.filter((c) => Boolean(c.location)).length;

  const handleClaim = async (caseId: string) => {
    setClaimingId(caseId);
    setError(null);
    try {
      await api.claimCase(caseId);
      router.push(`/respond/${caseId}`);
    } catch (err: any) {
      setError(err?.message || "This alert may already be claimed. Refresh the list and try another.");
      setClaimingId(null);
      void fetchOpenCases(true);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 sm:space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-error/20 bg-error-container/60 px-3 py-1 text-xs font-bold text-on-error-container">
            <span className="h-2 w-2 animate-pulse rounded-full bg-error" />
            Live response board
          </div>
          <h1 className="text-2xl font-black tracking-tight text-on-surface sm:text-3xl">SOS & Emergency Cases</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
            Review unclaimed animal emergencies, prioritize urgent cases, and claim a response with one action.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={() => void fetchOpenCases(true)} disabled={refreshing || loading} className="bg-surface-container-high">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing…" : "Refresh alerts"}
          </Button>
          <Button variant="coral" onClick={() => router.push("/cases/new")}>
            <AlertTriangle className="h-4 w-4" /> Report an emergency
          </Button>
        </div>
      </header>

      {error && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-error/25 bg-error-container/70 p-4 text-sm text-on-error-container sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-start gap-2"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</span>
          <Button variant="ghost" size="sm" onClick={() => void fetchOpenCases(true)}>Try again</Button>
        </div>
      )}

      <section aria-label="Emergency overview" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-3 p-4 sm:p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-container-high text-primary"><Activity className="h-5 w-5" /></div>
          <div><p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Unclaimed alerts</p><p className="mt-0.5 text-2xl font-black tabular-nums text-on-surface">{loading ? "—" : openCases.length}</p></div>
        </Card>
        <Card className="flex items-center gap-3 p-4 sm:p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-error-container text-on-error-container"><AlertTriangle className="h-5 w-5" /></div>
          <div><p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">High priority</p><p className="mt-0.5 text-2xl font-black tabular-nums text-on-surface">{loading ? "—" : highPriorityCount}</p></div>
        </Card>
        <Card className="flex items-center gap-3 p-4 sm:p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary-container"><MapPinned className="h-5 w-5" /></div>
          <div><p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Alerts with map pins</p><p className="mt-0.5 text-2xl font-black tabular-nums text-on-surface">{loading ? "—" : mappedCount}</p></div>
        </Card>
      </section>

      <section className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-12">
        <Card className="min-w-0 overflow-hidden xl:col-span-5">
          <div className="border-b border-outline-variant p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-extrabold text-on-surface"><ListFilter className="h-5 w-5 text-primary" /> Unclaimed alerts</h2>
                <p className="mt-1 text-xs text-on-surface-variant">Sorted by urgency by default</p>
              </div>
              <Badge variant={openCases.length ? "warning" : "neutral"}>{filteredCases.length} shown</Badge>
            </div>

            <label className="mt-4 flex items-center gap-2 rounded-xl border border-outline-variant bg-surface px-3 py-2.5 focus-within:border-primary">
              <Search className="h-4 w-4 shrink-0 text-outline" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, case type, description or location"
                aria-label="Search emergency alerts"
                className="min-w-0 flex-1 bg-transparent text-sm text-on-surface outline-none placeholder:text-outline"
              />
              {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="rounded-md p-1 text-outline hover:bg-surface-container"><X className="h-4 w-4" /></button>}
            </label>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <div className="flex min-w-0 flex-1 flex-wrap gap-1.5" aria-label="Filter by priority">
                {(["all", "high", "medium", "low"] as PriorityFilter[]).map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    aria-pressed={priorityFilter === priority}
                    onClick={() => setPriorityFilter(priority)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold capitalize transition-colors ${priorityFilter === priority ? "border-primary bg-primary-container text-on-primary-container" : "border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container"}`}
                  >
                    {priority === "all" ? "All priorities" : priority}
                  </button>
                ))}
              </div>
              <label className="flex shrink-0 items-center gap-2 rounded-lg border border-outline-variant px-2.5 py-1.5 text-xs font-semibold text-on-surface-variant">
                <ArrowDownUp className="h-3.5 w-3.5" />
                <select aria-label="Sort emergency alerts" value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} className="max-w-[130px] bg-transparent text-xs outline-none">
                  <option value="priority">Urgency first</option>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </label>
            </div>
          </div>

          <div className="max-h-[760px] overflow-y-auto p-3 sm:p-4">
            {loading ? (
              <div className="flex min-h-[260px] items-center justify-center"><PageSpinner label="Loading emergency alerts…" /></div>
            ) : filteredCases.length ? (
              <div className="space-y-3">
                {filteredCases.map((c) => (
                  <article key={c.id} className="rounded-xl border border-outline-variant bg-surface p-4 transition-colors hover:border-primary/40">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <StatusBadge token={statusToken.casePriority(c.priority)} />
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant">{c.caseType.replace(/_/g, " ")}</span>
                    </div>
                    <h3 className="mt-3 break-words text-sm font-extrabold leading-snug text-on-surface sm:text-base">{c.title}</h3>
                    <p className="mt-1.5 line-clamp-3 break-words text-xs leading-relaxed text-on-surface-variant">{c.description}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-on-surface-variant">
                      <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDateTime(c.createdAt)}</span>
                      {c.locationText && <span className="inline-flex min-w-0 items-center gap-1"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="break-words">{c.locationText}</span></span>}
                      {!c.location && <span className="font-semibold text-outline">No map pin</span>}
                    </div>
                    <div className="mt-4 flex flex-col gap-2 border-t border-outline-variant pt-3 sm:flex-row sm:items-center sm:justify-between">
                      <Button variant="ghost" size="sm" className="justify-center bg-surface-container-high" onClick={() => router.push(`/cases/${c.id}`)}>View case details</Button>
                      <Button variant="coral" size="sm" onClick={() => void handleClaim(c.id)} disabled={claimingId !== null}>
                        {claimingId === c.id ? "Claiming alert…" : "Claim & respond"}
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="py-10">
                <EmptyState
                  icon={query || priorityFilter !== "all" ? Filter : Activity}
                  title={openCases.length ? "No alerts match these filters" : "No unclaimed emergencies"}
                  description={openCases.length ? "Try another search term or clear the priority filter." : "There are no open alerts right now. Refresh this board to check for new cases."}
                />
                {(query || priorityFilter !== "all") && <div className="mt-3 flex justify-center"><Button variant="ghost" size="sm" onClick={() => { setQuery(""); setPriorityFilter("all"); }}>Clear filters</Button></div>}
              </div>
            )}
          </div>
        </Card>

        <div className="min-w-0 space-y-3 xl:col-span-7 xl:sticky xl:top-20">
          <Card className="overflow-hidden p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
              <div>
                <h2 className="flex items-center gap-2 text-base font-extrabold text-on-surface"><MapPinned className="h-5 w-5 text-primary" /> Emergency map</h2>
                <p className="mt-1 text-xs text-on-surface-variant">Cases with coordinates appear as map pins</p>
              </div>
              <Badge variant="neutral">{filteredCases.filter((c) => Boolean(c.location)).length} mapped</Badge>
            </div>
            <div className="h-[340px] overflow-hidden rounded-xl sm:h-[440px] xl:h-[min(62vh,680px)]">
              <OpenCasesMap cases={filteredCases.filter((c) => !!c.location).map((c) => ({ id: c.id, title: c.title, location: c.location!, locationText: c.locationText ?? undefined, priority: c.priority })) as any} />
            </div>
            <p className="px-1 pt-3 text-xs leading-relaxed text-on-surface-variant">
              Map pins follow the current search and priority filters. Confirm the incident details before travelling.
            </p>
          </Card>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-low p-3 text-xs text-on-surface-variant">
            <Crosshair className="h-4 w-4 shrink-0 text-primary" />
            <span className="flex-1">Need nearby support? Detect your location to find available responders within 10 km.</span>
            <Button size="sm" variant="ghost" className="bg-surface-container-high" onClick={detectLocation} disabled={loadingNearby}>
              <MapPin className="h-3.5 w-3.5" />{loadingNearby ? "Locating…" : nearbyLat !== null ? "Refresh location" : "Find nearby"}
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="min-w-0 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-base font-extrabold text-on-surface"><Users className="h-5 w-5 text-primary" /> Nearby responders</h2>
              <p className="mt-1 text-xs text-on-surface-variant">{nearbyLat !== null ? "Available responders within 10 km" : "Location is only used when you request nearby results"}</p>
            </div>
            {nearbyLat !== null && <Badge variant="neutral">{nearby.length} found</Badge>}
          </div>
          {locationError && <p role="status" className="mt-3 rounded-lg bg-error-container/60 p-3 text-xs text-on-error-container">{locationError}</p>}
          {nearbyLat === null ? (
            <div className="mt-4 rounded-xl bg-surface-container-low p-4 text-sm text-on-surface-variant">Select <strong>Find nearby</strong> above to use your current location.</div>
          ) : loadingNearby ? (
            <div className="flex justify-center py-8"><PageSpinner label="Finding available responders…" /></div>
          ) : nearby.length === 0 ? (
            <div className="mt-4 rounded-xl bg-surface-container-low p-4 text-sm text-on-surface-variant">No available responders were found within 10 km.</div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {nearby.map((r) => (
                <div key={r.id} className="min-w-0 rounded-xl border border-outline-variant p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="break-words text-sm font-bold text-on-surface">{r.fullName ?? "Volunteer"}</p>
                    <Badge variant={r.isAvailable ? "success" : "neutral"}>{r.isAvailable ? "Available" : "Away"}</Badge>
                  </div>
                  <p className="mt-1 text-xs capitalize text-on-surface-variant">{r.role}</p>
                  <div className="mt-2 space-y-1 text-xs text-on-surface-variant">
                    <p className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{r.distanceKm} km away</p>
                    {r.vehicleType && <p className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" />{r.vehicleType.replace(/_/g, " ")}{r.vehicleCapacity ? ` · ${r.vehicleCapacity} spots` : ""}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="min-w-0 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-base font-extrabold text-on-surface"><Truck className="h-5 w-5 text-primary" /> Open transport requests</h2>
              <p className="mt-1 text-xs text-on-surface-variant">Transport support requested for active cases</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="neutral">{transportItems.length}</Badge>
              <Button size="sm" variant="ghost" className="bg-surface-container-high" onClick={() => void fetchTransport()} disabled={loadingTransport}><RefreshCw className={`h-3.5 w-3.5 ${loadingTransport ? "animate-spin" : ""}`} />Refresh</Button>
            </div>
          </div>
          {loadingTransport ? (
            <div className="flex justify-center py-8"><PageSpinner label="Loading transport requests…" /></div>
          ) : transportItems.length === 0 ? (
            <div className="mt-4 rounded-xl bg-surface-container-low p-4">
              <p className="text-sm font-semibold text-on-surface">No open transport requests</p>
              <p className="mt-1 text-xs text-on-surface-variant">When a case needs transport, the request will appear here.</p>
              <Button className="mt-3" size="sm" variant="ghost" onClick={() => router.push("/respond/transport")}>Create transport request</Button>
            </div>
          ) : (
            <div className="mt-4 max-h-[360px] space-y-2 overflow-y-auto">
              {transportItems.map((t) => (
                <div key={t.id} className="rounded-xl border border-outline-variant bg-surface p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-on-surface">Case {String(t.caseId ?? "").slice(0, 8)}</span>
                    <Badge variant="warning" className="capitalize">{String(t.vehicleTypeRequired ?? "vehicle").replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="mt-2 break-words text-xs text-on-surface-variant">Condition: {t.patientCondition || "Not provided"}</p>
                  <p className="mt-1 text-[11px] text-outline">Requested {t.createdAt ? new Date(t.createdAt).toLocaleString("en-IN") : "time unavailable"}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
