"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Bird, MapPin, Camera, AlertTriangle, CheckCircle, Phone } from "lucide-react";
import { api, WildlifeSpecies, WildlifeCenter } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";

const CONDITIONS = [
  { value: "injured",      label: "Injured",          desc: "Visible wounds, can't move normally" },
  { value: "trapped",      label: "Trapped",           desc: "Stuck in net, building, or structure" },
  { value: "in_building",  label: "Inside Building",   desc: "Entered a home, office, or vehicle" },
  { value: "sighted_only", label: "Sighted Only",      desc: "Unusual sighting, seems healthy" },
  { value: "unknown",      label: "Not Sure",          desc: "Needs assessment" },
];

function WildlifePageInner() {
  const router = useRouter();
  const { user } = useAuth();
  const [species, setSpecies] = useState<WildlifeSpecies[]>([]);
  const [centers, setCenters] = useState<WildlifeCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"select-species" | "guidance" | "report" | "success">("select-species");
  const [selectedSpecies, setSelectedSpecies] = useState<WildlifeSpecies | null>(null);
  const [condition, setCondition] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultCaseId, setResultCaseId] = useState<string | null>(null);
  const [resultGuidance, setResultGuidance] = useState<{ publicGuidance: string; doNotDo: string } | null>(null);

  useEffect(() => {
    Promise.all([api.listWildlifeSpecies(), api.listWildlifeCenters()])
      .then(([s, c]) => { setSpecies(s); setCenters(c); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const detectLocation = () => {
    setDetectingLocation(true);
    navigator.geolocation?.getCurrentPosition(
      pos => { setLatitude(pos.coords.latitude); setLongitude(pos.coords.longitude); setDetectingLocation(false); },
      () => setDetectingLocation(false)
    );
  };

  const handleSelectSpecies = (s: WildlifeSpecies) => { setSelectedSpecies(s); setStep("guidance"); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!latitude || !longitude) { setError("Please detect your location"); return; }
    if (!condition) { setError("Please select the animal's condition"); return; }
    if (!user) { router.push("/login"); return; }
    setSubmitting(true); setError(null);
    try {
      let photoUrls: string[] = [];
      if (file) {
        try {
          const { uploadUrl, publicUrl } = await api.getUploadUrl(file.name, file.type);
          await api.uploadFile(file, uploadUrl);
          photoUrls = [publicUrl];
        } catch { /* ignore */ }
      }
      const result = await api.reportWildlife({
        speciesCategory: selectedSpecies?.name ?? "other",
        condition,
        description: description || `${selectedSpecies?.displayName ?? "Wildlife"} — ${condition}`,
        latitude, longitude, photoUrls,
      });
      setResultCaseId(result.caseRecord.id);
      setResultGuidance(result.guidance);
      setStep("success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit report");
    } finally { setSubmitting(false); }
  };

  const RISK_COLOR: Record<string, string> = {
    "High": "bg-red-50 border-red-200 text-red-800",
    "Medium": "bg-amber-50 border-amber-200 text-amber-800",
    "Low": "bg-emerald-50 border-emerald-200 text-emerald-800",
  };
  const riskLevel = selectedSpecies?.handlingRisk?.split(" —")[0] ?? "Medium";
  const riskClass = RISK_COLOR[riskLevel] ?? RISK_COLOR["Medium"];

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <Bird className="w-6 h-6 text-primary" /> Wildlife Rescue
        </h1>
        <p className="text-sm text-slate-500 mt-1">Wildlife requires specialist handling — do not attempt to capture</p>
      </div>

      <div className="flex items-center gap-2 text-xs font-semibold">
        {[["select-species","Species"],["guidance","Guidance"],["report","Report"]].map(([s, label], i) => (
          <React.Fragment key={s}>
            <span className={`px-3 py-1 rounded-full ${step === s ? "bg-primary text-white" : "bg-slate-100 text-slate-500"}`}>{label}</span>
            {i < 2 && <span className="text-slate-300">→</span>}
          </React.Fragment>
        ))}
      </div>

      {step === "select-species" && (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-slate-600">What type of animal did you see?</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(species.length > 0 ? species : ["Snake","Bird","Monkey","Reptile","Mammal","Other"].map(n => ({ id: n, name: n.toLowerCase(), displayName: n, handlingRisk: "Medium — keep distance", publicGuidance: "Stay calm. Keep distance. Call a wildlife rescuer.", doNotDo: "Do not handle or approach.", isActive: true }))).map(s => (
              <button key={s.id} onClick={() => handleSelectSpecies(s)}
                className="bg-white border border-slate-200 hover:border-primary rounded-2xl p-4 text-left transition-all hover:shadow-sm group">
                <p className="font-bold text-slate-800 group-hover:text-primary text-sm">{s.displayName}</p>
                <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{s.handlingRisk}</p>
              </button>
            ))}
          </div>
          {centers.length > 0 && (
            <div className="mt-4">
              <h3 className="font-bold text-slate-700 text-sm mb-3">Nearby Wildlife Centres</h3>
              <div className="space-y-2">
                {centers.slice(0, 4).map(c => (
                  <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.address ?? c.city ?? "Chennai"}</p>
                      {c.acceptedSpecies.length > 0 && <p className="text-[10px] text-slate-400 mt-0.5">Accepts: {c.acceptedSpecies.join(", ")}</p>}
                    </div>
                    <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 text-primary font-bold text-sm hover:underline shrink-0">
                      <Phone className="w-4 h-4" />{c.phone}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {step === "guidance" && selectedSpecies && (
        <div className="space-y-5">
          <div className={`border rounded-2xl p-5 ${riskClass}`}>
            <p className="text-xs font-bold uppercase tracking-wider mb-2">⚠ Risk Level</p>
            <p className="text-sm font-bold">{selectedSpecies.handlingRisk}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h3 className="font-bold text-slate-800 mb-2">What to do</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{selectedSpecies.publicGuidance}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <h3 className="font-bold text-red-800 mb-2">Do NOT</h3>
            <p className="text-sm text-red-700 leading-relaxed">{selectedSpecies.doNotDo}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep("select-species")} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm">Back</button>
            <button onClick={() => setStep("report")} className="flex-1 bg-primary hover:bg-emerald-800 text-white font-bold py-3 rounded-xl text-sm">I understand — File Rescue Report</button>
          </div>
        </div>
      )}

      {step === "report" && selectedSpecies && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
          <h2 className="font-black text-slate-800 text-lg">File Wildlife Rescue — {selectedSpecies.displayName}</h2>
          {!user && <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 font-semibold">Sign in required. <a href="/login" className="underline">Sign in here</a></div>}
          {error && <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-xl text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Animal's condition</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CONDITIONS.map(c => (
                  <button key={c.value} type="button" onClick={() => setCondition(c.value)}
                    className={`p-3 rounded-xl border text-left ${condition === c.value ? "border-primary bg-primary-light" : "border-slate-200 hover:border-slate-300"}`}>
                    <p className={`text-xs font-bold ${condition === c.value ? "text-primary" : "text-slate-700"}`}>{c.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{c.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
              <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Size, colour, exact location, behaviour..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Your GPS location</label>
              <div className="flex gap-2">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input readOnly value={latitude?.toFixed(5) ?? ""} placeholder="Latitude" className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600" />
                  <input readOnly value={longitude?.toFixed(5) ?? ""} placeholder="Longitude" className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600" />
                </div>
                <button type="button" onClick={detectLocation} disabled={detectingLocation}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-1.5 shrink-0">
                  <MapPin className="w-4 h-4" />{detectingLocation ? "..." : "Detect"}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Photo (optional)</label>
              <div className="border-2 border-dashed border-slate-200 hover:border-primary rounded-2xl p-4 text-center cursor-pointer relative">
                <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] ?? null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                <Camera className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <p className="text-xs text-slate-500">{file ? file.name : "Upload photo from a safe distance only"}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep("guidance")} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm">Back</button>
              <button type="submit" disabled={submitting || !user}
                className="flex-1 bg-primary hover:bg-emerald-800 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
                {submitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Bird className="w-4 h-4" />}
                {submitting ? "Submitting..." : "Send Rescue Alert"}
              </button>
            </div>
          </form>
        </div>
      )}

      {step === "success" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-5">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
          <h3 className="text-xl font-black text-slate-800">Wildlife Rescue Alert Sent</h3>
          <p className="text-slate-600 text-sm">Authorised wildlife responders within 30km have been notified. Do not attempt to handle the animal.</p>
          {resultGuidance && (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">While you wait</p>
              <p className="text-sm text-slate-600">{resultGuidance.publicGuidance}</p>
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setStep("select-species"); setCondition(""); setDescription(""); setFile(null); }} className="bg-slate-100 text-slate-700 font-bold px-5 py-2.5 rounded-xl text-sm">Report Another</button>
            {resultCaseId && <a href={`/cases/${resultCaseId}`} className="bg-primary text-white font-bold px-5 py-2.5 rounded-xl text-sm">Track Case</a>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WildlifePage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
      <WildlifePageInner />
    </Suspense>
  );
}
