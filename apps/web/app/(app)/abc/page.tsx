"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Leaf, CheckCircle, MapPin, Search } from "lucide-react";
import { api, Animal, AbcEvent } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { formatDateTime, cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { KpiStat } from "@/components/ui/KpiStat";
import { Modal } from "@/components/ui/Modal";

const EVENT_LABELS: Record<string, string> = {
  request: "ABC Requested", capture: "Captured",
  surgery: "Surgery Completed", return: "Returned to Territory",
};

const EVENT_ICON: Record<string, string> = {
  request: "📋", capture: "🔒", surgery: "✂️", return: "🏠",
};

const EVENT_DOT: Record<string, string> = {
  request: "bg-surface-container-high text-on-surface-variant",
  capture: "bg-secondary-container text-on-secondary-container",
  surgery: "bg-sky-100 text-sky-700",
  return: "bg-primary-container text-on-primary-container",
};

export default function AbcPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [events, setEvents] = useState<AbcEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"request" | "manage">("request");
  const [pendingAbcs, setPendingAbcs] = useState<AbcEvent[]>([]);
  const [selectedAbc, setSelectedAbc] = useState<AbcEvent | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressForm, setProgressForm] = useState<{ eventType: "capture" | "surgery" | "return"; notes: string; latitude: number | null; longitude: number | null; detecting: boolean }>({ eventType: "capture", notes: "", latitude: null, longitude: null, detecting: false });
  const [progressSubmitting, setProgressSubmitting] = useState(false);

  const isStaff = ["admin", "govt", "ngo", "hospital"].includes(user?.role || "");

  useEffect(() => {
    Promise.all([
      api.listAnimals({ limit: 100 }).catch(() => [] as Animal[]),
      api.listAbcEvents().catch(() => [] as AbcEvent[]),
    ]).then(([a, e]) => { setAnimals(a); setEvents(e); }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === "manage" && isStaff) {
      api.listAbcEvents().then(allEvents => {
        const pending = allEvents.filter(e => e.eventType === "request" || e.eventType === "capture" || e.eventType === "surgery");
        setPendingAbcs(pending);
      }).catch(() => setPendingAbcs([]));
    }
  }, [activeTab, isStaff]);

  const loadPendingAbcs = async () => {
    const allEvents = await api.listAbcEvents();
    const pending = allEvents.filter(e => ["request", "capture", "surgery"].includes(e.eventType));
    setPendingAbcs(pending);
  };

  const handleProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAbc || !progressForm.eventType) return;
    setProgressSubmitting(true);
    try {
      await api.logAbcEvent({
        animalId: selectedAbc.animalId,
        eventType: progressForm.eventType,
        notes: progressForm.notes || undefined,
        latitude: progressForm.latitude ?? undefined,
        longitude: progressForm.longitude ?? undefined,
      });
      setShowProgressModal(false);
      setSelectedAbc(null);
      setProgressForm({ eventType: "capture", notes: "", latitude: null, longitude: null, detecting: false });
      await loadPendingAbcs();
      const updated = await api.listAbcEvents();
      setEvents(updated);
    } catch { /* ignore */ }
    finally { setProgressSubmitting(false); }
  };

  const openProgressModal = (abcEvent: AbcEvent, nextStep: "capture" | "surgery" | "return") => {
    setSelectedAbc(abcEvent);
    setProgressForm({ eventType: nextStep, notes: "", latitude: null, longitude: null, detecting: false });
    setShowProgressModal(true);
  };

  const detectLocation = () => {
    setDetectingLocation(true);
    navigator.geolocation?.getCurrentPosition(
      pos => { setLatitude(pos.coords.latitude); setLongitude(pos.coords.longitude); setDetectingLocation(false); },
      () => setDetectingLocation(false)
    );
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { router.push("/login"); return; }
    if (!selectedAnimalId) { setError("Please select an animal"); return; }
    if (!latitude || !longitude) { setError("Please detect your location"); return; }
    setSubmitting(true); setError(null);
    try {
      await api.requestAbc({ animalId: selectedAnimalId, notes, latitude, longitude });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit ABC request");
    } finally { setSubmitting(false); }
  };

  const communityAnimals = animals.filter(a =>
    a.status === "community" && !a.isSterilized &&
    (!search ||
      (a.name && a.name.toLowerCase().includes(search.toLowerCase())) ||
      (a.territoryLabel && a.territoryLabel.toLowerCase().includes(search.toLowerCase())))
  );

  const sterilisedCount = animals.filter(a => a.isSterilized).length;
  const pendingAbc      = events.filter(e => e.eventType === "request").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface tracking-tight flex items-center gap-2">
          <Leaf className="w-6 h-6 text-primary" /> Animal Birth Control
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Request ABC for community animals to humanely control population and reduce conflict
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 animate-stagger">
        <KpiStat label="Sterilised" value={sterilisedCount} accent="primary" />
        <KpiStat label="Pending ABC" value={pendingAbc} accent="secondary" />
        <KpiStat label="Eligible Animals" value={communityAnimals.length} accent="neutral" />
      </div>

      <Card className="p-5 bg-primary-container text-on-primary-container border-none">
        <p className="font-bold mb-2">What is ABC?</p>
        <p className="text-sm leading-relaxed">Animal Birth Control (ABC) is the humane method of controlling street dog populations through sterilisation and vaccination. Dogs are captured, sterilised at a certified clinic, ear-notched, and returned to their original territory. It is mandated by the Supreme Court of India as the only permissible method of population control.</p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request form */}
        <Card className="p-6">
          <h2 className="font-title-md text-title-md text-on-surface mb-4">Request ABC for an Animal</h2>
          {success ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="font-bold text-on-surface">ABC Request Submitted</p>
              <p className="text-sm text-on-surface-variant">The nearest ABC centre and NGO have been notified.</p>
              <Button variant="primary" onClick={() => { setSuccess(false); setSelectedAnimalId(null); setNotes(""); }}>Request Another</Button>
            </div>
          ) : (
            <>
              {!user && (
                <div className="bg-secondary-container text-on-secondary-container rounded-md p-4 text-sm font-bold mb-4">
                  Sign in to submit an ABC request. <a href="/login" className="underline">Sign in here</a>
                </div>
              )}
              {error && <div className="bg-error-container text-on-error-container p-3 rounded-md text-sm font-medium mb-4">{error}</div>}
              <form onSubmit={handleRequest} className="space-y-4">
                <div>
                  <Label>Search &amp; select animal</Label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-3.5 w-4 h-4 text-outline" />
                    <Input type="text" placeholder="Search by name or area..." value={search}
                      onChange={e => setSearch(e.target.value)} className="pl-9 rounded-md" />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1 border border-outline-variant rounded-md p-2">
                    {communityAnimals.length > 0 ? communityAnimals.slice(0, 20).map(a => (
                      <button key={a.id} type="button" onClick={() => setSelectedAnimalId(a.id)}
                        className={cn(
                          "w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors duration-150 ease-out",
                          selectedAnimalId === a.id ? "bg-primary text-on-primary" : "hover:bg-surface-container text-on-surface"
                        )}>
                        <span className="font-bold">{a.name || "Unnamed"}</span>
                        <span className="text-xs ml-2 opacity-75">{a.species}{a.territoryLabel ? ` · ${a.territoryLabel}` : ""}</span>
                      </button>
                    )) : (
                      <p className="text-xs text-outline p-3 text-center">
                        {loading ? "Loading..." : "No unsterilised community animals found"}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Notes (optional)</Label>
                  <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Location details, condition, or any relevant notes..." />
                </div>
                <div className="space-y-2">
                  <Label className="mb-0">Your Location</Label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Input type="text" placeholder="Latitude" readOnly value={latitude !== null ? latitude.toFixed(6) : ""} className="rounded-md" />
                      <Input type="text" placeholder="Longitude" readOnly value={longitude !== null ? longitude.toFixed(6) : ""} className="rounded-md" />
                    </div>
                    <Button type="button" variant="ghost" onClick={detectLocation} disabled={detectingLocation} className="bg-surface-container-high shrink-0">
                      <MapPin className="w-4 h-4" />{detectingLocation ? "Detecting..." : "Detect Location"}
                    </Button>
                  </div>
                </div>
                <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting || !user || !selectedAnimalId}>
                  {submitting ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Leaf className="w-4 h-4" />}
                  {submitting ? "Submitting..." : "Submit ABC Request"}
                </Button>
              </form>
            </>
          )}
        </Card>

        {/* Recent Events */}
        <Card className="p-6">
          <h2 className="font-title-md text-title-md text-on-surface mb-4">Recent ABC Activity</h2>
          {events.length > 0 ? (
            <div className="space-y-3">
              {events.slice(0, 15).map(ev => (
                <div key={ev.id} className="flex items-center gap-3 p-3 bg-surface-container-low rounded-md">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm", EVENT_DOT[ev.eventType] ?? EVENT_DOT.request)}>
                    {EVENT_ICON[ev.eventType] ?? "📋"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-on-surface">{EVENT_LABELS[ev.eventType] ?? ev.eventType}</p>
                    <p className="text-xs text-outline">{ev.animalName ?? "Animal"} · {formatDateTime(ev.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-outline text-sm">
              {loading ? "Loading..." : "No ABC events recorded yet."}
            </div>
          )}
        </Card>

        {isStaff && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-title-md text-title-md text-on-surface">ABC Pipeline</h2>
              <Button variant="outline" size="sm" onClick={loadPendingAbcs}>Refresh</Button>
            </div>
            {pendingAbcs.length === 0 ? (
              <p className="text-sm text-outline text-center py-8">No active ABC requests in progress.</p>
            ) : (
              <div className="space-y-3">
                {pendingAbcs.map(abc => {
                  const nextStep = abc.eventType === "request" ? "capture" : abc.eventType === "capture" ? "surgery" : "return";
                  const nextLabel = EVENT_LABELS[nextStep] ?? nextStep;
                  return (
                    <div key={abc.id} className="flex items-center gap-4 p-4 bg-surface-container-low rounded-md">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg", EVENT_DOT[abc.eventType] ?? EVENT_DOT.request)}>
                        {EVENT_ICON[abc.eventType] ?? "📋"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-on-surface">{abc.animalName ?? "Animal"}</p>
                        <p className="text-xs text-outline">
                          {EVENT_LABELS[abc.eventType]} · {formatDateTime(abc.createdAt)}
                          {abc.caseId ? ` · Case: ${abc.caseId.slice(0, 8)}...` : ""}
                        </p>
                      </div>
                      <Button variant="primary" size="sm" onClick={() => openProgressModal(abc, nextStep)}>
                        Mark {nextLabel}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}
      </div>

      <div>
        <h2 className="font-title-md text-title-md text-on-surface mb-4">Find ABC Centres</h2>
        <Link href="/partners?tab=abcCentres">
          <Button variant="primary">View ABC Centres Near You →</Button>
        </Link>
      </div>

      {/* Progress Modal */}
      <Modal open={showProgressModal} onClose={() => setShowProgressModal(false)} title={`Log ABC Event: ${selectedAbc ? EVENT_LABELS[selectedAbc.eventType] : ""}`}>
        <form onSubmit={handleProgress} className="space-y-4">
          <div>
            <Label>Next Step</Label>
            <select value={progressForm.eventType} onChange={(e) => setProgressForm({ ...progressForm, eventType: e.target.value as any })} className="w-full bg-surface-container-low border-b-2 border-outline focus:border-primary focus:ring-0 focus:outline-none px-4 py-3 rounded-t-md transition-colors font-body-md text-on-surface">
              <option value="capture">Captured</option>
              <option value="surgery">Surgery Completed</option>
              <option value="return">Returned to Territory</option>
            </select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={3} value={progressForm.notes} onChange={(e) => setProgressForm({ ...progressForm, notes: e.target.value })} placeholder="Clinic name, veterinarian, surgery details, return location..." />
          </div>
          <div>
            <Label className="mb-0">Location (optional)</Label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input type="text" placeholder="Latitude" readOnly value={progressForm.latitude?.toFixed(6) ?? ""} className="rounded-md" />
                <Input type="text" placeholder="Longitude" readOnly value={progressForm.longitude?.toFixed(6) ?? ""} className="rounded-md" />
              </div>
              <Button type="button" variant="ghost" onClick={() => {
                setProgressForm(p => ({ ...p, detecting: true }));
                navigator.geolocation?.getCurrentPosition(pos => setProgressForm(p => ({ ...p, latitude: pos.coords.latitude, longitude: pos.coords.longitude, detecting: false })), () => setProgressForm(p => ({ ...p, detecting: false })));
              }} disabled={progressForm.detecting} className="bg-surface-container-high shrink-0">
                <MapPin className="w-4 h-4" />{progressForm.detecting ? "..." : "Detect"}
              </Button>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" type="button" onClick={() => setShowProgressModal(false)} disabled={progressSubmitting}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={progressSubmitting}>{progressSubmitting ? "Saving..." : "Save Event"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
