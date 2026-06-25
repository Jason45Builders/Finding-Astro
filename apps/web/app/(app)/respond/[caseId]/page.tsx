"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Navigation,
  CheckCircle,
  Truck,
  HeartPulse,
  Ban,
  Activity,
  ClipboardList,
  AlertTriangle
} from "lucide-react";
import { api, Case, CaseResponse } from "../../../../lib/api";

const STEPS = [
  { key: "en_route", label: "En Route", icon: Navigation, desc: "Responder is travelling to the pinned location" },
  { key: "on_scene", label: "On Scene", icon: Truck, desc: "Responder has reached the incident site" },
  { key: "picked_up", label: "Picked Up", icon: Activity, desc: "Stray animal is safely secured inside transport" },
  { key: "at_hospital", label: "At Hospital", icon: HeartPulse, desc: "Animal is admitted to partner vet clinic" },
  { key: "completed", label: "Completed", icon: CheckCircle, desc: "Rescue operation resolved successfully" },
];

export default function ActiveResponsePage() {
  const params = useParams<{ caseId: string }>();
  const router = useRouter();

  const [caseRecord, setCaseRecord] = useState<Case | null>(null);
  const [activeClaim, setActiveClaim] = useState<CaseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Abandon state
  const [showAbandonDialog, setShowAbandonDialog] = useState(false);
  const [abandonReason, setAbandonReason] = useState("");

  const loadData = async () => {
    if (!params?.caseId) return;
    try {
      const record = await api.getCase(params.caseId);
      setCaseRecord(record);

      const claim = await api.getActiveResponse(params.caseId);
      setActiveClaim(claim);
    } catch (err) {
      console.error("Failed to load active response data", err);
      setError("Unable to find active claim file.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [params?.caseId]);

  const handleUpdateStatus = async (statusKey: string) => {
    if (!params?.caseId) return;
    setUpdating(true);
    setError(null);
    try {
      const claim = await api.updateResponderStatus(params.caseId, statusKey, notes);
      setActiveClaim(claim);
      setNotes("");
      if (statusKey === "completed") {
        router.push(`/cases/${params.caseId}`);
      } else {
        await loadData();
      }
    } catch (err: any) {
      setError(err?.message || "Failed to update responder status");
    } finally {
      setUpdating(false);
    }
  };

  const handleAbandon = async () => {
    if (!params?.caseId || !abandonReason) return;
    setUpdating(true);
    setError(null);
    try {
      await api.abandonClaim(params.caseId, abandonReason);
      router.push("/respond");
    } catch (err: any) {
      setError(err?.message || "Failed to abandon response claim");
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !caseRecord || !activeClaim) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800">{error || "Claim Error"}</h2>
        <Link href="/respond" className="text-primary font-bold hover:underline mt-4 block">
          &larr; Back to Dispatch Board
        </Link>
      </div>
    );
  }

  const currentStepIndex = STEPS.findIndex((s) => s.key === activeClaim.status);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <div>
        <Link href={`/cases/${caseRecord.id}`} className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-850">
          <ChevronLeft className="w-4 h-4" /> View Case File
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-8">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-primary mb-3">
            <Activity className="w-3.5 h-3.5" /> Active Transit Mission
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-850 tracking-tight leading-tight">
            {caseRecord.title}
          </h1>
          <p className="text-slate-500 text-sm mt-1">Incident Landmark: {caseRecord.locationText || "Pinpoint Map Coordinates"}</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-650 p-4 rounded-xl text-xs font-semibold border border-red-155">
            {error}
          </div>
        )}

        {/* Progress Timeline Stepper */}
        <div className="relative flex flex-col md:flex-row justify-between gap-6 md:gap-2">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            return (
              <div key={step.key} className="flex-1 flex flex-row md:flex-col items-center gap-3 relative text-center">
                {/* Stepper node */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isCompleted
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-slate-400 border-slate-200"
                  } ${isCurrent ? "ring-4 ring-emerald-100" : ""}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                {/* Stepper label */}
                <div className="text-left md:text-center min-w-0 flex-1">
                  <p className={`text-xs font-bold ${isCompleted ? "text-primary" : "text-slate-450"}`}>
                    {step.label}
                  </p>
                  <p className="text-[10px] text-slate-400 leading-normal mt-0.5 max-w-[120px] md:mx-auto hidden md:block">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <hr className="border-slate-100" />

        {/* Transit Status Controls */}
        <div className="space-y-6">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" /> Update Mission Progress
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                Progress / Log Notes (Optional)
              </label>
              <textarea
                placeholder="e.g. Captured dog safely, transporting to hospital clinic now..."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
              />
            </div>

            {/* Next stage button */}
            {currentStepIndex < STEPS.length - 1 && (
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => handleUpdateStatus(STEPS[currentStepIndex + 1].key)}
                  disabled={updating}
                  className="flex-1 bg-primary hover:bg-emerald-800 text-white font-extrabold py-3.5 px-6 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {updating ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    `Advance to: ${STEPS[currentStepIndex + 1].label}`
                  )}
                </button>

                <button
                  onClick={() => setShowAbandonDialog(true)}
                  disabled={updating}
                  className="bg-red-50 hover:bg-red-100 text-red-650 font-bold py-3.5 px-6 rounded-xl text-sm transition-colors border border-red-100 flex items-center gap-1"
                >
                  <Ban className="w-4 h-4" /> Abandon Claim
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Abandon Dialog */}
        {showAbandonDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
              <h4 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                <AlertTriangle className="w-5.5 h-5.5 text-red-500" /> Abandon Response Claim
              </h4>
              <p className="text-slate-650 text-xs leading-relaxed">
                Provide a reason for relinquishing the rescue case. This will place the case back on the active open SOS board for other responders to claim.
              </p>
              <div>
                <textarea
                  placeholder="e.g. Mechanical breakdown, vehicle issue, unable to locate landmark..."
                  rows={3}
                  value={abandonReason}
                  onChange={(e) => setAbandonReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAbandonDialog(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleAbandon()}
                  disabled={updating || !abandonReason}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-xs transition-colors"
                >
                  {updating ? "Abandoning..." : "Abandon Case"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
