"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Ambulance, MapPin, Phone, Plus, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

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

export default function AmbulancePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [services, setServices] = useState<AmbulanceService[]>([]);
  const [myRequests, setMyRequests] = useState<AmbulanceRequest[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  const loadServices = async () => {
    setLoadingServices(true);
    try {
      const result = await api.request<AmbulanceService[]>("/ambulance/services");
      setServices(Array.isArray(result) ? result : []);
    } catch {
      setServices([]);
    } finally {
      setLoadingServices(false);
    }
  };

  const loadRequests = async () => {
    if (!user) return;
    setLoadingRequests(true);
    try {
      const result = await api.request<AmbulanceRequest[]>("/ambulance/requests");
      setMyRequests(Array.isArray(result) ? result : []);
    } catch {
      setMyRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => { loadServices(); }, []);
  useEffect(() => { loadRequests(); }, [user]);

  const filteredServices = services.filter((s) => {
    if (!s.isActive) return false;
    if (search.trim() && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (cityFilter && s.city !== cityFilter) return false;
    return true;
  });

  const cities = Array.from(new Set(services.map((s) => s.city).filter(Boolean))) as string[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-2">
            <Ambulance className="w-6 h-6 text-primary" /> Ambulance Services
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">Find and request animal ambulance services near you.</p>
        </div>
        <Button variant="primary" onClick={() => router.push("/ambulance/request")} className="w-full sm:w-auto">
          <Plus className="w-4 h-4" /> Request Ambulance
        </Button>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search services..." className="pl-9" />
          </div>
          <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="bg-surface-container-low border-b-2 border-outline focus:border-primary focus:ring-0 focus:outline-none px-3 py-2 rounded-t-md font-body-md text-on-surface">
            <option value="">All cities</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </Card>

      {loadingServices ? (
        <PageSpinner label="Loading ambulance services..." />
      ) : filteredServices.length === 0 ? (
        <Card className="p-8"><EmptyState icon={Ambulance} title="No ambulance services found" description="Try adjusting filters or check back later." /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service) => (
            <Card key={service.id} className="p-4 sm:p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-on-surface">{service.name}</h3>
                  <p className="text-xs text-on-surface-variant capitalize">{service.providerType} {service.vehicleType ? `• ${service.vehicleType}` : ""}</p>
                </div>
                <Badge variant={service.providerType === "government" ? "primary" : "neutral"} className="capitalize">{service.providerType}</Badge>
              </div>
              <div className="space-y-1 text-xs text-on-surface-variant">
                <div className="flex items-center gap-1"><Phone className="w-3 h-3" /> {service.phone}</div>
                {service.city && <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {service.city}</div>}
                {service.capacity && <div>Capacity: {service.capacity}</div>}
              </div>
              <Button variant="primary" size="sm" className="w-full" onClick={() => router.push(`/ambulance/request?serviceId=${service.id}`)}>
                Request This Service
              </Button>
            </Card>
          ))}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface">My Ambulance Requests</h2>
        {loadingRequests ? (
          <PageSpinner label="Loading requests..." />
        ) : myRequests.length === 0 ? (
          <Card className="p-6 text-sm text-on-surface-variant">You haven&apos;t made any ambulance requests yet.</Card>
        ) : (
          <div className="space-y-3">
            {myRequests.map((req) => (
              <Card key={req.id} className="p-4 sm:p-5 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-on-surface text-sm">Request #{req.id.slice(0, 8)}</h3>
                  <Badge variant={req.status === "completed" ? "success" : req.status === "cancelled" ? "danger" : "warning"} className="capitalize">{req.status}</Badge>
                </div>
                <p className="text-xs text-on-surface-variant">Created {new Date(req.createdAt).toLocaleString("en-IN")}</p>
                {req.patientCondition && <p className="text-xs text-on-surface-variant">Condition: {req.patientCondition}</p>}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Link href={`/cases/${req.caseId ?? ""}`}><Button size="sm" variant="ghost">View Case</Button></Link>
                  <Link href={`/ambulance/request?serviceId=${req.serviceId ?? ""}`}><Button size="sm" variant="ghost">New Request</Button></Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
