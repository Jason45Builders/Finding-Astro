"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Heart, Syringe, Leaf, FileText, MapPin, Calendar,
  AlertTriangle, ChevronLeft, CheckCircle, Clock, User
} from "lucide-react";
import { api, Animal, AnimalMedicalRecord, AnimalVaccination, Case, AbcEvent } from "../../../../lib/api";
import { useAuth } from "../../../../lib/auth";
import { formatDateTime } from "../../../../lib/utils";

const SingleAnimalMap = dynamic(() => import("../../../../components/animals/SingleAnimalMap"), { ssr: false });

type ProfileTab = "overview" | "medical" | "vaccinations" | "abc" | "cases";

const STATUS_COLORS: Record<string, string> = {
  community: "bg-emerald-100 text-emerald-800 border-emerald-200",
  lost:      "bg-red-100 text-red-800 border-red-200",
  found:     "bg-blue-100 text-blue-800 border-blue-200",
  adopted:   "bg-purple-100 text-purple-800 border-purple-200",
};

const ABC_EVENT_LABELS: Record<string, string> = {
  request: "ABC Requested", capture: "Captured",
  surgery: "Surgery Completed", return: "Returned to Territory",
};

export default function AnimalProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [medical, setMedical] = useState<AnimalMedicalRecord[]>([]);
  const [vaccinations, setVaccinations] = useState<AnimalVaccination[]>([]);
  const [abcEvents, setAbcEvents] = useState<AbcEvent[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ProfileTab>("overview");
  const [abcSubmitting, setAbcSubmitting] = useState(false);
  const [abcSuccess, setAbcSuccess] = useState(false);

  useEffect(() => {
    if (!params?.id) return;
    const load = async () => {
      setLoading(true);
      const [a, med, vac, abc, cs] = await Promise.allSettled([
        api.getAnimal(params.id),
        api.getAnimalMedicalHistory(params.id),
        api.getAnimalVaccinations(params.id),
        api.getAnimalAbcEvents(params.id),
        api.getAnimalCases(params.id),
      ]);
      if (a.status   === "fulfilled") setAnimal(a.value);
      if (med.status === "fulfilled") setMedical(med.value);
      if (vac.status === "fulfilled") setVaccinations(vac.value);
      if (abc.status === "fulfilled") setAbcEvents(abc.value);
      if (cs.status  === "fulfilled") setCases(cs.value);
      setLoading(false);
    };
    load();
  }, [params?.id]);

  const handleAbcRequest = async () => {
    if (!user) { router.push("/login"); return; }
    if (!animal) return;
    setAbcSubmitting(true);
    navigator.geolocation?.getCurrentPosition(async pos => {
      try {
        await api.requestAbc({ animalId: animal.id, latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setAbcSuccess(true);
      } catch { /* ignore */ }
      finally { setAbcSubmitting(false); }
    }, () => setAbcSubmitting(false));
  };

  if (loading) return (
    <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
  );
  if (!animal) return (
    <div className="text-center py-20">
      <p className="text-slate-500">Animal not found.</p>
      <Link href="/animals" className="text-primary font-bold mt-3 inline-block">← Back to Animals</Link>
    </div>
  );

  const TABS: { key: ProfileTab; label: string; count?: number }[] = [
    { key: "overview",     label: "Overview" },
    { key: "medical",      label: "Medical",      count: medical.length },
    { key: "vaccinations", label: "Vaccinations", count: vaccinations.length },
    { key: "abc",          label: "ABC",          count: abcEvents.length },
    { key: "cases",        label: "Cases",        count: cases.length },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/animals" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary font-semibold">
        <ChevronLeft className="w-4 h-4" /> All Animals
      </Link>

      {/* Hero */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="h-64 bg-slate-100 relative flex items-center justify-center">
          {animal.primaryPhotoUrl
            ? <img src={animal.primaryPhotoUrl} alt={animal.name ?? "Animal"} className="w-full h-full object-cover" />
            : <Heart className="w-20 h-20 text-slate-200" />}
          <span className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${STATUS_COLORS[animal.status] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
            {animal.status}
          </span>
          {animal.isSterilized && (
            <span className="absolute top-4 right-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
              <Leaf className="w-3 h-3" /> Sterilized
            </span>
          )}
        </div>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-800">{animal.name || "Unnamed Animal"}</h1>
              <p className="text-slate-500 capitalize mt-1">
                {animal.species}{animal.breed ? ` · ${animal.breed}` : ""}{animal.gender ? ` · ${animal.gender}` : ""}{animal.color ? ` · ${animal.color}` : ""}
              </p>
              {animal.territoryLabel && (
                <p className="text-sm text-slate-500 mt-2 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-400" />{animal.territoryLabel}</p>
              )}
              {animal.approxAgeMonths && (
                <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {animal.approxAgeMonths >= 12 ? `${Math.floor(animal.approxAgeMonths / 12)} yrs` : `${animal.approxAgeMonths} months`} (approx)
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {animal.status !== "adopted" && (
                <Link href={`/adopt?animalId=${animal.id}`}
                  className="bg-accent hover:bg-orange-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors">
                  <Heart className="w-4 h-4" /> Adopt
                </Link>
              )}
              {!animal.isSterilized && animal.status === "community" && (
                <button onClick={handleAbcRequest} disabled={abcSubmitting || abcSuccess}
                  className="bg-primary hover:bg-emerald-800 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors">
                  <Leaf className="w-4 h-4" />
                  {abcSuccess ? "ABC Requested ✓" : abcSubmitting ? "..." : "Request ABC"}
                </button>
              )}
              <Link href={`/cases/new?animalId=${animal.id}`}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors">
                <AlertTriangle className="w-4 h-4" /> Report Case
              </Link>
            </div>
          </div>
          {animal.description && (
            <p className="text-sm text-slate-600 mt-4 leading-relaxed bg-slate-50 p-4 rounded-2xl">{animal.description}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`pb-3 px-3 text-sm font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${tab === t.key ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-primary text-white" : "bg-slate-100 text-slate-500"}`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4">Health Status</h3>
              <div className="space-y-3">
                {[
                  { label: "Sterilized",         value: animal.isSterilized ? "Yes" : "No",             ok: animal.isSterilized },
                  { label: "Vaccination Status", value: vaccinations.length > 0 ? "Vaccinated" : "Unknown", ok: vaccinations.length > 0 },
                  { label: "Medical Records",    value: medical.length > 0 ? `${medical.length} record(s)` : "None", ok: medical.length > 0 },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <span className="text-sm text-slate-600">{row.label}</span>
                    <span className={`text-sm font-bold flex items-center gap-1 ${row.ok ? "text-emerald-700" : "text-slate-500"}`}>
                      {row.ok && <CheckCircle className="w-3.5 h-3.5" />}{row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-3">Quick Facts</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Species", animal.species],
                  ["Breed",   animal.breed ?? "Unknown"],
                  ["Gender",  animal.gender ?? "Unknown"],
                  ["Color",   animal.color ?? "Unknown"],
                  ["Added",   new Date(animal.createdAt).toLocaleDateString("en-IN")],
                  ["Cases",   cases.length.toString()],
                ].map(([k, v]) => (
                  <div key={k} className="bg-slate-50 rounded-xl px-3 py-2">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{k}</p>
                    <p className="font-bold text-slate-700 capitalize mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm h-72">
            {animal.location?.latitude && animal.location?.longitude ? (
              <SingleAnimalMap lat={animal.location.latitude} lng={animal.location.longitude} name={animal.name ?? "Animal"} status={animal.status} />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">No location data</div>
            )}
          </div>
        </div>
      )}

      {/* MEDICAL */}
      {tab === "medical" && (
        <div className="space-y-4">
          {medical.length > 0 ? medical.map(rec => (
            <div key={rec.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold uppercase tracking-wider mb-2">{rec.entryType}</span>
                  <h4 className="font-bold text-slate-800">{rec.title}</h4>
                  {rec.providerName && <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><User className="w-3 h-3" />{rec.providerName}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">{new Date(rec.treatmentDate).toLocaleDateString("en-IN")}</p>
                  {rec.costAmount && <p className="text-sm font-black text-primary mt-1">₹{rec.costAmount.toLocaleString("en-IN")}</p>}
                </div>
              </div>
              {rec.notes && <p className="text-sm text-slate-600 mt-3 leading-relaxed bg-slate-50 p-3 rounded-xl">{rec.notes}</p>}
            </div>
          )) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-3 text-slate-200" />No medical records yet.
            </div>
          )}
        </div>
      )}

      {/* VACCINATIONS */}
      {tab === "vaccinations" && (
        <div className="space-y-3">
          {vaccinations.length > 0 ? vaccinations.map(vac => (
            <div key={vac.id} className={`bg-white border rounded-2xl p-5 shadow-sm flex items-center gap-4 ${vac.status === "expired" ? "border-red-200" : "border-slate-200"}`}>
              <Syringe className={`w-8 h-8 shrink-0 ${vac.status === "verified" ? "text-emerald-500" : vac.status === "expired" ? "text-red-400" : "text-amber-400"}`} />
              <div className="flex-1">
                <h4 className="font-bold text-slate-800">{vac.vaccineName}</h4>
                <p className="text-xs text-slate-500 mt-0.5">Given: {new Date(vac.administeredAt).toLocaleDateString("en-IN")}</p>
                {vac.expiresAt && <p className="text-xs text-slate-400">Expires: {new Date(vac.expiresAt).toLocaleDateString("en-IN")}</p>}
                {vac.batchNumber && <p className="text-[10px] text-slate-400 font-mono">Batch: {vac.batchNumber}</p>}
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${vac.status === "verified" ? "bg-emerald-100 text-emerald-800" : vac.status === "expired" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                {vac.status}
              </span>
            </div>
          )) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
              <Syringe className="w-10 h-10 mx-auto mb-3 text-slate-200" />No vaccination records yet.
            </div>
          )}
        </div>
      )}

      {/* ABC */}
      {tab === "abc" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <Leaf className="w-8 h-8 text-primary shrink-0" />
            <div>
              <p className="font-bold text-slate-800">ABC Status</p>
              <p className={`text-sm mt-0.5 ${animal.isSterilized ? "text-emerald-600 font-bold" : "text-amber-600"}`}>
                {animal.isSterilized ? "✓ Sterilized" : "Not sterilized yet"}
              </p>
            </div>
            {!animal.isSterilized && !abcSuccess && (
              <button onClick={handleAbcRequest} disabled={abcSubmitting}
                className="ml-auto bg-primary hover:bg-emerald-800 text-white font-bold px-4 py-2 rounded-xl text-sm">
                {abcSubmitting ? "..." : "Request ABC"}
              </button>
            )}
            {abcSuccess && <span className="ml-auto text-emerald-600 font-bold text-sm">Requested ✓</span>}
          </div>
          {abcEvents.length > 0 ? (
            <div className="space-y-3">
              {abcEvents.map(ev => (
                <div key={ev.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                  <span className="text-2xl">{ev.eventType === "return" ? "🏠" : ev.eventType === "surgery" ? "✂️" : ev.eventType === "capture" ? "🔒" : "📋"}</span>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{ABC_EVENT_LABELS[ev.eventType] ?? ev.eventType}</p>
                    <p className="text-xs text-slate-400">{formatDateTime(ev.createdAt)}</p>
                    {ev.notes && <p className="text-xs text-slate-500 mt-1">{ev.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-400 text-sm">No ABC events recorded yet.</div>
          )}
        </div>
      )}

      {/* CASES */}
      {tab === "cases" && (
        <div className="space-y-3">
          {cases.length > 0 ? cases.map(c => (
            <Link key={c.id} href={`/cases/${c.id}`}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow block">
              <span className={`w-3 h-3 rounded-full shrink-0 ${c.status === "open" ? "bg-amber-400" : c.status === "resolved" ? "bg-emerald-400" : "bg-slate-300"}`} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm truncate">{c.title}</p>
                <p className="text-xs text-slate-400 mt-0.5 capitalize">{c.caseType.replace("_"," ")} · {c.status}</p>
              </div>
              <p className="text-xs text-slate-400 shrink-0">{new Date(c.createdAt).toLocaleDateString("en-IN")}</p>
            </Link>
          )) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-400 text-sm">No cases linked to this animal.</div>
          )}
        </div>
      )}
    </div>
  );
}
