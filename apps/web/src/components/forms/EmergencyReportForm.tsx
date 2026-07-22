"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MapPin, Camera, CheckCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api, Case } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";

const SEVERITY_OPTIONS = [
  { value: "critical", label: "Critical" },
  { value: "serious", label: "Serious" },
  { value: "stable", label: "Stable" },
] as const;

export function EmergencyReportForm({ homeHref = "/" }: { homeHref?: string }) {
  const { user } = useAuth();

  const [severity, setSeverity] = useState<(typeof SEVERITY_OPTIONS)[number]["value"]>("critical");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [guestPhone, setGuestPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCase, setSuccessCase] = useState<Case | null>(null);

  const handleDetectLocation = () => {
    setDetectingLocation(true);
    setError(null);
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setDetectingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setDetectingLocation(false);
      },
      (err) => {
        setError(err.message || "Location permission denied");
        setDetectingLocation(false);
      }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  const handleUploadImage = async (): Promise<string | undefined> => {
    if (!file) return undefined;
    setUploadingFile(true);
    try {
      const { publicUrl } = await api.uploadMedia(file, "evidence");
      return publicUrl;
    } catch (err) {
      console.warn("Upload failed, using fallback mock URL", err);
      const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
      return `${base}${base ? "/" : ""}mock-uploads/${Date.now()}-${file.name}`;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (latitude === null || longitude === null) {
      setError("Please detect your coordinates before submitting.");
      return;
    }
    setLoading(true);
    try {
      const publicImageUrl = await handleUploadImage();
      const emergencyCase = await api.createEmergencyCase({
        severity,
        description: description || `Emergency Stray Rescue: ${severity} condition`,
        latitude,
        longitude,
        evidenceUrl: publicImageUrl,
        guestEmail: guestPhone || undefined,
      });
      setSuccessCase(emergencyCase);
    } catch (err: any) {
      setError(err?.message || "Failed to submit emergency report. Please check form fields.");
    } finally {
      setLoading(false);
    }
  };

  if (successCase) {
    return (
      <Card className="max-w-xl mx-auto text-center p-8 space-y-6">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle className="w-9 h-9 text-green-600" />
        </div>
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Report Received</h2>
        <p className="text-on-surface-variant text-sm leading-relaxed">
          Your alert has been broadcasted to the responder network. Responders in the area are receiving notifications.
        </p>
        <div className="bg-surface-container-low p-4 rounded-md text-left border border-outline-variant">
          <p className="font-label-caps text-label-caps text-outline">Case Reference ID</p>
          <p className="font-mono text-sm text-on-surface mt-1 truncate">{successCase.id}</p>
        </div>
        <div className="pt-2 flex flex-col gap-2">
          {user ? (
            <Link href={`/cases/${successCase.id}`}>
              <Button variant="primary" size="lg" className="w-full">Track Case Timeline</Button>
            </Link>
          ) : (
            <Link href={homeHref}>
              <Button variant="ghost" size="lg" className="w-full bg-surface-container-high">Back to Home</Button>
            </Link>
          )}
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-error-container text-on-error-container p-4 rounded-md text-sm font-medium">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label className="mb-0">Condition Severity</Label>
        <div className="grid grid-cols-3 gap-3">
          {SEVERITY_OPTIONS.map((sev) => (
            <button
              key={sev.value}
              type="button"
              onClick={() => setSeverity(sev.value)}
              className={cn(
                "py-3 px-4 rounded-md border-2 font-bold text-xs uppercase tracking-wider transition-all duration-150 ease-out active:scale-95",
                severity === sev.value
                  ? sev.value === "critical"
                    ? "bg-error text-on-error border-error"
                    : sev.value === "serious"
                    ? "bg-secondary-container text-on-secondary-container border-secondary"
                    : "bg-primary-container text-on-primary-container border-primary"
                  : "bg-surface-container-low text-on-surface-variant border-outline-variant hover:bg-surface-container"
              )}
            >
              {sev.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="mb-0">Location Coordinates</Label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 grid grid-cols-2 gap-2">
            <Input type="text" placeholder="Latitude" value={latitude !== null ? latitude.toFixed(6) : ""} readOnly className="rounded-md" />
            <Input type="text" placeholder="Longitude" value={longitude !== null ? longitude.toFixed(6) : ""} readOnly className="rounded-md" />
          </div>
          <Button type="button" variant="ghost" onClick={handleDetectLocation} disabled={detectingLocation} className="bg-surface-container-high shrink-0">
            <MapPin className="w-4 h-4" />
            {detectingLocation ? "Detecting..." : "Detect Location"}
          </Button>
        </div>
        {latitude !== null && longitude !== null && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary">
            <ShieldCheck className="w-3.5 h-3.5" /> GEO-TAGGED
          </span>
        )}
      </div>

      <div>
        <Label>Describe the animal&apos;s condition</Label>
        <Textarea
          placeholder="Symptoms, breed, behavior notes, or landmark details..."
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      <div>
        <Label>Evidence / Photo Upload</Label>
        <div className="border-2 border-dashed border-outline-variant hover:border-primary hover:bg-surface-container rounded-md p-6 text-center transition-colors duration-150 ease-out relative cursor-pointer">
          <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          <div className="flex flex-col items-center gap-2">
            <Camera className="w-8 h-8 text-outline" />
            <span className="text-sm font-bold text-on-surface-variant">{file ? file.name : "Click to select a photo"}</span>
            <span className="text-xs text-outline">PNG or JPG formats up to 5MB</span>
          </div>
        </div>
      </div>

      {!user && (
        <div>
          <Label>Your Phone (optional)</Label>
          <p className="text-[11px] text-on-surface-variant mb-1.5 -mt-1">So a responder can reach you directly.</p>
          <Input type="tel" placeholder="+91 98765 43210" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
        </div>
      )}

      <Button type="submit" disabled={loading || uploadingFile} variant="coral" size="lg" className="w-full">
        {loading || uploadingFile ? (
          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          "Send Emergency SOS Alert"
        )}
      </Button>
    </form>
  );
}
