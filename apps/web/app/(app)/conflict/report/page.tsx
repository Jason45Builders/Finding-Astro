"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, AlertTriangle, MapPin, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";

const CONFLICT_TYPES = [
  "feel_unsafe",
  "group_conflict",
  "territory_dispute",
  "resource_competition",
  "noise_complaint",
  "welfare_neglect",
];

export default function ConflictReportPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [form, setForm] = useState({
    conflictType: "",
    description: "",
    locationText: "",
    severity: "medium",
  });
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user) router.push("/login");
  }, [user, router]);

  if (!user) return null;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (latitude === null || longitude === null) {
      setError("Please detect your location before submitting.");
      return;
    }
    setSubmitting(true);
    setSuccess(false);

    try {
      await api.reportConflict({
        conflictType: form.conflictType,
        description: form.description,
        latitude,
        longitude,
        locationText: form.locationText || undefined,
        severity: form.severity,
      });
      setSuccess(true);
      setForm({ conflictType: "", description: "", locationText: "", severity: "medium" });
      setLatitude(null);
      setLongitude(null);
    } catch (err: any) {
      setError(err?.message || "Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/safety" className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary font-bold transition-colors duration-150 ease-out">
        <ChevronLeft className="w-4 h-4" /> Back to Safety
      </Link>

      <Card className="p-6 sm:p-8 space-y-6">
        <div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-secondary" /> Report a Conflict
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Report human-animal or community conflict situations. All reports are confidential.
          </p>
        </div>

        {error && (
          <div className="bg-error-container text-on-error-container p-4 rounded-md text-sm font-medium">{error}</div>
        )}
        {success && (
          <div className="bg-green-100 text-green-800 p-4 rounded-md text-sm font-bold">
            Report submitted successfully. Help is on the way.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label>Conflict Type *</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CONFLICT_TYPES.map(type => (
                <button key={type} type="button" onClick={() => setForm(f => ({ ...f, conflictType: type }))}
                  className={cn(
                    "py-2.5 px-3 rounded-md text-xs font-bold border-2 transition-all duration-150 ease-out active:scale-95 capitalize",
                    form.conflictType === type
                      ? "bg-primary-container text-on-primary-container border-primary"
                      : "bg-surface-container-low text-on-surface-variant border-outline-variant hover:bg-surface-container"
                  )}>
                  {type.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Description *</Label>
            <Textarea
              required
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={4}
              placeholder="Describe what happened..."
            />
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
            <Input type="text" value={form.locationText} onChange={e => setForm(f => ({ ...f, locationText: e.target.value }))}
              placeholder="Location description (optional)" className="rounded-md" />
          </div>

          <div>
            <Label>Severity</Label>
            <div className="flex gap-2">
              {(["low", "medium", "high"] as const).map(sev => (
                <button key={sev} type="button" onClick={() => setForm(f => ({ ...f, severity: sev }))}
                  className={cn(
                    "flex-1 py-3 px-4 rounded-md border-2 font-bold text-xs uppercase tracking-wider transition-all duration-150 ease-out active:scale-95",
                    form.severity === sev
                      ? sev === "high"
                        ? "bg-error text-on-error border-error"
                        : sev === "medium"
                        ? "bg-secondary-container text-on-secondary-container border-secondary"
                        : "bg-green-100 text-green-800 border-green-400"
                      : "bg-surface-container-low text-on-surface-variant border-outline-variant hover:bg-surface-container"
                  )}>
                  {sev}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" variant="coral" size="lg" className="w-full" disabled={submitting || !form.conflictType || !form.description}>
            {submitting ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Submit Report"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
