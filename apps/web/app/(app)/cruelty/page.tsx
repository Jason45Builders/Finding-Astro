"use client";

import React, { useState } from "react";
import { ShieldAlert, Camera, MapPin, CheckCircle, AlertTriangle } from "lucide-react";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { useRouter } from "next/navigation";

const CRUELTY_TYPES = [
  { value: "physical_abuse",   label: "Physical Abuse",      icon: "🚨", desc: "Beating, kicking, or violence" },
  { value: "poisoning",        label: "Poisoning",           icon: "☠️", desc: "Suspected or witnessed poisoning" },
  { value: "abandonment",      label: "Abandonment",         icon: "🐾", desc: "Animal left tied, caged, or dumped" },
  { value: "starvation",       label: "Starvation/Neglect",  icon: "💔", desc: "Visible malnourishment or neglect" },
  { value: "confinement",      label: "Illegal Confinement", icon: "🔒", desc: "Kept in inhumane conditions" },
  { value: "illegal_breeding", label: "Illegal Breeding",    icon: "⚠️", desc: "Unregistered or exploitative breeding" },
];

export default function CrueltyPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [crueltyType, setCrueltyType] = useState("");
  const [description, setDescription] = useState("");
  const [witnessCount, setWitnessCount] = useState(1);
  const [isOngoing, setIsOngoing] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationText, setLocationText] = useState("");
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ caseId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const detectLocation = () => {
    setDetectingLocation(true);
    navigator.geolocation?.getCurrentPosition(
      pos => { setLatitude(pos.coords.latitude); setLongitude(pos.coords.longitude); setDetectingLocation(false); },
      () => setDetectingLocation(false)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { router.push("/login"); return; }
    if (!latitude || !longitude) { setError("Please detect your location"); return; }
    if (!crueltyType) { setError("Please select the type of cruelty"); return; }
    setSubmitting(true); setError(null);
    try {
      const evidenceUrls: string[] = [];
      for (const file of files) {
        try {
          const { uploadUrl, publicUrl } = await api.getUploadUrl(file.name, file.type);
          await api.uploadFile(file, uploadUrl);
          evidenceUrls.push(publicUrl);
        } catch { /* ignore individual upload failures */ }
      }
      const result = await api.createCase({
        caseType: "abuse",
        title: `Animal Cruelty Report — ${crueltyType.replace(/_/g, " ")}`,
        description: `Type: ${crueltyType.replace(/_/g, " ")}\nOngoing: ${isOngoing ? "Yes" : "No"}\nWitnesses: ${witnessCount}\nLocation: ${locationText}\n\n${description}`,
        latitude, longitude,
        evidenceUrls,
        priority: isOngoing ? "high" : "medium",
      });
      setSuccess({ caseId: result.id });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit report");
    } finally { setSubmitting(false); }
  };

  if (success) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-5">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
          <h2 className="text-xl font-black text-slate-800">Cruelty Report Filed</h2>
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-2">
            <p className="text-xs text-slate-500 leading-relaxed">Your report has been assigned a case ID and forwarded to our NGO partners for immediate review. If the incident involves imminent harm, we will escalate to animal welfare authorities.</p>
            <p className="text-xs font-mono text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-lg">Case ID: {success.caseId}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setSuccess(null); setCrueltyType(""); setDescription(""); setFiles([]); }}
              className="bg-slate-100 text-slate-700 font-bold px-5 py-2.5 rounded-xl text-sm">Report Another</button>
            <a href={`/cases/${success.caseId}`} className="bg-primary text-white font-bold px-5 py-2.5 rounded-xl text-sm">Track Case</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-red-600" /> Report Animal Cruelty
        </h1>
        <p className="text-sm text-slate-500 mt-1">Your report will be reviewed by NGO partners and escalated to the appropriate authorities</p>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div className="text-sm text-red-800">
          <p className="font-bold mb-1">If an animal is in immediate danger</p>
          <p>Do not intervene alone. Use the <a href="/cases/new" className="underline font-bold">Emergency Report</a> form for immediate rescue dispatch.</p>
        </div>
      </div>

      {!user && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 font-semibold">
          Sign in to file a cruelty report. <a href="/login" className="underline">Sign in here</a>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
        {error && <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-xl text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Type of Cruelty</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CRUELTY_TYPES.map(ct => (
                <button key={ct.value} type="button" onClick={() => setCrueltyType(ct.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${crueltyType === ct.value ? "border-red-400 bg-red-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                  <span className="text-lg">{ct.icon}</span>
                  <p className={`text-xs font-bold mt-1 ${crueltyType === ct.value ? "text-red-700" : "text-slate-700"}`}>{ct.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{ct.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input type="checkbox" id="ongoing" checked={isOngoing} onChange={e => setIsOngoing(e.target.checked)}
              className="w-4 h-4 rounded accent-red-600" />
            <label htmlFor="ongoing" className="text-sm font-semibold text-slate-700">This is ongoing right now</label>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
            <textarea rows={5} required value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Describe what you saw in detail. Who was involved? What happened? Any identifying information about the perpetrator..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Approximate number of witnesses</label>
            <input type="number" min={1} max={100} value={witnessCount}
              onChange={e => setWitnessCount(Number(e.target.value))}
              className="w-32 px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Address / Landmark</label>
            <input type="text" value={locationText} onChange={e => setLocationText(e.target.value)}
              placeholder="e.g. Near Anna Nagar water tank, Chennai"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">GPS Location</label>
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

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Evidence (photos / videos)</label>
            <div className="border-2 border-dashed border-slate-200 hover:border-red-300 rounded-2xl p-5 text-center cursor-pointer relative transition-colors">
              <input type="file" accept="image/*,video/*" multiple
                onChange={e => setFiles(Array.from(e.target.files ?? []))}
                className="absolute inset-0 opacity-0 cursor-pointer" />
              <Camera className="w-6 h-6 text-slate-400 mx-auto mb-1" />
              <p className="text-xs text-slate-500 font-semibold">
                {files.length > 0 ? `${files.length} file(s) selected` : "Upload photos or videos as evidence"}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Evidence strengthens the case significantly.</p>
            </div>
          </div>

          <button type="submit" disabled={submitting || !user || !crueltyType}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
            {submitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
            {submitting ? "Filing Report..." : "File Cruelty Report"}
          </button>
        </form>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm text-slate-600 space-y-2">
        <p className="font-bold text-slate-800">Legal Framework</p>
        <p>Animal cruelty is punishable under the <strong>Prevention of Cruelty to Animals Act, 1960</strong>. Reports can be escalated to the Animal Welfare Board of India, local NGOs with legal standing, and the police under Section 11 of the PCA Act.</p>
      </div>
    </div>
  );
}
