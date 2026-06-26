"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Camera, MapPin, CheckCircle, RefreshCw } from "lucide-react";
import { api, Animal } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { formatDateTime } from "../../../lib/utils";

type Tab = "lost" | "found" | "report-lost" | "report-found";

export default function LostFoundPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("lost");
  const [lostAnimals, setLostAnimals] = useState<Animal[]>([]);
  const [foundAnimals, setFoundAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", species: "Dog", breed: "", color: "", description: "",
    locationText: "", latitude: null as number | null, longitude: null as number | null,
    guestContact: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [lost, found] = await Promise.all([
          api.listAnimals({ status: "lost", limit: 50 }),
          api.listAnimals({ status: "found", limit: 50 }),
        ]);
        setLostAnimals(lost);
        setFoundAnimals(found);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const detectLocation = () => {
    setDetectingLocation(true);
    navigator.geolocation?.getCurrentPosition(
      pos => { setForm(p => ({ ...p, latitude: pos.coords.latitude, longitude: pos.coords.longitude })); setDetectingLocation(false); },
      () => setDetectingLocation(false)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.latitude || !form.longitude) { setError("Please detect your location first"); return; }
    setSubmitting(true); setError(null);
    try {
      let evidenceUrls: string[] = [];
      if (file) {
        try {
          const { publicUrl } = await api.uploadMedia(file, "evidence");
          evidenceUrls = [publicUrl];
        } catch { /* ignore */ }
      }
      await api.createCase({
        caseType: "lost_pet",
        title: `${tab === "report-lost" ? "Lost" : "Found"} ${form.species}${form.name ? ` — ${form.name}` : ""}`,
        description: `${form.description}\n\nColor: ${form.color || "Not specified"}\nBreed: ${form.breed || "Not specified"}`,
        latitude: form.latitude,
        longitude: form.longitude,
        evidenceUrls,
      });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit report");
    } finally { setSubmitting(false); }
  };

  const displayList = tab === "lost" ? lostAnimals : foundAnimals;
  const filtered = displayList.filter(a =>
    !search ||
    (a.name && a.name.toLowerCase().includes(search.toLowerCase())) ||
    a.species.toLowerCase().includes(search.toLowerCase()) ||
    (a.territoryLabel && a.territoryLabel.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <Search className="w-6 h-6 text-primary" /> Lost & Found
        </h1>
        <p className="text-sm text-slate-500 mt-1">Report a missing pet or a found animal to help reunite families</p>
      </div>

      <div className="flex flex-wrap border-b border-slate-200 gap-6">
        {([["lost","Lost Animals"],["found","Found Animals"],["report-lost","Report Lost Pet"],["report-found","Report Found Animal"]] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => { setTab(t); setSuccess(false); setError(null); }}
            className={`pb-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${tab === t ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {label}
          </button>
        ))}
      </div>

      {(tab === "lost" || tab === "found") && (
        <>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search by name, species, area..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
          </div>
          {loading ? (
            <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(animal => (
                <Link key={animal.id} href={`/animals/${animal.id}`}
                  className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow block">
                  <div className="h-40 bg-slate-100 rounded-2xl mb-4 flex items-center justify-center overflow-hidden">
                    {animal.primaryPhotoUrl
                      ? <img src={animal.primaryPhotoUrl} alt={animal.name ?? "Animal"} className="w-full h-full object-cover rounded-2xl" />
                      : <Search className="w-12 h-12 text-slate-300" />}
                  </div>
                  <h3 className="font-black text-slate-800">{animal.name || "Unknown"}</h3>
                  <p className="text-xs text-slate-500 capitalize mt-0.5">{animal.species}{animal.breed ? ` · ${animal.breed}` : ""}</p>
                  {animal.territoryLabel && (
                    <p className="text-xs text-slate-400 mt-2 flex items-center gap-1"><MapPin className="w-3 h-3" />{animal.territoryLabel}</p>
                  )}
                  {animal.lastSeenText && (
                    <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded-lg line-clamp-2">{animal.lastSeenText}</p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-2">{formatDateTime(animal.createdAt)}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center text-slate-400">
              No {tab} animals found.
            </div>
          )}
        </>
      )}

      {(tab === "report-lost" || tab === "report-found") && (
        <div className="max-w-xl">
          {success ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
              <h3 className="text-xl font-black text-slate-800">Report Submitted</h3>
              <p className="text-slate-600 text-sm">Your report is now live and searchable.</p>
              <button onClick={() => { setSuccess(false); setTab(tab === "report-lost" ? "lost" : "found"); }}
                className="bg-primary text-white font-bold px-6 py-3 rounded-xl text-sm">View Listings</button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
              <h2 className="font-black text-slate-800 text-lg">
                {tab === "report-lost" ? "Report a Lost Pet" : "Report a Found Animal"}
              </h2>
              {error && <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-xl text-sm">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Species</label>
                    <select value={form.species} onChange={e => setForm(p => ({ ...p, species: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm">
                      <option>Dog</option><option>Cat</option><option>Bird</option><option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Name (if known)</label>
                    <input type="text" placeholder="e.g. Bruno" value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Breed</label>
                    <input type="text" placeholder="e.g. Labrador" value={form.breed}
                      onChange={e => setForm(p => ({ ...p, breed: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Color / Markings</label>
                    <input type="text" placeholder="e.g. Golden with collar" value={form.color}
                      onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Last known location</label>
                  <input type="text" placeholder="e.g. Near T. Nagar market" value={form.locationText}
                    onChange={e => setForm(p => ({ ...p, locationText: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
                  <textarea rows={3} required value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Distinguishing marks, collar, microchip, behaviour..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">GPS Location</label>
                  <div className="flex gap-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <input readOnly value={form.latitude?.toFixed(5) ?? ""} placeholder="Latitude"
                        className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600" />
                      <input readOnly value={form.longitude?.toFixed(5) ?? ""} placeholder="Longitude"
                        className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600" />
                    </div>
                    <button type="button" onClick={detectLocation} disabled={detectingLocation}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-1.5 shrink-0">
                      <MapPin className="w-4 h-4" />{detectingLocation ? "..." : "Detect"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Photo</label>
                  <div className="border-2 border-dashed border-slate-200 hover:border-primary rounded-2xl p-5 text-center cursor-pointer relative">
                    <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] ?? null)}
                      className="absolute inset-0 opacity-0 cursor-pointer" />
                    <Camera className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                    <p className="text-xs text-slate-500 font-semibold">{file ? file.name : "Upload a clear photo"}</p>
                  </div>
                </div>
                {!user && (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Your contact (optional)</label>
                    <input type="text" placeholder="Phone or email for reunification" value={form.guestContact}
                      onChange={e => setForm(p => ({ ...p, guestContact: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                  </div>
                )}
                <button type="submit" disabled={submitting}
                  className="w-full bg-primary hover:bg-emerald-800 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                  {submitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {submitting ? "Submitting..." : tab === "report-lost" ? "Report Lost Pet" : "Report Found Animal"}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
