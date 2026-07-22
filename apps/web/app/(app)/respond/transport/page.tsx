"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Truck, MapPin, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";

const VEHICLE_TYPES = ["ambulance", "small_car", "van", "truck", "bike"];

export default function TransportRequestPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [form, setForm] = useState({
    caseId: "",
    animalId: "",
    vehicleTypeRequired: "van",
    patientCondition: "",
    pickupText: "",
    destText: "",
  });
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [detectingPickup, setDetectingPickup] = useState(false);
  const [destLat, setDestLat] = useState<number | null>(null);
  const [destLng, setDestLng] = useState<number | null>(null);
  const [detectingDest, setDetectingDest] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user) router.push("/login");
  }, [user, router]);

  if (!user) return null;

  const detectPickup = () => {
    setDetectingPickup(true);
    navigator.geolocation?.getCurrentPosition(
      pos => { setPickupLat(pos.coords.latitude); setPickupLng(pos.coords.longitude); setDetectingPickup(false); },
      () => setDetectingPickup(false)
    );
  };

  const detectDest = () => {
    setDetectingDest(true);
    navigator.geolocation?.getCurrentPosition(
      pos => { setDestLat(pos.coords.latitude); setDestLng(pos.coords.longitude); setDetectingDest(false); },
      () => setDetectingDest(false)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pickupLat === null || pickupLng === null) { setError("Please detect the pickup location."); return; }
    if (destLat === null || destLng === null) { setError("Please detect the destination location."); return; }
    setSubmitting(true);
    setSuccess(false);

    try {
      await api.createTransportRequest({
        caseId: form.caseId,
        animalId: form.animalId || undefined,
        vehicleTypeRequired: form.vehicleTypeRequired,
        patientCondition: form.patientCondition,
        pickupLocation: { latitude: pickupLat, longitude: pickupLng },
        pickupLocationText: form.pickupText || undefined,
        destinationLocation: { latitude: destLat, longitude: destLng },
        destinationLocationText: form.destText || undefined,
      });
      setSuccess(true);
      setForm({ caseId: "", animalId: "", vehicleTypeRequired: "van", patientCondition: "", pickupText: "", destText: "" });
      setPickupLat(null); setPickupLng(null); setDestLat(null); setDestLng(null);
    } catch (err: any) {
      setError(err?.message || "Failed to create transport request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/respond" className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary font-bold transition-colors duration-150 ease-out">
        <ChevronLeft className="w-4 h-4" /> Back to Respond
      </Link>

      <Card className="p-6 sm:p-8 space-y-6">
        <div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface flex items-center gap-2">
            <Truck className="w-6 h-6 text-secondary" /> Request Transport
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Book animal transport for a case. All requests go to available responders.
          </p>
        </div>

        {error && (
          <div className="bg-error-container text-on-error-container p-4 rounded-md text-sm font-medium">{error}</div>
        )}
        {success && (
          <div className="bg-green-100 text-green-800 p-4 rounded-md text-sm font-bold">
            Transport request created successfully.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label>Case ID *</Label>
            <Input
              required
              value={form.caseId}
              onChange={e => setForm(f => ({ ...f, caseId: e.target.value }))}
              placeholder="UUID of the case"
            />
          </div>

          <div>
            <Label>Vehicle Type *</Label>
            <div className="flex flex-wrap gap-2">
              {VEHICLE_TYPES.map(v => (
                <button key={v} type="button" onClick={() => setForm(f => ({ ...f, vehicleTypeRequired: v }))}
                  className={cn(
                    "px-4 py-2 rounded-md text-xs font-bold border-2 transition-all duration-150 ease-out active:scale-95 capitalize",
                    form.vehicleTypeRequired === v
                      ? "bg-primary-container text-on-primary-container border-primary"
                      : "bg-surface-container-low text-on-surface-variant border-outline-variant hover:bg-surface-container"
                  )}>
                  {v.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Patient Condition *</Label>
            <Textarea
              required
              value={form.patientCondition}
              onChange={e => setForm(f => ({ ...f, patientCondition: e.target.value }))}
              rows={3}
              placeholder="Describe the animal's condition and any special handling needs..."
            />
          </div>

          <div className="space-y-2">
            <Label className="mb-0 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Pickup Location
            </Label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input type="text" placeholder="Latitude" readOnly value={pickupLat !== null ? pickupLat.toFixed(6) : ""} className="rounded-md" />
                <Input type="text" placeholder="Longitude" readOnly value={pickupLng !== null ? pickupLng.toFixed(6) : ""} className="rounded-md" />
              </div>
              <Button type="button" variant="ghost" onClick={detectPickup} disabled={detectingPickup} className="bg-surface-container-high shrink-0">
                <MapPin className="w-4 h-4" />{detectingPickup ? "Detecting..." : "Detect Location"}
              </Button>
            </div>
            {pickupLat !== null && pickupLng !== null && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary">
                <ShieldCheck className="w-3.5 h-3.5" /> GEO-TAGGED
              </span>
            )}
            <Input type="text" value={form.pickupText} onChange={e => setForm(f => ({ ...f, pickupText: e.target.value }))}
              placeholder="Pickup address or landmark" className="rounded-md" />
          </div>

          <div className="space-y-2">
            <Label className="mb-0 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Destination
            </Label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input type="text" placeholder="Latitude" readOnly value={destLat !== null ? destLat.toFixed(6) : ""} className="rounded-md" />
                <Input type="text" placeholder="Longitude" readOnly value={destLng !== null ? destLng.toFixed(6) : ""} className="rounded-md" />
              </div>
              <Button type="button" variant="ghost" onClick={detectDest} disabled={detectingDest} className="bg-surface-container-high shrink-0">
                <MapPin className="w-4 h-4" />{detectingDest ? "Detecting..." : "Detect Location"}
              </Button>
            </div>
            {destLat !== null && destLng !== null && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary">
                <ShieldCheck className="w-3.5 h-3.5" /> GEO-TAGGED
              </span>
            )}
            <Input type="text" value={form.destText} onChange={e => setForm(f => ({ ...f, destText: e.target.value }))}
              placeholder="Destination address or hospital/clinic name" className="rounded-md" />
          </div>

          <Button type="submit" variant="coral" size="lg" className="w-full" disabled={submitting || !form.caseId || !form.patientCondition}>
            {submitting ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Create Transport Request"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
