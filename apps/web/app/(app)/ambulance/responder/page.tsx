"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Ambulance, MapPin, Phone, RefreshCcw, Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

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

type AmbulanceService = {
  id: string;
  name: string;
  phone: string;
};

export default function AmbulanceResponderPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<AmbulanceRequest[]>([]);
  const [service, setService] = useState<AmbulanceService | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [allRequests, services] = await Promise.all([
        api.listAmbulanceRequests(),
        api.listAmbulanceServices(),
      ]);
      const myService = (services as AmbulanceService[] | undefined)?.find((s) => s.id === user.ambulanceServiceId) ?? null;
      setService(myService);
      setRequests(Array.isArray(allRequests) ? allRequests : []);
    } catch {
      setError("Failed to load responder data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, [user]);

  const openRequests = requests.filter((r) => r.status === "requested");
  const activeRequests = requests.filter((r) => ["acknowledged", "dispatched", "arrived"].includes(r.status));
  const pastRequests = requests.filter((r) => ["completed", "cancelled"].includes(r.status));

  const handleAccept = async (id: string) => {
    setActionId(id);
    setError(null);
    try {
      await api.updateAmbulanceRequest(id, {
        status: "acknowledged",
        serviceId: user?.ambulanceServiceId ?? undefined,
        assignedToUserId: user?.id,
      });
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to accept request");
    } finally {
      setActionId(null);
    }
  };

  const updateStatus = async (id: string, status: AmbulanceRequest["status"]) => {
    setActionId(id);
    setError(null);
    try {
      await api.updateAmbulanceRequest(id, { status });
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to update status");
    } finally {
      setActionId(null);
    }
  };

  if (!user?.ambulanceServiceId) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-2">
          <Ambulance className="w-6 h-6 text-primary" /> Responder Portal
        </h1>
        <Card className="p-6">
          <p className="text-sm text-on-surface-variant">Your account is not linked to an ambulance service. Please contact your administrator to assign you to a service.</p>
          <Link href="/dashboard"><Button variant="primary" className="mt-4">Back to Dashboard</Button></Link>
        </Card>
      </div>
    );
  }

  if (loading) return <PageSpinner label="Loading responder data..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-2">
            <Ambulance className="w-6 h-6 text-primary" /> Responder Portal
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">{service?.name ?? "Ambulance Service"} • Respond to incoming ambulance requests.</p>
        </div>
        <Button variant="ghost" onClick={loadData} className="bg-surface-container-high"><RefreshCcw className="w-4 h-4" /> Refresh</Button>
      </div>

      {error && <div className="bg-error-container text-on-error-container p-4 rounded-md text-sm font-medium">{error}</div>}

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface">Open Requests ({openRequests.length})</h2>
        {openRequests.length === 0 ? (
          <Card className="p-6"><p className="text-sm text-on-surface-variant">No open ambulance requests right now.</p></Card>
        ) : (
          <div className="space-y-3">
            {openRequests.map((req) => (
              <Card key={req.id} className="p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-on-surface text-sm">Request #{req.id.slice(0, 8)}</h3>
                  <Badge variant="warning" className="capitalize">{req.status}</Badge>
                  {req.caseId && <Badge variant="neutral">Case {req.caseId.slice(0, 8)}</Badge>}
                </div>
                <p className="text-xs text-on-surface-variant">Created {new Date(req.createdAt).toLocaleString("en-IN")}</p>
                {req.patientCondition && <p className="text-xs text-on-surface-variant">Condition: {req.patientCondition}</p>}
                {req.pickupLocationText && <p className="text-xs text-on-surface-variant flex items-center gap-1"><MapPin className="w-3 h-3" /> {req.pickupLocationText}</p>}
                {req.destinationLocationText && <p className="text-xs text-on-surface-variant">Destination: {req.destinationLocationText}</p>}
                {req.notes && <p className="text-xs text-on-surface-variant">Notes: {req.notes}</p>}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="primary" onClick={() => handleAccept(req.id)} disabled={actionId === req.id}>
                    {actionId === req.id ? "Accepting..." : "Accept Request"}
                  </Button>
                  {req.serviceId && req.serviceId !== user.ambulanceServiceId && (
                    <span className="text-xs text-on-surface-variant self-center">Assigned to another service</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface">Active Responses ({activeRequests.length})</h2>
        {activeRequests.length === 0 ? (
          <Card className="p-6"><p className="text-sm text-on-surface-variant">No active responses.</p></Card>
        ) : (
          <div className="space-y-3">
            {activeRequests.map((req) => (
              <Card key={req.id} className="p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-on-surface text-sm">Request #{req.id.slice(0, 8)}</h3>
                  <Badge variant="warning" className="capitalize">{req.status}</Badge>
                </div>
                <p className="text-xs text-on-surface-variant">Updated {new Date(req.updatedAt).toLocaleString("en-IN")}</p>
                {req.pickupLocationText && <p className="text-xs text-on-surface-variant flex items-center gap-1"><MapPin className="w-3 h-3" /> {req.pickupLocationText}</p>}
                <div className="flex flex-wrap gap-2 pt-1">
                  {(["dispatched", "arrived", "completed", "cancelled"] as const).map((status) => (
                    <Button key={status} size="sm" variant={req.status === status ? "primary" : "ghost"} onClick={() => updateStatus(req.id, status)} disabled={actionId === req.id} className="capitalize">
                      {status}
                    </Button>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface">Past ({pastRequests.length})</h2>
        {pastRequests.length === 0 ? (
          <Card className="p-6"><p className="text-sm text-on-surface-variant">No past requests.</p></Card>
        ) : (
          <div className="space-y-3">
            {pastRequests.map((req) => (
              <Card key={req.id} className="p-4 sm:p-5 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-on-surface text-sm">Request #{req.id.slice(0, 8)}</h3>
                  <Badge variant={req.status === "completed" ? "success" : "danger"} className="capitalize">{req.status}</Badge>
                </div>
                <p className="text-xs text-on-surface-variant">Updated {new Date(req.updatedAt).toLocaleString("en-IN")}</p>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
