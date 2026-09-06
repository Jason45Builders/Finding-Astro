"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Search, CheckCircle, XCircle, Clock, FileText, Eye } from "lucide-react";
import { api, AdoptionApplication, Animal } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime, cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSpinner } from "@/components/ui/Spinner";
import { statusToken } from "@/lib/status";

type StatusFilter = "all" | "pending_review" | "approved" | "trial" | "adopted" | "rejected";

export default function AdoptionAdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<AdoptionApplication[]>([]);
  const [animals, setAnimals] = useState<Record<string, Animal>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedApp, setSelectedApp] = useState<AdoptionApplication | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | "start-trial" | "complete-trial" | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [adoptionFee, setAdoptionFee] = useState(0);
  const [trialDays, setTrialDays] = useState(14);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isStaff = ["admin", "govt", "ngo", "hospital"].includes(user?.role || "");

  useEffect(() => {
    if (!isStaff) { router.push("/adopt"); return; }
    loadApplications();
  }, [isStaff, router]);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const apps = await api.listAllAdoptionApplications();
      setApplications(apps);
      const animalIds = [...new Set(apps.map(a => a.animalId))];
      const animalMap: Record<string, Animal> = {};
      await Promise.all(animalIds.map(async id => {
        try {
          const animal = await api.getAnimal(id);
          animalMap[id] = animal;
        } catch { /* ignore */ }
      }));
      setAnimals(animalMap);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const filtered = applications.filter(app => {
    const matchStatus = statusFilter === "all" || app.status === statusFilter;
    const animal = animals[app.animalId];
    const matchSearch = !search ||
      app.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (animal?.name && animal.name.toLowerCase().includes(search.toLowerCase())) ||
      (animal?.species && animal.species.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch;
  });

  const openReview = (app: AdoptionApplication, action: "approve" | "reject" | "start-trial" | "complete-trial") => {
    setSelectedApp(app);
    setReviewAction(action);
    setReviewNotes("");
    setRejectionReason("");
    setAdoptionFee(0);
    setTrialDays(14);
    setError(null);
    setShowReviewModal(true);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp || !reviewAction) return;
    setSubmitting(true); setError(null);
    try {
      if (reviewAction === "approve") {
        await api.approveAdoptionApplication(selectedApp.id, { reviewNotes, adoptionFeeInr: adoptionFee });
      } else if (reviewAction === "reject") {
        if (!rejectionReason.trim()) { setError("Rejection reason is required"); setSubmitting(false); return; }
        await api.rejectAdoptionApplication(selectedApp.id, { reviewNotes, rejectionReason });
      } else if (reviewAction === "start-trial") {
        await api.startAdoptionTrial(selectedApp.id, trialDays, reviewNotes);
      } else if (reviewAction === "complete-trial") {
        await api.completeAdoptionTrial(selectedApp.id);
      }
      setShowReviewModal(false);
      await loadApplications();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally { setSubmitting(false); }
  };

  const statusCounts = {
    all: applications.length,
    pending_review: applications.filter(a => a.status === "pending_review").length,
    approved: applications.filter(a => a.status === "approved").length,
    trial: applications.filter(a => a.status === "trial").length,
    adopted: applications.filter(a => a.status === "adopted").length,
    rejected: applications.filter(a => a.status === "rejected").length,
  };

  if (!isStaff) {
    return <div className="p-6 text-center text-outline">You do not have permission to view this page.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-on-surface tracking-tight flex items-center gap-2">
          <Heart className="w-6 h-6 text-secondary" /> Adoption Review
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">Review and manage adoption applications</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-outline pointer-events-none" />
          <Input type="text" placeholder="Search by applicant name or animal..." value={search}
            onChange={e => setSearch(e.target.value)} className="pl-9 rounded-md" />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {(["all", "pending_review", "approved", "trial", "adopted", "rejected"] as StatusFilter[]).map(status => (
          <button key={status} onClick={() => setStatusFilter(status)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
              statusFilter === status ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container"
            )}>
            {status === "all" ? "All" : status.replace("_", " ")}
            <span className="ml-1.5 opacity-75">({statusCounts[status]})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <PageSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Heart} title="No adoption applications found." />
      ) : (
        <div className="space-y-4 animate-stagger">
          {filtered.map(app => {
            const animal = animals[app.animalId];
            const token = statusToken.adoptionStatus(app.status);
            return (
              <Card key={app.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge token={token} />
                      <span className="text-xs text-outline font-mono">{app.id.slice(0, 8)}</span>
                    </div>
                    <p className="text-sm font-bold text-on-surface">
                      {animal ? `${animal.name || "Unnamed"} (${animal.species})` : `Animal ${app.animalId.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Applicant: <span className="font-semibold">{app.fullName}</span> · {app.phone}
                    </p>
                    <p className="text-xs text-outline mt-1">Submitted {formatDateTime(app.createdAt)}</p>
                    {app.reviewNotes && (
                      <p className="text-xs text-on-surface-variant mt-2 bg-surface-container-low p-2 rounded-md">{app.reviewNotes}</p>
                    )}
                    {app.rejectionReason && (
                      <p className="text-xs text-error mt-2 bg-error-container/30 p-2 rounded-md">Reason: {app.rejectionReason}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/animals/${app.animalId}`)}>
                      <Eye className="w-4 h-4 mr-1" /> View Animal
                    </Button>
                    {app.status === "pending_review" && (
                      <>
                        <Button variant="primary" size="sm" onClick={() => openReview(app, "approve")}>
                          <CheckCircle className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openReview(app, "reject")}>
                          <XCircle className="w-4 h-4 mr-1" /> Reject
                        </Button>
                      </>
                    )}
                    {app.status === "approved" && (
                      <Button variant="primary" size="sm" onClick={() => openReview(app, "start-trial")}>
                        <Clock className="w-4 h-4 mr-1" /> Start Trial
                      </Button>
                    )}
                    {app.status === "trial" && (
                      <Button variant="primary" size="sm" onClick={() => openReview(app, "complete-trial")}>
                        <CheckCircle className="w-4 h-4 mr-1" /> Complete Trial
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={showReviewModal && !!selectedApp} onClose={() => setShowReviewModal(false)} title={
        reviewAction === "approve" ? "Approve Application" :
        reviewAction === "reject" ? "Reject Application" :
        reviewAction === "start-trial" ? "Start Trial Period" :
        reviewAction === "complete-trial" ? "Complete Trial" : "Review Application"
      }>
        {error && <div className="bg-error-container text-on-error-container p-3 rounded-md text-sm mb-4">{error}</div>}
        <form onSubmit={handleReviewSubmit} className="space-y-4">
          {reviewAction === "approve" && (
            <div>
              <Label>Adoption Fee (INR)</Label>
              <Input type="number" min={0} value={adoptionFee} onChange={e => setAdoptionFee(Number(e.target.value))} className="rounded-md" />
            </div>
          )}
          {reviewAction === "reject" && (
            <div>
              <Label>Rejection Reason *</Label>
              <Textarea rows={3} value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Provide a reason for rejection..." required />
            </div>
          )}
          {reviewAction === "start-trial" && (
            <div>
              <Label>Trial Period (days)</Label>
              <Input type="number" min={1} max={90} value={trialDays} onChange={e => setTrialDays(Number(e.target.value))} className="rounded-md" />
            </div>
          )}
          <div>
            <Label>Notes (optional)</Label>
            <Textarea rows={3} value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="Add any notes..." />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" type="button" onClick={() => setShowReviewModal(false)} disabled={submitting}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : reviewAction === "approve" ? "Approve" : reviewAction === "reject" ? "Reject" : reviewAction === "start-trial" ? "Start Trial" : "Complete Trial"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}