"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Leaf, CheckCircle, MapPin, Search } from "lucide-react";
import { api, Animal, AbcEvent } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { useRouter } from "next/navigation";
import { formatDateTime } from "../../../lib/utils";

const EVENT_LABELS: Record<string, string> = {
  request: "ABC Requested", capture: "Captured",
  surgery: "Surgery Completed", return: "Returned to Territory",
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

  useEffect(() => {
    Promise.all([
      api.listAnimals({ limit: 100 }).catch(() => [] as Animal[]),
      api.listAbcEvents().catch(() => [] as AbcEvent[]),
    ]).then(([a, e]) => { setAnimals(a); setEvents(e); }).finally(() => setLoading(false));
  }, []);

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
        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <Leaf className="w-6 h-6 text-primary" /> Animal Birth Control
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Request ABC for community animals to humanely control population and reduce conflict
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { value: sterilisedCount, label: "Sterilised",       color: "text-primary" },
          { value: pendingAbc,      label: "Pending ABC",      color: "text-amber-600" },
          { value: communityAnimals.length, label: "Eligible Animals", color: "text-slate-700" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-primary-light border border-emerald-200 rounded-2xl p-5 text-sm text-emerald-800 leading-relaxed">
        <p className="font-bold mb-2">What is ABC?</p>
        <p>Animal Birth Control (ABC) is the humane method of controlling street dog populations through sterilisation and vaccination. Dogs are captured, sterilised at a certified clinic, ear-notched, and returned to their original territory. It is mandated by the Supreme Court of India as the only permissible method of population control.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request form */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <h2 className="font-black text-slate-800 text-lg mb-4">Request ABC for an Animal</h2>
          {success ? (
            <div className="text-center py-8 space-y-4">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="font-bold text-slate-800">ABC Request Submitted</p>
              <p className="text-sm text-slate-500">The nearest ABC centre and NGO have been notified.</p>
              <button onClick={() => { setSuccess(false); setSelectedAnimalId(null); setNotes(""); }}
                className="bg-primary text-white font-bold px-5 py-2.5 rounded-xl text-sm">Request Another</button>
            </div>
          ) : (
            <>
              {!user && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 font-semibold mb-4">
                  Sign in to submit an ABC request. <a href="/login" className="underline">Sign in here</a>
                </div>
              )}
              {error && <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-xl text-sm mb-4">{error}</div>}
              <form onSubmit={handleRequest} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Search & select animal</label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Search by name or area..." value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1 border border-slate-200 rounded-xl p-2">
                    {communityAnimals.length > 0 ? communityAnimals.slice(0, 20).map(a => (
                      <button key={a.id} type="button" onClick={() => setSelectedAnimalId(a.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all ${selectedAnimalId === a.id ? "bg-primary text-white" : "hover:bg-slate-50 text-slate-700"}`}>
                        <span className="font-bold">{a.name || "Unnamed"}</span>
                        <span className="text-xs ml-2 opacity-75">{a.species}{a.territoryLabel ? ` · ${a.territoryLabel}` : ""}</span>
                      </button>
                    )) : (
                      <p className="text-xs text-slate-400 p-3 text-center">
                        {loading ? "Loading..." : "No unsterilised community animals found"}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Notes (optional)</label>
                  <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Location details, condition, or any relevant notes..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Your Location</label>
                  <div className="flex gap-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <input readOnly value={latitude?.toFixed(5) ?? ""} placeholder="Latitude"
                        className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600" />
                      <input readOnly value={longitude?.toFixed(5) ?? ""} placeholder="Longitude"
                        className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600" />
                    </div>
                    <button type="button" onClick={detectLocation} disabled={detectingLocation}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-sm flex items-center gap-1 shrink-0">
                      <MapPin className="w-4 h-4" />{detectingLocation ? "..." : "Detect"}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={submitting || !user || !selectedAnimalId}
                  className="w-full bg-primary hover:bg-emerald-800 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                  {submitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Leaf className="w-4 h-4" />}
                  {submitting ? "Submitting..." : "Submit ABC Request"}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Recent Events */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <h2 className="font-black text-slate-800 text-lg mb-4">Recent ABC Activity</h2>
          {events.length > 0 ? (
            <div className="space-y-3">
              {events.slice(0, 15).map(ev => (
                <div key={ev.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm ${
                    ev.eventType === "return"  ? "bg-emerald-100 text-emerald-700" :
                    ev.eventType === "surgery" ? "bg-blue-100 text-blue-700" :
                    ev.eventType === "capture" ? "bg-amber-100 text-amber-700" :
                    "bg-slate-100 text-slate-600"}`}>
                    {ev.eventType === "request" ? "📋" : ev.eventType === "capture" ? "🔒" : ev.eventType === "surgery" ? "✂️" : "🏠"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{EVENT_LABELS[ev.eventType] ?? ev.eventType}</p>
                    <p className="text-xs text-slate-400">{ev.animalName ?? "Animal"} · {formatDateTime(ev.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-sm">
              {loading ? "Loading..." : "No ABC events recorded yet."}
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="font-black text-slate-800 text-lg mb-4">Find ABC Centres</h2>
        <Link href="/partners?tab=abcCentres"
          className="inline-flex items-center gap-2 bg-primary hover:bg-emerald-800 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
          View ABC Centres Near You →
        </Link>
      </div>
    </div>
  );
}
