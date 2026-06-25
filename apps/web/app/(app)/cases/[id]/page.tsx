"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Clock, MapPin, CheckCircle, AlertTriangle, Home, Activity } from "lucide-react";
import { api, Case, CaseEvent, CaseResponse, RecoveryRecord } from "../../../../lib/api";
import { useAuth } from "../../../../lib/auth";
import { formatDateTime } from "../../../../lib/utils";

const STATUS_COLORS: Record<string, string> = {
  open:         "bg-amber-100 text-amber-800 border-amber-200",
  in_review:    "bg-blue-100 text-blue-800 border-blue-200",
  action_taken: "bg-purple-100 text-purple-800 border-purple-200",
  resolved:     "bg-emerald-100 text-emerald-800 border-emerald-200",
  closed:       "bg-slate-100 text-slate-600 border-slate-200",
};

const PRIORITY_COLORS: Record<string, string> = {
  high:   "text-red-600 bg-red-50 border-red-200",
  medium: "text-amber-600 bg-amber-50 border-amber-200",
  low:    "text-slate-600 bg-slate-50 border-slate-200",
};

const RESPONDER_STATUS_LABELS: Record<string, string> = {
  en_route:   "En Route",     on_scene:  "On Scene",
  picked_up:  "Animal Picked Up", at_hospital: "At Hospital",
  completed:  "Completed",    abandoned: "Abandoned",
};

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

  if (loading) return (
    <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
  );
  if (!caseData) return (
    <div className="text-center py-20">
      <p className="text-slate-500">Case not found.</p>
      <Link href="/cases" className="text-primary font-bold mt-3 inline-block">← My Cases</Link>
    </div>
  );

  const canClaim = user && caseData.status === "open" && !response && !claimSuccess;

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/cases" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary font-semibold">
        <ChevronLeft className="w-4 h-4" /> All Cases
      </Link>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${STATUS_COLORS[caseData.status] ?? "bg-slate-100 text-slate-600"}`}>
                {caseData.status.replace("_", " ")}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${PRIORITY_COLORS[caseData.priority]}`}>
                {caseData.priority} priority
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 capitalize">
                {caseData.caseType.replace("_", " ")}
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-800 leading-snug">{caseData.title}</h1>
            {caseData.locationText && (
              <p className="text-sm text-slate-500 mt-2 flex items-center gap-1.5"><MapPin className="w-4 h-4" />{caseData.locationText}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-slate-400 flex items-center justify-end gap-1"><Clock className="w-3 h-3" />{formatDateTime(caseData.createdAt)}</p>
            {caseData.animalId && (
              <Link href={`/animals/${caseData.animalId}`} className="text-xs text-primary font-bold mt-2 inline-block hover:underline">View Animal →</Link>
            )}
          </div>
        </div>
        {caseData.description && (
          <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl">{caseData.description}</p>
        )}
        {caseData.evidenceUrls && caseData.evidenceUrls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {caseData.evidenceUrls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer"
                className="text-xs text-primary font-bold hover:underline bg-primary-light px-3 py-1.5 rounded-lg">
                Evidence {i + 1} ↗
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Claim button */}
      {canClaim && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-bold text-amber-800">This case needs a responder</p>
            <p className="text-sm text-amber-700 mt-0.5">Claim it to let others know you&apos;re on your way</p>
          </div>
          <button onClick={handleClaim} disabled={claiming}
            className="bg-accent hover:bg-orange-700 text-white font-bold px-6 py-3 rounded-xl text-sm flex items-center gap-2 transition-colors shrink-0">
            {claiming ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
            {claiming ? "Claiming..." : "Claim & Respond"}
          </button>
        </div>
      )}
      {error && <div className="bg-red-50 text-red-700 border border-red-200 p-4 rounded-xl text-sm">{error}</div>}

      {/* Active Response */}
      {response && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Active Response
          </h3>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold shrink-0">
              {(response.responderName ?? "R").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-800 text-sm">{response.responderName ?? "Responder"}</p>
              <p className="text-xs text-slate-500 mt-0.5">{RESPONDER_STATUS_LABELS[response.status] ?? response.status}</p>
              {response.notes && <p className="text-xs text-slate-400 mt-1">{response.notes}</p>}
            </div>
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
              response.status === "completed" ? "bg-emerald-100 text-emerald-700" :
              response.status === "abandoned" ? "bg-red-100 text-red-700" :
              "bg-blue-100 text-blue-700"}`}>
              {response.status.replace("_", " ")}
            </span>
          </div>
          {claimSuccess && (
            <Link href={`/respond/${caseData.id}`}
              className="mt-4 w-full bg-primary text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-emerald-800 transition-colors">
              Go to Response Dashboard →
            </Link>
          )}
        </div>
      )}

      {/* Recovery */}
      {recovery.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Home className="w-4 h-4 text-primary" /> Recovery Status
          </h3>
          <div className="space-y-3">
            {recovery.map(rec => (
              <div key={rec.id} className="bg-slate-50 rounded-xl p-4 flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full shrink-0 ${rec.status === "completed" ? "bg-emerald-400" : "bg-amber-400"}`} />
                <div className="flex-1">
                  <p className="font-bold text-slate-800 text-sm capitalize">{rec.providerType.replace("_"," ")}</p>
                  {rec.providerName && <p className="text-xs text-slate-500">{rec.providerName}</p>}
                  <p className="text-xs text-slate-400 mt-0.5">₹{rec.dailyCostInr}/day · Started {new Date(rec.startDate).toLocaleDateString("en-IN")}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${rec.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {rec.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-5 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" /> Case Timeline
        </h3>
        {events.length > 0 ? (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-100" />
            <div className="space-y-5">
              {events.map((event, i) => (
                <div key={event.id} className="flex gap-4 relative">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${i === 0 ? "bg-primary text-white" : "bg-slate-100 text-slate-500"}`}>
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div className="flex-1 pb-2">
                    <p className="font-bold text-slate-800 text-sm capitalize">
                      {(event.eventType ?? "Update").replace(/_/g, " ")}
                    </p>
                    {event.notes && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{event.notes}</p>}
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />{formatDateTime(event.createdAt)}
                      {event.actorRole && <span className="ml-2 capitalize">{event.actorRole}</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-8">No events recorded yet.</p>
        )}
      </div>
    </div>
  );
}
