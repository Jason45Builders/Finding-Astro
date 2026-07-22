"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Clock, MapPin, AlertTriangle, Home, Activity } from "lucide-react";
import { api, Case, CaseEvent, CaseResponse, RecoveryRecord } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { VerticalStepper, type StepItem } from "@/components/ui/Stepper";
import { statusToken } from "@/lib/status";

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [events, setEvents] = useState<CaseEvent[]>([]);
  const [response, setResponse] = useState<CaseResponse | null>(null);
  const [recovery, setRecovery] = useState<RecoveryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    const load = async () => {
      setLoading(true);
      const [c, ev, rec] = await Promise.allSettled([
        api.getCase(params.id),
        api.getCaseEvents(params.id),
        api.getCaseRecovery(params.id),
      ]);
      if (c.status   === "fulfilled") setCaseData(c.value);
      if (ev.status  === "fulfilled") setEvents(ev.value);
      if (rec.status === "fulfilled") setRecovery(rec.value);

      try {
        const resp = await api.getActiveResponse(params.id);
        setResponse(resp);
      } catch { /* no active response */ }

      setLoading(false);
    };
    load();
  }, [params?.id]);

  const handleClaim = async () => {
    if (!user || !caseData) return;
    setClaiming(true); setError(null);
    try {
      const resp = await api.claimCase(caseData.id);
      setResponse(resp);
      setClaimSuccess(true);
      setCaseData(prev => prev ? { ...prev, status: "in_review" } : prev);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to claim case");
    } finally { setClaiming(false); }
  };

  if (loading) return <PageSpinner label="Loading case file..." />;
  if (!caseData) return (
    <div className="text-center py-20">
      <p className="text-on-surface-variant">Case not found.</p>
      <Link href="/cases" className="text-primary font-bold mt-3 inline-block">← My Cases</Link>
    </div>
  );

  const canClaim = user && caseData.status === "open" && !response && !claimSuccess;

  const timelineSteps: StepItem[] = events.map((event, i) => ({
    key: event.id,
    label: (event.eventType ?? "Update").replace(/_/g, " "),
    detail: (
      <>
        {event.notes && <span className="block">{event.notes}</span>}
        <span className="flex items-center gap-1 mt-0.5">
          <Clock className="w-3 h-3" />{formatDateTime(event.createdAt)}
          {event.actorRole && <span className="capitalize">· {event.actorRole}</span>}
        </span>
      </>
    ),
    state: i === 0 ? "active" : "done",
  }));

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/cases" className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary font-bold transition-colors duration-150 ease-out">
        <ChevronLeft className="w-4 h-4" /> All Cases
      </Link>

      {/* Header */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <StatusBadge token={statusToken.caseStatus(caseData.status)} />
              <StatusBadge token={statusToken.casePriority(caseData.priority)} />
              <StatusBadge token={statusToken.caseType(caseData.caseType)} />
            </div>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface leading-snug">{caseData.title}</h1>
            {caseData.locationText && (
              <p className="text-sm text-on-surface-variant mt-2 flex items-center gap-1.5"><MapPin className="w-4 h-4" />{caseData.locationText}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-outline flex items-center justify-end gap-1"><Clock className="w-3 h-3" />{formatDateTime(caseData.createdAt)}</p>
            {caseData.animalId && (
              <Link href={`/animals/${caseData.animalId}`} className="text-xs text-primary font-bold mt-2 inline-block hover:underline">View Animal →</Link>
            )}
          </div>
        </div>
        {caseData.description && (
          <p className="text-sm text-on-surface-variant leading-relaxed bg-surface-container-low p-4 rounded-xl">{caseData.description}</p>
        )}
        {caseData.evidenceUrls && caseData.evidenceUrls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {caseData.evidenceUrls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer"
                className="text-xs text-primary font-bold hover:underline bg-primary-container px-3 py-1.5 rounded-md transition-colors duration-150 ease-out">
                Evidence {i + 1} ↗
              </a>
            ))}
          </div>
        )}
      </Card>

      {/* Claim button */}
      {canClaim && (
        <div className="bg-secondary-container border border-secondary/20 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-bold text-on-secondary-container">This case needs a responder</p>
            <p className="text-sm text-on-secondary-container/80 mt-0.5">Claim it to let others know you&apos;re on your way</p>
          </div>
          <Button variant="coral" onClick={handleClaim} disabled={claiming} className="shrink-0">
            {claiming ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
            {claiming ? "Claiming..." : "Claim & Respond"}
          </Button>
        </div>
      )}
      {error && <div className="bg-error-container text-on-error-container p-4 rounded-xl text-sm font-medium">{error}</div>}

      {/* Active Response */}
      {response && (
        <Card className="p-5">
          <h3 className="font-bold text-on-surface mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Active Response
          </h3>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold shrink-0">
              {(response.responderName ?? "R").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-bold text-on-surface text-sm">{response.responderName ?? "Responder"}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">{statusToken.responderStatus(response.status).label}</p>
              {response.notes && <p className="text-xs text-outline mt-1">{response.notes}</p>}
            </div>
            <StatusBadge token={statusToken.responderStatus(response.status)} />
          </div>
          {claimSuccess && (
            <Link href={`/respond/${caseData.id}`}>
              <Button variant="primary" className="mt-4 w-full">Go to Response Dashboard →</Button>
            </Link>
          )}
        </Card>
      )}

      {/* Recovery */}
      {recovery.length > 0 && (
        <Card className="p-5">
          <h3 className="font-bold text-on-surface mb-4 flex items-center gap-2">
            <Home className="w-4 h-4 text-primary" /> Recovery Status
          </h3>
          <div className="space-y-3 animate-stagger">
            {recovery.map(rec => (
              <div key={rec.id} className="bg-surface-container-low rounded-xl p-4 flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full shrink-0 ${rec.status === "completed" ? "bg-green-400" : "bg-amber-400"}`} />
                <div className="flex-1">
                  <p className="font-bold text-on-surface text-sm capitalize">{rec.providerType.replace("_"," ")}</p>
                  {rec.providerName && <p className="text-xs text-on-surface-variant">{rec.providerName}</p>}
                  <p className="text-xs text-outline mt-0.5">₹{rec.dailyCostInr}/day · Started {new Date(rec.startDate).toLocaleDateString("en-IN")}</p>
                </div>
                <Badge variant={rec.status === "completed" ? "success" : "warning"}>{rec.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Timeline */}
      <Card className="p-5">
        <h3 className="font-bold text-on-surface mb-5 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" /> Case Timeline
        </h3>
        {timelineSteps.length > 0 ? (
          <VerticalStepper steps={timelineSteps} />
        ) : (
          <EmptyState icon={Clock} title="No events recorded yet" />
        )}
      </Card>
    </div>
  );
}
