"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Ambulance, Plus, MapPin, Phone } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

type AmbulanceService = {
  id: string;
  name: string;
  providerType: string;
  phone: string;
  alternatePhone: string | null;
  vehicleType: string | null;
  capacity: number | null;
  city: string | null;
  location: { latitude: number; longitude: number } | null;
  locationText: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type AmbulanceRequest = {
  id: string;
  caseId: string | null;
  animalId: string | null;
  requestedByUserId: string;
  serviceId: string | null;
  assignedToUserId: string | null;
  status: string;
  patientCondition: string | null;
  pickupLocation: { latitude: number; longitude: number } | null;
  pickupLocationText: string | null;
  destinationLocation: { latitude: number; longitude: number } | null;
  destinationLocationText: string | null;
  notes: string | null;
  respondedAt: string | null;
  dispatchedAt: string | null;
  arrivedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
};

const PROVIDER_TYPES = ["private", "government", "ngo", "hospital"];
const VEHICLE_TYPES = ["ambulance", "small_car", "van", "truck", "bike"];

export default function AdminAmbulancePage() {
  const { user, isLoading } = useAuth();
  const [services, setServices] = useState<AmbulanceService[]>([]);
  const [requests, setRequests] = useState<AmbulanceRequest[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    providerType: "private",
    phone: "",
    alternatePhone: "",
    vehicleType: "",
    capacity: "",
    city: "",
    locationText: "",
  });
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [detecting, setDetecting] = useState(false);

  if (!isLoading && (!user || !["admin", "govt", "ngo", "hospital"].includes(user.role))) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <Card className="p-8">
          <h1 className="font-headline-lg text-on-surface">Admin Access Required</h1>
          <p className="text-sm text-on-surface-variant mt-2">You do not have permission to manage ambulance services.</p>
          <Link href="/dashboard"><Button variant="primary" className="mt-4">Back to dashboard</Button></Link>
        </Card>
      </div>
    );
  }

  const loadServices = async () => {
    setLoadingServices(true);
    try {
      const result = await api.request<AmbulanceService[]>("/ambulance/services");
      setServices(Array.isArray(result) ? result : []);
    } catch {
      setError("Failed to load ambulance services");
    } finally {
      setLoadingServices(false);
    }
  };

  const loadRequests = async () => {
    setLoadingRequests(true);
    try {
      const result = await api.request<AmbulanceRequest[]>("/ambulance/requests");
      setRequests(Array.isArray(result) ? result : []);
    } catch {
      setError("Failed to load ambulance requests");
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => { loadServices(); loadRequests(); }, []);

  const detectLocation = () => {
    setDetecting(true);
    navigator.geolocation?.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); setDetecting(false); },
      () => setDetecting(false)
    );
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        providerType: form.providerType,
        phone: form.phone,
        alternatePhone: form.alternatePhone || undefined,
        vehicleType: form.vehicleType || undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        city: form.city || undefined,
        locationText: form.locationText || undefined,
        isActive: true,
      };
      if (lat !== null && lng !== null) {
        payload.location = { latitude: lat, longitude: lng };
      }
      await api.request<any>("/ambulance/services", { method: "POST", body: JSON.stringify(payload) });
      setShowForm(false);
      setForm({ name: "", providerType: "private", phone: "", alternatePhone: "", vehicleType: "", capacity: "", city: "", locationText: "" });
      setLat(null);
      setLng(null);
      await loadServices();
    } catch (err: any) {
      setError(err?.message || "Failed to create service");
    } finally {
      setSubmitting(false);
    }
  };

  const updateRequestStatus = async (id: string, status: AmbulanceRequest["status"]) => {
    try {
      await api.request(`/ambulance/requests/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      await loadRequests();
    } catch {
      setError("Failed to update request");
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return r.id.toLowerCase().includes(q) || r.patientCondition?.toLowerCase().includes(q) || r.pickupLocationText?.toLowerCase().includes(q);
    }
    return true;
  });

  if (loadingServices || loadingRequests) return <PageSpinner label="Loading ambulance data..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-1 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors"><Ambulance className="w-4 h-4" /> Admin</Link>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-2">Ambulance Management</h1>
          <p className="text-sm text-on-surface-variant mt-1">Manage ambulance services and incoming requests.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => { loadServices(); loadRequests(); }} className="bg-surface-container-high">Refresh</Button>
          <Button variant="primary" onClick={() => setShowForm((v) => !v)}><Plus className="w-4 h-4" /> {showForm ? "Close Form" : "Add Service"}</Button>
        </div>
      </div>

      {showForm && (
        <Card className="p-5 sm:p-6">
          <h2 className="font-title-md text-title-md text-on-surface mb-4">Onboard Ambulance Service</h2>
          <form onSubmit={handleCreateService} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="mb-0">Service Name <span className="text-error">*</span></Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label className="mb-0">Provider Type <span className="text-error">*</span></Label>
                <select value={form.providerType} onChange={(e) => setForm((f) => ({ ...f, providerType: e.target.value }))} className="w-full bg-surface-container-low border-b-2 border-outline focus:border-primary focus:ring-0 focus:outline-none px-4 py-3 rounded-t-md font-body-md text-on-surface">
                  {PROVIDER_TYPES.map((pt) => <option key={pt} value={pt}>{pt}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="mb-0">Phone <span className="text-error">*</span></Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label className="mb-0">Alternate Phone</Label>
                <Input value={form.alternatePhone} onChange={(e) => setForm((f) => ({ ...f, alternatePhone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="mb-0">Vehicle Type</Label>
                <select value={form.vehicleType} onChange={(e) => setForm((f) => ({ ...f, vehicleType: e.target.value }))} className="w-full bg-surface-container-low border-b-2 border-outline focus:border-primary focus:ring-0 focus:outline-none px-4 py-3 rounded-t-md font-body-md text-on-surface">
                  <option value="">Select vehicle type</option>
                  {VEHICLE_TYPES.map((vt) => <option key={vt} value={vt}>{vt}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="mb-0">Capacity</Label>
                <Input type="number" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="mb-0">City</Label>
                <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="mb-0">Location Text</Label>
                <Input value={form.locationText} onChange={(e) => setForm((f) => ({ ...f, locationText: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="mb-0">Location Coordinates</Label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Input type="text" placeholder="Latitude" value={lat !== null ? lat.toFixed(6) : ""} readOnly className="rounded-md" />
                  <Input type="text" placeholder="Longitude" value={lng !== null ? lng.toFixed(6) : ""} readOnly className="rounded-md" />
                </div>
                <Button type="button" variant="ghost" onClick={detectLocation} disabled={detecting} className="bg-surface-container-high shrink-0">
                  <MapPin className="w-4 h-4" />
                  {detecting ? "Detecting..." : "Detect Location"}
                </Button>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting} variant="primary" size="lg" className="flex-1">
                {submitting ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Create Service"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {error && <div className="bg-error-container text-on-error-container p-4 rounded-md text-sm font-medium">{error}</div>}

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface">Ambulance Services</h2>
        {services.length === 0 ? (
          <Card className="p-5"><p className="text-sm text-on-surface-variant">No ambulance services configured.</p></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((s) => (
              <Card key={s.id} className="p-4 sm:p-5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-on-surface text-sm">{s.name}</h3>
                    <p className="text-xs text-on-surface-variant capitalize">{s.providerType} {s.vehicleType ? `• ${s.vehicleType}` : ""}</p>
                  </div>
                  <Badge variant={s.isActive ? "success" : "danger"} className="capitalize">{s.isActive ? "Active" : "Inactive"}</Badge>
                </div>
                <p className="text-xs text-on-surface-variant flex items-center gap-1"><Phone className="w-3 h-3" /> {s.phone}</p>
                {s.city && <p className="text-xs text-on-surface-variant flex items-center gap-1"><MapPin className="w-3 h-3" /> {s.city}</p>}
                {s.capacity && <p className="text-xs text-on-surface-variant">Capacity: {s.capacity}</p>}
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-title-md text-title-md text-on-surface">Incoming Requests</h2>
          <div className="flex gap-2">
            <div className="relative">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-9 bg-surface-container-low border-b-2 border-outline focus:border-primary focus:ring-0 focus:outline-none px-3 py-2 rounded-t-md font-body-md text-on-surface" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-surface-container-low border-b-2 border-outline focus:border-primary focus:ring-0 focus:outline-none px-3 py-2 rounded-t-md font-body-md text-on-surface">
              <option value="all">All</option>
              <option value="requested">Requested</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="dispatched">Dispatched</option>
              <option value="arrived">Arrived</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <Card className="p-8"><EmptyState icon={Ambulance} title="No ambulance requests" description="Requests will appear here when users book ambulances." /></Card>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((req) => (
              <Card key={req.id} className="p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-on-surface text-sm">Request #{req.id.slice(0, 8)}</h3>
                  <Badge variant={req.status === "completed" ? "success" : req.status === "cancelled" ? "danger" : "warning"} className="capitalize">{req.status}</Badge>
                </div>
                <p className="text-xs text-on-surface-variant">Created {new Date(req.createdAt).toLocaleString("en-IN")}</p>
                {req.patientCondition && <p className="text-xs text-on-surface-variant">Condition: {req.patientCondition}</p>}
                {req.pickupLocationText && <p className="text-xs text-on-surface-variant">Pickup: {req.pickupLocationText}</p>}
                {req.destinationLocationText && <p className="text-xs text-on-surface-variant">Destination: {req.destinationLocationText}</p>}
                <div className="flex flex-wrap gap-2 pt-1">
                  {(["acknowledged", "dispatched", "arrived", "completed", "cancelled"] as const).map((status) => (
                    <Button key={status} size="sm" variant={req.status === status ? "primary" : "ghost"} onClick={() => updateRequestStatus(req.id, status)} className="capitalize">
                      {status}
                    </Button>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
