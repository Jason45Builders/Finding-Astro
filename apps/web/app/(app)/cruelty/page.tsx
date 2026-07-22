"use client";

import React, { useState } from "react";
import { ShieldAlert, Camera, MapPin, CheckCircle, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";

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
          const { publicUrl } = await api.uploadMedia(file, "evidence");
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
        <Card className="p-10 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle className="w-9 h-9 text-green-600" />
          </div>
          <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Cruelty Report Filed</h2>
          <div className="bg-surface-container-low border border-outline-variant rounded-md p-4 text-left space-y-2">
            <p className="text-xs text-on-surface-variant leading-relaxed">Your report has been assigned a case ID and forwarded to our NGO partners for immediate review. If the incident involves imminent harm, we will escalate to animal welfare authorities.</p>
            <p className="font-mono text-xs text-on-surface bg-surface-container-lowest border border-outline-variant px-3 py-2 rounded-md">Case ID: {success.caseId}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="ghost" className="bg-surface-container-high" onClick={() => { setSuccess(null); setCrueltyType(""); setDescription(""); setFiles([]); }}>Report Another</Button>
            <a href={`/cases/${success.caseId}`}>
              <Button variant="primary">Track Case</Button>
            </a>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface tracking-tight flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-error" /> Report Animal Cruelty
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">Your report will be reviewed by NGO partners and escalated to the appropriate authorities</p>
      </div>

      <div className="bg-error-container text-on-error-container rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-bold mb-1">If an animal is in immediate danger</p>
          <p>Do not intervene alone. Use the <a href="/cases/new" className="underline font-bold">Emergency Report</a> form for immediate rescue dispatch.</p>
        </div>
      </div>

      {!user && (
        <div className="bg-secondary-container text-on-secondary-container rounded-xl p-4 text-sm font-bold">
          Sign in to file a cruelty report. <a href="/login" className="underline">Sign in here</a>
        </div>
      )}

      <Card className="p-6 space-y-5">
        {error && <div className="bg-error-container text-on-error-container p-4 rounded-md text-sm font-medium">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label>Type of Cruelty</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CRUELTY_TYPES.map(ct => (
                <button key={ct.value} type="button" onClick={() => setCrueltyType(ct.value)}
                  className={cn(
                    "p-3 rounded-md border-2 text-left transition-all duration-150 ease-out active:scale-95",
                    crueltyType === ct.value
                      ? "border-error bg-error-container text-on-error-container"
                      : "border-outline-variant bg-surface-container-low hover:bg-surface-container"
                  )}>
                  <span className="text-lg">{ct.icon}</span>
                  <p className={cn("text-xs font-bold mt-1", crueltyType === ct.value ? "text-on-error-container" : "text-on-surface")}>{ct.label}</p>
                  <p className={cn("text-[10px] mt-0.5", crueltyType === ct.value ? "text-on-error-container/80" : "text-outline")}>{ct.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input type="checkbox" id="ongoing" checked={isOngoing} onChange={e => setIsOngoing(e.target.checked)}
              className="w-4 h-4 rounded accent-error" />
            <label htmlFor="ongoing" className="text-sm font-bold text-on-surface-variant">This is ongoing right now</label>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea rows={5} required value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Describe what you saw in detail. Who was involved? What happened? Any identifying information about the perpetrator..." />
          </div>

          <div>
            <Label>Approximate number of witnesses</Label>
            <Input type="number" min={1} max={100} value={witnessCount}
              onChange={e => setWitnessCount(Number(e.target.value))} className="w-32" />
          </div>

          <div>
            <Label>Address / Landmark</Label>
            <Input type="text" value={locationText} onChange={e => setLocationText(e.target.value)}
              placeholder="e.g. Near Anna Nagar water tank, Chennai" />
          </div>

          <div className="space-y-2">
            <Label className="mb-0">GPS Location</Label>
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

          <div>
            <Label>Evidence (photos / videos)</Label>
            <div className="border-2 border-dashed border-outline-variant hover:border-error hover:bg-surface-container rounded-md p-6 text-center transition-colors duration-150 ease-out relative cursor-pointer">
              <input type="file" accept="image/*,video/*" multiple
                onChange={e => setFiles(Array.from(e.target.files ?? []))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <div className="flex flex-col items-center gap-2">
                <Camera className="w-8 h-8 text-outline" />
                <span className="text-sm font-bold text-on-surface-variant">
                  {files.length > 0 ? `${files.length} file(s) selected` : "Upload photos or videos as evidence"}
                </span>
                <span className="text-xs text-outline">Evidence strengthens the case significantly.</span>
              </div>
            </div>
          </div>

          <Button type="submit" variant="danger" size="lg" className="w-full" disabled={submitting || !user || !crueltyType}>
            {submitting ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
            {submitting ? "Filing Report..." : "File Cruelty Report"}
          </Button>
        </form>
      </Card>

      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5 text-sm text-on-surface-variant space-y-2">
        <p className="font-bold text-on-surface">Legal Framework</p>
        <p>Animal cruelty is punishable under the <strong>Prevention of Cruelty to Animals Act, 1960</strong>. Reports can be escalated to the Animal Welfare Board of India, local NGOs with legal standing, and the police under Section 11 of the PCA Act.</p>
      </div>
    </div>
  );
}
