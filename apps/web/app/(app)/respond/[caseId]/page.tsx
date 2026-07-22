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
import { api, Case, CaseResponse } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Textarea, Label } from "@/components/ui/Input";
import { PageSpinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import { HorizontalStepper, type StepItem } from "@/components/ui/Stepper";

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
    return <PageSpinner label="Loading mission file..." />;
  }

  if (error || !caseRecord || !activeClaim) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <AlertTriangle className="w-16 h-16 text-error mx-auto mb-4" />
        <h2 className="text-xl font-bold text-on-surface">{error || "Claim Error"}</h2>
        <Link href="/respond" className="text-primary font-bold hover:underline mt-4 block">
          &larr; Back to Dispatch Board
        </Link>
      </div>
    );
  }

  const currentStepIndex = STEPS.findIndex((s) => s.key === activeClaim.status);

  const stepperSteps: StepItem[] = STEPS.map((step, index) => ({
    key: step.key,
    label: step.label,
    state: index < currentStepIndex ? "done" : index === currentStepIndex ? "active" : "pending",
  }));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <div>
        <Link href={`/cases/${caseRecord.id}`} className="inline-flex items-center gap-1 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors duration-150 ease-out">
          <ChevronLeft className="w-4 h-4" /> View Case File
        </Link>
      </div>

      <Card className="p-6 sm:p-8 shadow-xl space-y-8">
        <div>
          <Badge variant="primary" className="mb-3">
            <Activity className="w-3.5 h-3.5" /> Active Transit Mission
          </Badge>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface tracking-tight leading-tight">
            {caseRecord.title}
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">Incident Landmark: {caseRecord.locationText || "Pinpoint Map Coordinates"}</p>
        </div>

        {error && (
          <div className="bg-error-container text-on-error-container p-4 rounded-xl text-xs font-semibold border border-error/20">
            {error}
          </div>
        )}

        {/* Progress Timeline Stepper */}
        <HorizontalStepper steps={stepperSteps} />

        <hr className="border-outline-variant" />

        {/* Transit Status Controls */}
        <div className="space-y-6">
          <h3 className="font-bold text-on-surface text-sm flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" /> Update Mission Progress
          </h3>

          <div className="space-y-4">
            <div>
              <Label>Progress / Log Notes (Optional)</Label>
              <Textarea
                placeholder="e.g. Captured dog safely, transporting to hospital clinic now..."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded-md"
              />
            </div>

            {/* Next stage button */}
            {currentStepIndex < STEPS.length - 1 && (
              <div className="flex gap-3 flex-wrap">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => handleUpdateStatus(STEPS[currentStepIndex + 1].key)}
                  disabled={updating}
                  className="flex-1"
                >
                  {updating ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    `Advance to: ${STEPS[currentStepIndex + 1].label}`
                  )}
                </Button>

                <Button
                  variant="danger"
                  size="lg"
                  onClick={() => setShowAbandonDialog(true)}
                  disabled={updating}
                >
                  <Ban className="w-4 h-4" /> Abandon Claim
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Abandon Dialog */}
        <Modal open={showAbandonDialog} onClose={() => setShowAbandonDialog(false)} title="Abandon Response Claim">
          <div className="space-y-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-6 h-6 text-error shrink-0" />
              <p className="text-on-surface-variant text-xs leading-relaxed">
                Provide a reason for relinquishing the rescue case. This will place the case back on the active open SOS board for other responders to claim.
              </p>
            </div>
            <div>
              <Textarea
                placeholder="e.g. Mechanical breakdown, vehicle issue, unable to locate landmark..."
                rows={3}
                value={abandonReason}
                onChange={(e) => setAbandonReason(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 bg-surface-container-high" onClick={() => setShowAbandonDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => void handleAbandon()}
                disabled={updating || !abandonReason}
              >
                {updating ? "Abandoning..." : "Abandon Case"}
              </Button>
            </div>
          </div>
        </Modal>
      </Card>
    </div>
  );
}
