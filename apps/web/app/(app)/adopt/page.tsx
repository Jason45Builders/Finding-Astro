"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Heart, Search, Filter, CheckCircle, ChevronRight, MapPin, Calendar, Star } from "lucide-react";
import { api, AdoptableAnimal, AdoptionApplication } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { formatDateTime } from "../../../lib/utils";

const STATUS_COLORS: Record<string, string> = {
  community: "bg-emerald-100 text-emerald-800 border-emerald-200",
  found:     "bg-blue-100 text-blue-800 border-blue-200",
  lost:      "bg-red-100 text-red-800 border-red-200",
  adopted:   "bg-purple-100 text-purple-800 border-purple-200",
};

type AdoptTab = "browse" | "my-applications";

function AdoptPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdoptTab>("browse");
  const [animals, setAnimals] = useState<AdoptableAnimal[]>([]);
  const [applications, setApplications] = useState<AdoptionApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState("all");
  const [selectedAnimal, setSelectedAnimal] = useState<AdoptableAnimal | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: user?.fullName ?? "",
    phone: "",
    address: "",
    livingSituation: "apartment",
    hasOtherPets: false,
    otherPetsDesc: "",
    priorExperience: "none",
    hoursAlonePerDay: 8,
    reasonForAdopting: "",
  });

  useEffect(() => {
    const tab = searchParams?.get("tab") as AdoptTab | null;
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.listAdoptableAnimals();
        setAnimals(data);
      } catch {
        try {
          const all = await api.listAnimals({ limit: 100 });
          setAnimals(all.filter(a => a.status === "found" || a.status === "community") as AdoptableAnimal[]);
        } catch { /* ignore */ }
      } finally { setLoading(false); }
    };
    load();
  }, []);

  useEffect(() => {
    if (activeTab === "my-applications" && user) {
      api.listMyAdoptionApplications().then(setApplications).catch(() => setApplications([]));
    }
  }, [activeTab, user]);

  const filtered = animals.filter(a => {
    const matchSearch = !search ||
      (a.name && a.name.toLowerCase().includes(search.toLowerCase())) ||
      a.species.toLowerCase().includes(search.toLowerCase()) ||
      (a.breed && a.breed.toLowerCase().includes(search.toLowerCase())) ||
      (a.territoryLabel && a.territoryLabel.toLowerCase().includes(search.toLowerCase()));
    const matchSpecies = speciesFilter === "all" || a.species.toLowerCase() === speciesFilter;
    return matchSearch && matchSpecies && a.status !== "adopted";
  });

  const handleApply = (animal: AdoptableAnimal) => {
    if (!user) { router.push("/login"); return; }
    setSelectedAnimal(animal);
    setShowForm(true);
    setSubmitSuccess(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnimal || !user) return;
    setSubmitting(true); setError(null);
    try {
      await api.applyForAdoption({ ...form, animalId: selectedAnimal.id });
      setSubmitSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit application");
    } finally { setSubmitting(false); }
  };

  const appStatusColor = (s: string) => {
    const map: Record<string, string> = {
      pending_review: "bg-amber-100 text-amber-800",
      approved: "bg-emerald-100 text-emerald-800",
      trial: "bg-blue-100 text-blue-800",
      adopted: "bg-purple-100 text-purple-800",
      rejected: "bg-red-100 text-red-800",
      returned: "bg-slate-100 text-slate-700",
    };
    return map[s] ?? "bg-slate-100 text-slate-700";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <Heart className="w-6 h-6 text-accent" /> Adoption Centre
        </h1>
        <p className="text-sm text-slate-500 mt-1">Give a community animal a permanent home</p>
      </div>

      <div className="flex border-b border-slate-200 gap-6">
        {(["browse", "my-applications"] as AdoptTab[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-bold border-b-2 transition-all capitalize ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {tab === "browse" ? "Browse Animals" : "My Applications"}
          </button>
        ))}
      </div>

      {activeTab === "browse" && (
        <>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search by name, breed, area..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
            </div>
            <select value={speciesFilter} onChange={e => setSpeciesFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm">
              <option value="all">All Species</option>
              <option value="dog">Dogs</option>
              <option value="cat">Cats</option>
              <option value="bird">Birds</option>
              <option value="other">Other</option>
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(animal => (
                <div key={animal.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="h-48 bg-slate-100 relative flex items-center justify-center">
                    {animal.primaryPhotoUrl
                      ? <img src={animal.primaryPhotoUrl} alt={animal.name ?? "Animal"} className="w-full h-full object-cover" />
                      : <Heart className="w-16 h-16 text-slate-300" />}
                    <span className={`absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${STATUS_COLORS[animal.status] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                      {animal.status}
                    </span>
                    {animal.isSterilized && (
                      <span className="absolute top-3 right-3 bg-primary text-white text-[9px] font-bold px-2 py-0.5 rounded-full">Sterilized</span>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-black text-slate-800 text-lg">{animal.name || "Unnamed"}</h3>
                    <p className="text-sm text-slate-500 capitalize mt-0.5">{animal.species}{animal.breed ? ` · ${animal.breed}` : ""}</p>
                    {animal.territoryLabel && (
                      <p className="text-xs text-slate-400 mt-2 flex items-center gap-1"><MapPin className="w-3 h-3" />{animal.territoryLabel}</p>
                    )}
                    {animal.description && (
                      <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed">{animal.description}</p>
                    )}
                    <div className="mt-4 flex gap-2">
                      <Link href={`/animals/${animal.id}`}
                        className="flex-1 text-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-xs transition-colors">
                        View Profile
                      </Link>
                      <button onClick={() => handleApply(animal)}
                        className="flex-1 bg-primary hover:bg-emerald-800 text-white font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1">
                        <Heart className="w-3.5 h-3.5" /> Apply
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center text-slate-400">
              No adoptable animals found matching your criteria.
            </div>
          )}
        </>
      )}

      {activeTab === "my-applications" && (
        <>
          {!user ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
              <Heart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-semibold mb-4">Sign in to view your adoption applications</p>
              <Link href="/login" className="bg-primary text-white font-bold px-6 py-3 rounded-xl text-sm">Sign In</Link>
            </div>
          ) : applications.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
              You have not submitted any adoption applications yet.
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map(app => (
                <div key={app.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold text-slate-800">Adoption Application</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{app.animalId}</p>
                      <p className="text-xs text-slate-400 mt-1">Submitted {formatDateTime(app.createdAt)}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${appStatusColor(app.status)}`}>
                      {app.status.replace("_", " ")}
                    </span>
                  </div>
                  {app.status === "approved" && !app.agreementAcceptedAt && (
                    <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                      <p className="text-sm font-semibold text-emerald-800">Your application is approved! Confirm to proceed.</p>
                      <button onClick={() => api.confirmAdoption(app.id).then(() => api.listMyAdoptionApplications().then(setApplications))}
                        className="mt-2 bg-primary text-white font-bold px-4 py-2 rounded-lg text-sm">Confirm Adoption</button>
                    </div>
                  )}
                  {app.reviewNotes && (
                    <p className="text-xs text-slate-500 mt-3 bg-slate-50 p-3 rounded-xl">{app.reviewNotes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showForm && selectedAnimal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl my-8 p-6 space-y-5">
            {submitSuccess ? (
              <div className="text-center py-8 space-y-4">
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
                <h3 className="text-xl font-black text-slate-800">Application Submitted!</h3>
                <p className="text-slate-600 text-sm">An NGO volunteer will review your application within 2–3 days.</p>
                <button onClick={() => { setShowForm(false); setSubmitSuccess(false); }}
                  className="bg-primary text-white font-bold px-6 py-3 rounded-xl text-sm">Done</button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-slate-800 text-lg">Apply to Adopt {selectedAnimal.name || "this Animal"}</h3>
                  <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700 text-xl font-bold">✕</button>
                </div>
                {error && <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-xl text-sm">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {[
                    { label: "Full Name", field: "fullName", type: "text", placeholder: "Your full name" },
                    { label: "Phone", field: "phone", type: "tel", placeholder: "+91 98765 43210" },
                    { label: "Address", field: "address", type: "text", placeholder: "Your home address" },
                  ].map(f => (
                    <div key={f.field}>
                      <label className="block text-sm font-bold text-slate-700 mb-1">{f.label}</label>
                      <input type={f.type} placeholder={f.placeholder} required
                        value={form[f.field as keyof typeof form] as string}
                        onChange={e => setForm(p => ({ ...p, [f.field]: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Living Situation</label>
                    <select value={form.livingSituation} onChange={e => setForm(p => ({ ...p, livingSituation: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm">
                      <option value="house_with_yard">House with yard</option>
                      <option value="apartment">Apartment</option>
                      <option value="shared_accommodation">Shared accommodation</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Prior Experience</label>
                    <select value={form.priorExperience} onChange={e => setForm(p => ({ ...p, priorExperience: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm">
                      <option value="none">None</option>
                      <option value="some">Some</option>
                      <option value="experienced">Experienced</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Hours animal would be alone per day</label>
                    <input type="number" min={0} max={24} value={form.hoursAlonePerDay}
                      onChange={e => setForm(p => ({ ...p, hoursAlonePerDay: Number(e.target.value) }))}
                      className="w-32 px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="other-pets" checked={form.hasOtherPets}
                      onChange={e => setForm(p => ({ ...p, hasOtherPets: e.target.checked }))} className="w-4 h-4 rounded accent-primary" />
                    <label htmlFor="other-pets" className="text-sm font-semibold text-slate-700">I have other pets</label>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Why do you want to adopt?</label>
                    <textarea rows={3} required value={form.reasonForAdopting}
                      onChange={e => setForm(p => ({ ...p, reasonForAdopting: e.target.value }))}
                      placeholder="Tell us why you would like to give this animal a home..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                  </div>
                  <button type="submit" disabled={submitting}
                    className="w-full bg-primary hover:bg-emerald-800 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                    {submitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Heart className="w-4 h-4" />}
                    {submitting ? "Submitting..." : "Submit Application"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdoptPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
      <AdoptPageInner />
    </Suspense>
  );
}
