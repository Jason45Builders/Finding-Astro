"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Bird, MapPin, Camera, AlertTriangle, CheckCircle, Phone, X } from "lucide-react";
import { api, WildlifeSpecies, WildlifeCenter } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { PageSpinner } from "@/components/ui/Spinner";
import { HorizontalStepper, type StepItem } from "@/components/ui/Stepper";

const CONDITIONS = [
  { value: "injured",      label: "Injured",          desc: "Visible wounds, can't move normally" },
  { value: "trapped",      label: "Trapped",           desc: "Stuck in net, building, or structure" },
  { value: "in_building",  label: "Inside Building",   desc: "Entered a home, office, or vehicle" },
  { value: "sighted_only", label: "Sighted Only",      desc: "Unusual sighting, seems healthy" },
  { value: "unknown",      label: "Not Sure",          desc: "Needs assessment" },
];

const STEP_ORDER = ["select-species", "guidance", "report"] as const;

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
          const { publicUrl } = await api.uploadMedia(file, "evidence");
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

  const riskLevel = selectedSpecies?.handlingRisk?.split(" —")[0] ?? "Medium";
  const riskCardClass =
    riskLevel === "High"
      ? "bg-error-container text-on-error-container"
      : riskLevel === "Low"
      ? "bg-green-100 text-green-800"
      : "bg-secondary-container text-on-secondary-container";

  const stepperSteps: StepItem[] = STEP_ORDER.map((key, i) => {
    const currentIndex = step === "success" ? STEP_ORDER.length : STEP_ORDER.indexOf(step as typeof STEP_ORDER[number]);
    return {
      key,
      label: key === "select-species" ? "Species" : key === "guidance" ? "Guidance" : "Report",
      state: i < currentIndex ? "done" : i === currentIndex ? "active" : "pending",
    };
  });

  if (loading) return <PageSpinner label="Loading wildlife guidance..." />;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface tracking-tight flex items-center gap-2">
          <Bird className="w-6 h-6 text-primary" /> Wildlife Rescue
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">Wildlife requires specialist handling — do not attempt to capture</p>
      </div>

      {step !== "success" && <HorizontalStepper steps={stepperSteps} />}

      {step === "select-species" && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-on-surface-variant">What type of animal did you see?</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 animate-stagger">
            {(species.length > 0 ? species : ["Snake","Bird","Monkey","Reptile","Mammal","Other"].map(n => ({ id: n, name: n.toLowerCase(), displayName: n, handlingRisk: "Medium — keep distance", publicGuidance: "Stay calm. Keep distance. Call a wildlife rescuer.", doNotDo: "Do not handle or approach.", isActive: true }))).map(s => {
              const isSelected = selectedSpecies?.id === s.id;
              return (
                <button key={s.id} onClick={() => handleSelectSpecies(s)}
                  className={cn(
                    "border rounded-xl p-3 sm:p-4 text-left transition-all duration-150 ease-out active:scale-95 hover:shadow-sm",
                    isSelected
                      ? "border-primary bg-primary-container"
                      : "border-outline-variant bg-surface-container-lowest hover:border-primary"
                  )}>
                  <p className={cn("font-bold text-xs sm:text-sm transition-colors duration-150", isSelected ? "text-on-primary-container" : "text-on-surface")}>{s.displayName}</p>
                  <p className={cn("text-[10px] mt-1 line-clamp-1 transition-colors duration-150", isSelected ? "text-on-primary-container/80" : "text-on-surface-variant")}>{s.handlingRisk}</p>
                </button>
              );
            })}
          </div>
          {centers.length > 0 && (
            <div className="mt-4">
              <h3 className="font-bold text-on-surface text-sm mb-3">Nearby Wildlife Centres</h3>
              <div className="space-y-2">
                {centers.slice(0, 4).map(c => (
                  <Card key={c.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-bold text-on-surface text-sm truncate">{c.name}</p>
                      <p className="text-xs text-on-surface-variant truncate">{c.address ?? c.city ?? "Chennai"}</p>
                      {c.acceptedSpecies?.length > 0 && <p className="text-[10px] text-outline mt-0.5 truncate">Accepts: {c.acceptedSpecies.join(", ")}</p>}
                    </div>
                    <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 text-primary font-bold text-sm hover:underline shrink-0">
                      <Phone className="w-4 h-4" />{c.phone}
                    </a>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {step === "guidance" && selectedSpecies && (
        <div className="space-y-5">
          <div className={cn("rounded-xl p-5", riskCardClass)}>
            <p className="font-label-caps text-label-caps uppercase mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Risk Level
            </p>
            <p className="text-sm font-bold">{selectedSpecies.handlingRisk}</p>
          </div>
          <Card className="p-5">
            <h3 className="font-bold text-on-surface mb-2">What to do</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">{selectedSpecies.publicGuidance}</p>
          </Card>
          <div className="rounded-xl p-5 bg-error-container text-on-error-container">
            <h3 className="font-bold mb-2 flex items-center gap-1.5"><X className="w-4 h-4" /> Do NOT</h3>
            <p className="text-sm leading-relaxed">{selectedSpecies.doNotDo}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1 bg-surface-container-high" onClick={() => setStep("select-species")}>Back</Button>
            <Button variant="primary" className="flex-1" onClick={() => setStep("report")}>I understand — File Rescue Report</Button>
          </div>
        </div>
      )}

      {step === "report" && selectedSpecies && (
        <Card className="p-6 space-y-5">
          <h2 className="font-title-md text-title-md text-on-surface">File Wildlife Rescue — {selectedSpecies.displayName}</h2>
          {!user && (
            <div className="bg-secondary-container text-on-secondary-container rounded-md p-4 text-sm font-bold">
              Sign in required. <a href="/login" className="underline">Sign in here</a>
            </div>
          )}
          {error && <div className="bg-error-container text-on-error-container p-4 rounded-md text-sm font-medium">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="mb-0">Animal&apos;s condition</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CONDITIONS.map(c => (
                  <button key={c.value} type="button" onClick={() => setCondition(c.value)}
                    className={cn(
                      "p-3 rounded-md border-2 text-left transition-all duration-150 ease-out active:scale-95",
                      condition === c.value
                        ? "border-primary bg-primary-container text-on-primary-container"
                        : "border-outline-variant bg-surface-container-low hover:bg-surface-container"
                    )}>
                    <p className={cn("text-xs font-bold", condition === c.value ? "text-on-primary-container" : "text-on-surface")}>{c.label}</p>
                    <p className={cn("text-[10px] mt-0.5", condition === c.value ? "text-on-primary-container/80" : "text-outline")}>{c.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Size, colour, exact location, behaviour..." />
            </div>
            <div className="space-y-2">
              <Label className="mb-0">Your GPS location</Label>
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
              <Label>Photo (optional)</Label>
              <div className="border-2 border-dashed border-outline-variant hover:border-primary hover:bg-surface-container rounded-md p-6 text-center transition-colors duration-150 ease-out relative cursor-pointer">
                <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] ?? null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <div className="flex flex-col items-center gap-2">
                  <Camera className="w-8 h-8 text-outline" />
                  <span className="text-sm font-bold text-on-surface-variant">{file ? file.name : "Upload photo from a safe distance only"}</span>
                  <span className="text-xs text-outline">PNG or JPG formats up to 5MB</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="ghost" className="flex-1 bg-surface-container-high" onClick={() => setStep("guidance")}>Back</Button>
              <Button type="submit" variant="coral" className="flex-1" disabled={submitting || !user}>
                {submitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Bird className="w-4 h-4" />}
                {submitting ? "Submitting..." : "Send Rescue Alert"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {step === "success" && (
        <Card className="p-10 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle className="w-9 h-9 text-green-600" />
          </div>
          <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Wildlife Rescue Alert Sent</h3>
          <p className="text-on-surface-variant text-sm leading-relaxed">Authorised wildlife responders within 30km have been notified. Do not attempt to handle the animal.</p>
          {resultGuidance && (
            <div className="bg-surface-container-low border border-outline-variant rounded-md p-4 text-left">
              <p className="font-label-caps text-label-caps text-outline mb-2">While you wait</p>
              <p className="text-sm text-on-surface-variant">{resultGuidance.publicGuidance}</p>
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <Button variant="ghost" className="bg-surface-container-high" onClick={() => { setStep("select-species"); setCondition(""); setDescription(""); setFile(null); }}>Report Another</Button>
            {resultCaseId && (
              <a href={`/cases/${resultCaseId}`}>
                <Button variant="primary">Track Case</Button>
              </a>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

export default function WildlifePage() {
  return (
    <Suspense fallback={<PageSpinner label="Loading wildlife guidance..." />}>
      <WildlifePageInner />
    </Suspense>
  );
}
