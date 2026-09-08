"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Ambulance, MapPin, CheckCircle, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { PageSpinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import Link from "next/link";

export default function AmbulanceRequestPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedServiceId = searchParams?.get("serviceId") || "";

  const [services, setServices] = useState<Array<{ id: string; name: string; phone: string; city: string | null }>>([]);
  const [serviceId, setServiceId] = useState(preselectedServiceId);
  const [patientCondition, setPatientCondition] = useState("");
  const [pickupText, setPickupText] = useState("");
  const [destinationText, setDestinationText] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [destLatitude, setDestLatitude] = useState<number | null>(null);
  const [destLongitude, setDestLongitude] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successId, setSuccessId] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    api.request<Array<{ id: string; name: string; phone: string; city: string | null }>>("/ambulance/services?isActive=true")
      .then((data) => setServices(Array.isArray(data) ? data : []))
      .catch(() => setServices([]));
  }, []);

  const handleDetectLocation = () => {
    setDetecting(true);
    setError("");
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setDetecting(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setDetecting(false);
      },
      (err) => {
        setError(err.message || "Location permission denied");
        setDetecting(false);
      }
    );
  };

  const handleDetectDestination = () => {
    setDetecting(true);
    setError("");
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setDetecting(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDestLatitude(pos.coords.latitude);
        setDestLongitude(pos.coords.longitude);
        setDetecting(false);
      },
      (err) => {
        setError(err.message || "Location permission denied");
        setDetecting(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!serviceId) {
      setError("Please select an ambulance service.");
      return;
    }
    if (latitude === null || longitude === null) {
      setError("Please detect pickup location.");
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        serviceId,
        patientCondition: patientCondition || undefined,
        pickupLocation: { latitude, longitude },
        pickupLocationText: pickupText || undefined,
        notes: notes || undefined,
      };
      if (destLatitude !== null && destLongitude !== null) {
        payload.destinationLocation = { latitude: destLatitude, longitude: destLongitude };
        payload.destinationLocationText = destinationText || undefined;
      }
      const result = await api.request<any>("/ambulance/requests", { method: "POST", body: JSON.stringify(payload) });
      setSuccessId((result as { id?: string })?.id ?? null);
    } catch (err: any) {
      setError(err?.message || "Failed to request ambulance. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (successId) {
    return (
      <div className="max-w-xl mx-auto">
        <Card className="p-6 sm:p-8 text-center space-y-4">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
          <h1 className="font-headline-lg text-on-surface">Ambulance requested</h1>
          <p className="text-sm text-on-surface-variant">Your ambulance request has been submitted. The service will be notified.</p>
          <div className="bg-surface-container-low border border-outline-variant rounded-md p-4 text-left">
            <p className="text-[10px] font-label-caps text-outline uppercase tracking-wider">Request ID</p>
            <p className="font-mono text-sm text-on-surface mt-1">{successId}</p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button variant="primary" onClick={() => router.push("/ambulance")} className="w-full">Back to Ambulance Services</Button>
            <Button variant="ghost" onClick={() => { setSuccessId(null); setPatientCondition(""); setPickupText(""); setDestinationText(""); setNotes(""); setLatitude(null); setLongitude(null); setDestLatitude(null); setDestLongitude(null); }} className="w-full">New Request</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <Link href="/ambulance" className="inline-flex items-center gap-1 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors">
          <Ambulance className="w-4 h-4" /> Back to Ambulance
        </Link>
        <h1 className="font-headline-lg text-headline-lg text-on-surface mt-2">Request Ambulance</h1>
        <p className="text-sm text-on-surface-variant mt-1">Provide pickup and destination details to request an animal ambulance.</p>
      </div>

      <Card className="p-5 sm:p-6 space-y-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-2 text-error text-sm bg-error-container p-3 rounded-md">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label className="mb-0">Ambulance Service <span className="text-error">*</span></Label>
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="w-full bg-surface-container-low border-b-2 border-outline focus:border-primary focus:ring-0 focus:outline-none px-4 py-3 rounded-t-md font-body-md text-on-surface" required>
              <option value="">Select a service</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name} {s.city ? `— ${s.city}` : ""}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="mb-0">Pickup Location <span className="text-error">*</span></Label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input type="text" placeholder="Latitude" value={latitude !== null ? latitude.toFixed(6) : ""} readOnly className="rounded-md" />
                <Input type="text" placeholder="Longitude" value={longitude !== null ? longitude.toFixed(6) : ""} readOnly className="rounded-md" />
              </div>
              <Button type="button" variant="ghost" onClick={handleDetectLocation} disabled={detecting} className="bg-surface-container-high shrink-0">
                <MapPin className="w-4 h-4" />
                {detecting ? "Detecting..." : "Detect Location"}
              </Button>
            </div>
            <Input type="text" value={pickupText} onChange={(e) => setPickupText(e.target.value)} placeholder="Pickup address or landmark" className="mt-2" />
          </div>

          <div className="space-y-2">
            <Label className="mb-0">Destination (optional)</Label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input type="text" placeholder="Latitude" value={destLatitude !== null ? destLatitude.toFixed(6) : ""} readOnly className="rounded-md" />
                <Input type="text" placeholder="Longitude" value={destLongitude !== null ? destLongitude.toFixed(6) : ""} readOnly className="rounded-md" />
              </div>
              <Button type="button" variant="ghost" onClick={handleDetectDestination} disabled={detecting} className="bg-surface-container-high shrink-0">
                <MapPin className="w-4 h-4" />
                {detecting ? "Detecting..." : "Detect Location"}
              </Button>
            </div>
            <Input type="text" value={destinationText} onChange={(e) => setDestinationText(e.target.value)} placeholder="Destination address or clinic name" className="mt-2" />
          </div>

          <div className="space-y-2">
            <Label className="mb-0">Patient Condition</Label>
            <Textarea value={patientCondition} onChange={(e) => setPatientCondition(e.target.value)} rows={3} placeholder="Describe the animal's condition, injuries, or urgency" />
          </div>

          <div className="space-y-2">
            <Label className="mb-0">Additional Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any special instructions, gate codes, or contact info" />
          </div>

          <Button type="submit" disabled={loading} variant="primary" size="lg" className="w-full">
            {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Request Ambulance"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
