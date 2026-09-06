"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Heart, Syringe, Leaf, FileText, MapPin, Calendar,
  AlertTriangle, ChevronLeft, CheckCircle, User
} from "lucide-react";
import { api, Animal, AnimalMedicalRecord, AnimalVaccination, Case, AbcEvent } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { TabBar, TabButton } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { statusToken } from "@/lib/status";

const SingleAnimalMap = dynamic(() => import("@/components/animals/SingleAnimalMap"), { ssr: false });

type ProfileTab = "overview" | "medical" | "vaccinations" | "abc" | "cases";

const ABC_EVENT_LABELS: Record<string, string> = {
  request: "ABC Requested", capture: "Captured",
  surgery: "Surgery Completed", return: "Returned to Territory",
};

export default function AnimalProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [medical, setMedical] = useState<AnimalMedicalRecord[]>([]);
  const [vaccinations, setVaccinations] = useState<AnimalVaccination[]>([]);
  const [abcEvents, setAbcEvents] = useState<AbcEvent[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ProfileTab>("overview");
  const [abcSubmitting, setAbcSubmitting] = useState(false);
  const [abcSuccess, setAbcSuccess] = useState(false);
  const [showMedicalModal, setShowMedicalModal] = useState(false);
  const [showVaccinationModal, setShowVaccinationModal] = useState(false);
  const [savingMedical, setSavingMedical] = useState(false);
  const [savingVaccination, setSavingVaccination] = useState(false);
  const [medicalForm, setMedicalForm] = useState({ entryType: "treatment" as const, title: "", notes: "", providerName: "", treatmentDate: "", costAmount: "", attachments: "" });
  const [vaccinationForm, setVaccinationForm] = useState({ vaccineName: "", administeredAt: "", expiresAt: "", batchNumber: "", notes: "", verified: false, status: "unverified" as const });
  const [reuniteLoading, setReuniteLoading] = useState(false);

  useEffect(() => {
    if (!params?.id) return;
    const load = async () => {
      setLoading(true);
      const [a, med, vac, abc, cs] = await Promise.allSettled([
        api.getAnimal(params.id),
        api.getAnimalMedicalHistory(params.id),
        api.getAnimalVaccinations(params.id),
        api.getAnimalAbcEvents(params.id),
        api.getAnimalCases(params.id),
      ]);
      if (a.status   === "fulfilled") setAnimal(a.value);
      if (med.status === "fulfilled") setMedical(med.value);
      if (vac.status === "fulfilled") setVaccinations(vac.value);
      if (abc.status === "fulfilled") setAbcEvents(abc.value);
      if (cs.status  === "fulfilled") setCases(cs.value);
      setLoading(false);
    };
    load();
  }, [params?.id]);

  const handleAbcRequest = async () => {
    if (!user) { router.push("/login"); return; }
    if (!animal) return;
    setAbcSubmitting(true);
    navigator.geolocation?.getCurrentPosition(async pos => {
      try {
        await api.requestAbc({ animalId: animal.id, latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setAbcSuccess(true);
      } catch { /* ignore */ }
      finally { setAbcSubmitting(false); }
    }, () => setAbcSubmitting(false));
  };

  const canCreateMedical = ["admin", "govt", "ngo", "hospital"].includes(user?.role || "");
  const canCreateVaccination = ["admin", "govt", "ngo", "hospital"].includes(user?.role || "");

  const handleSaveMedical = async () => {
    if (!animal || !medicalForm.title.trim() || !medicalForm.treatmentDate) return;
    setSavingMedical(true);
    try {
      const attachments = medicalForm.attachments.split(",").map(s => s.trim()).filter(Boolean);
      await api.createAnimalMedicalRecord(animal.id, {
        entryType: medicalForm.entryType,
        title: medicalForm.title.trim(),
        notes: medicalForm.notes.trim() || undefined,
        providerName: medicalForm.providerName.trim() || undefined,
        treatmentDate: medicalForm.treatmentDate,
        costAmount: medicalForm.costAmount ? parseFloat(medicalForm.costAmount) : undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      setShowMedicalModal(false);
      setMedicalForm({ entryType: "treatment", title: "", notes: "", providerName: "", treatmentDate: "", costAmount: "", attachments: "" });
      const updated = await api.getAnimalMedicalHistory(animal.id);
      setMedical(updated);
    } catch { /* ignore */ }
    finally { setSavingMedical(false); }
  };

  const handleSaveVaccination = async () => {
    if (!animal || !vaccinationForm.vaccineName.trim() || !vaccinationForm.administeredAt) return;
    setSavingVaccination(true);
    try {
      await api.createAnimalVaccination(animal.id, {
        vaccineName: vaccinationForm.vaccineName.trim(),
        administeredAt: vaccinationForm.administeredAt,
        expiresAt: vaccinationForm.expiresAt || undefined,
        batchNumber: vaccinationForm.batchNumber.trim() || undefined,
        notes: vaccinationForm.notes.trim() || undefined,
        verified: vaccinationForm.verified,
        status: vaccinationForm.status,
      });
      setShowVaccinationModal(false);
      setVaccinationForm({ vaccineName: "", administeredAt: "", expiresAt: "", batchNumber: "", notes: "", verified: false, status: "unverified" });
      const updated = await api.getAnimalVaccinations(animal.id);
      setVaccinations(updated);
    } catch { /* ignore */ }
    finally { setSavingVaccination(false); }
  };

  const handleReunite = async () => {
    if (!animal) return;
    setReuniteLoading(true);
    try {
      await api.updateAnimal(animal.id, { status: "reunited" });
      setAnimal({ ...animal, status: "reunited" });
    } catch { /* ignore */ }
    finally { setReuniteLoading(false); }
  };

  if (loading) return <PageSpinner label="Loading animal profile..." />;
  if (!animal) return (
    <div className="text-center py-20">
      <p className="text-on-surface-variant">Animal not found.</p>
      <Link href="/animals" className="text-primary font-bold mt-3 inline-block">← Back to Animals</Link>
    </div>
  );

  const TABS: { key: ProfileTab; label: string; count?: number }[] = [
    { key: "overview",     label: "Overview" },
    { key: "medical",      label: "Medical",      count: medical.length },
    { key: "vaccinations", label: "Vaccinations", count: vaccinations.length },
    { key: "abc",          label: "ABC",          count: abcEvents.length },
    { key: "cases",        label: "Cases",        count: cases.length },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/animals" className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary font-bold transition-colors duration-150 ease-out">
        <ChevronLeft className="w-4 h-4" /> All Animals
      </Link>

      {/* Hero */}
      <Card className="overflow-hidden">
        <div className="h-64 bg-surface-container-high relative flex items-center justify-center">
          {animal.primaryPhotoUrl
            ? <img src={animal.primaryPhotoUrl} alt={animal.name ?? "Animal"} className="w-full h-full object-cover" />
            : <Heart className="w-20 h-20 text-outline-variant" />}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-inverse-surface/50 to-transparent pointer-events-none" />

          {/* Bottom-left badge cluster */}
          <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
            <StatusBadge token={statusToken.animalStatus(animal.status)} />
            {animal.isSterilized && (
              <Badge variant="primary">
                <Leaf className="w-3 h-3" /> Sterilized
              </Badge>
            )}
          </div>

          {/* Bottom-right primary action */}
          <div className="absolute bottom-4 right-4">
            <Link href={`/cases/new?animalId=${animal.id}`}>
              <Button variant="coral" size="sm">
                <AlertTriangle className="w-4 h-4" /> Report Case
              </Button>
            </Link>
          </div>
        </div>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">{animal.name || "Unnamed Animal"}</h1>
              <p className="text-on-surface-variant capitalize mt-1">
                {animal.species}{animal.breed ? ` · ${animal.breed}` : ""}{animal.gender ? ` · ${animal.gender}` : ""}{animal.color ? ` · ${animal.color}` : ""}
              </p>
              {animal.territoryLabel && (
                <p className="text-sm text-on-surface-variant mt-2 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-outline" />{animal.territoryLabel}</p>
              )}
              {animal.approxAgeMonths && (
                <p className="text-sm text-on-surface-variant mt-1 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-outline" />
                  {animal.approxAgeMonths >= 12 ? `${Math.floor(animal.approxAgeMonths / 12)} yrs` : `${animal.approxAgeMonths} months`} (approx)
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {(animal.status === "lost" || animal.status === "found") && (
                <Button variant="primary" size="sm" onClick={handleReunite} disabled={reuniteLoading}>
                  <CheckCircle className="w-4 h-4 mr-1" /> {reuniteLoading ? "Updating..." : "Mark Reunited"}
                </Button>
              )}
              {animal.status !== "adopted" && (
                <Link href={`/adopt?animalId=${animal.id}`}>
                  <Button variant="coral" size="sm">
                    <Heart className="w-4 h-4" /> Adopt
                  </Button>
                </Link>
              )}
              {!animal.isSterilized && animal.status === "community" && (
                <Button variant="primary" size="sm" onClick={handleAbcRequest} disabled={abcSubmitting || abcSuccess}>
                  <Leaf className="w-4 h-4" />
                  {abcSuccess ? "ABC Requested ✓" : abcSubmitting ? "..." : "Request ABC"}
                </Button>
              )}
            </div>
          </div>
          {animal.description && (
            <p className="text-sm text-on-surface-variant mt-4 leading-relaxed bg-surface-container-low p-4 rounded-xl">{animal.description}</p>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <TabBar>
        {TABS.map(t => (
          <TabButton key={t.key} active={tab === t.key} onClick={() => setTab(t.key)} count={t.count ? t.count : undefined}>
            {t.label}
          </TabButton>
        ))}
      </TabBar>

      {/* OVERVIEW */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Card className="p-5">
              <h3 className="font-bold text-on-surface mb-4">Health Status</h3>
              <div className="space-y-3">
                {[
                  { label: "Sterilized",         value: animal.isSterilized ? "Yes" : "No",             ok: animal.isSterilized },
                  { label: "Vaccination Status", value: vaccinations.length > 0 ? "Vaccinated" : "Unknown", ok: vaccinations.length > 0 },
                  { label: "Medical Records",    value: medical.length > 0 ? `${medical.length} record(s)` : "None", ok: medical.length > 0 },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-2 border-b border-outline-variant/50 last:border-0">
                    <span className="text-sm text-on-surface-variant">{row.label}</span>
                    <span className={`text-sm font-bold flex items-center gap-1 ${row.ok ? "text-green-700" : "text-on-surface-variant"}`}>
                      {row.ok && <CheckCircle className="w-3.5 h-3.5" />}{row.value}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="font-bold text-on-surface mb-3">Quick Facts</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Species", animal.species],
                  ["Breed",   animal.breed ?? "Unknown"],
                  ["Gender",  animal.gender ?? "Unknown"],
                  ["Color",   animal.color ?? "Unknown"],
                  ["Added",   new Date(animal.createdAt).toLocaleDateString("en-IN")],
                  ["Cases",   cases.length.toString()],
                ].map(([k, v]) => (
                  <div key={k} className="bg-surface-container-low rounded-md px-3 py-2">
                    <p className="font-label-caps text-label-caps text-outline uppercase">{k}</p>
                    <p className="font-bold text-on-surface capitalize mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <Card className="overflow-hidden h-72">
            {animal.location?.latitude && animal.location?.longitude ? (
              <SingleAnimalMap lat={animal.location.latitude} lng={animal.location.longitude} name={animal.name ?? "Animal"} status={animal.status} />
            ) : (
              <div className="h-full flex items-center justify-center text-outline text-sm">No location data</div>
            )}
          </Card>
        </div>
      )}

      {/* MEDICAL */}
      {tab === "medical" && (
        <div className="space-y-4 animate-stagger">
          {canCreateMedical && (
            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={() => setShowMedicalModal(true)}>
                <FileText className="w-4 h-4 mr-1" /> Add Medical Record
              </Button>
            </div>
          )}
          {medical.length > 0 ? medical.map(rec => (
            <Card key={rec.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge variant="info" className="mb-2">{rec.entryType}</Badge>
                  <h4 className="font-bold text-on-surface">{rec.title}</h4>
                  {rec.providerName && <p className="text-xs text-on-surface-variant mt-1 flex items-center gap-1"><User className="w-3 h-3" />{rec.providerName}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-outline">{new Date(rec.treatmentDate).toLocaleDateString("en-IN")}</p>
                  {rec.costAmount && <p className="text-sm font-black text-primary mt-1">₹{rec.costAmount.toLocaleString("en-IN")}</p>}
                </div>
              </div>
              {rec.notes && <p className="text-sm text-on-surface-variant mt-3 leading-relaxed bg-surface-container-low p-3 rounded-md">{rec.notes}</p>}
            </Card>
          )) : (
            <EmptyState icon={FileText} title="No medical records yet" />
          )}
        </div>
      )}

      {/* VACCINATIONS */}
      {tab === "vaccinations" && (
        <div className="space-y-3 animate-stagger">
          {canCreateVaccination && (
            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={() => setShowVaccinationModal(true)}>
                <Syringe className="w-4 h-4 mr-1" /> Add Vaccination
              </Button>
            </div>
          )}
          {vaccinations.length > 0 ? vaccinations.map(vac => (
            <Card key={vac.id} className={`p-5 flex items-center gap-4 ${vac.status === "expired" ? "border-error/30" : ""}`}>
              <Syringe className={`w-8 h-8 shrink-0 ${vac.status === "verified" ? "text-green-500" : vac.status === "expired" ? "text-error" : "text-amber-400"}`} />
              <div className="flex-1">
                <h4 className="font-bold text-on-surface">{vac.vaccineName}</h4>
                <p className="text-xs text-on-surface-variant mt-0.5">Given: {new Date(vac.administeredAt).toLocaleDateString("en-IN")}</p>
                {vac.expiresAt && <p className="text-xs text-outline">Expires: {new Date(vac.expiresAt).toLocaleDateString("en-IN")}</p>}
                {vac.batchNumber && <p className="text-[10px] text-outline font-mono">Batch: {vac.batchNumber}</p>}
              </div>
              <StatusBadge token={statusToken.vaccinationStatus(vac.status)} />
            </Card>
          )) : (
            <EmptyState icon={Syringe} title="No vaccination records yet" />
          )}
        </div>
      )}

      {/* ABC */}
      {tab === "abc" && (
        <div className="space-y-4">
          <Card className="p-5 flex items-center gap-4">
            <Leaf className="w-8 h-8 text-primary shrink-0" />
            <div>
              <p className="font-bold text-on-surface">ABC Status</p>
              <p className={`text-sm mt-0.5 ${animal.isSterilized ? "text-green-600 font-bold" : "text-amber-600"}`}>
                {animal.isSterilized ? "✓ Sterilized" : "Not sterilized yet"}
              </p>
            </div>
            {!animal.isSterilized && !abcSuccess && (
              <Button variant="primary" size="sm" onClick={handleAbcRequest} disabled={abcSubmitting} className="ml-auto">
                {abcSubmitting ? "..." : "Request ABC"}
              </Button>
            )}
            {abcSuccess && <span className="ml-auto text-green-600 font-bold text-sm">Requested ✓</span>}
          </Card>
          {abcEvents.length > 0 ? (
            <div className="space-y-3 animate-stagger">
              {abcEvents.map(ev => (
                <Card key={ev.id} className="p-4 flex items-center gap-4">
                  <span className="text-2xl">{ev.eventType === "return" ? "🏠" : ev.eventType === "surgery" ? "✂️" : ev.eventType === "capture" ? "🔒" : "📋"}</span>
                  <div>
                    <p className="font-bold text-on-surface text-sm">{ABC_EVENT_LABELS[ev.eventType] ?? ev.eventType}</p>
                    <p className="text-xs text-outline">{formatDateTime(ev.createdAt)}</p>
                    {ev.notes && <p className="text-xs text-on-surface-variant mt-1">{ev.notes}</p>}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon={Leaf} title="No ABC events recorded yet" />
          )}
        </div>
      )}

      {/* CASES */}
      {tab === "cases" && (
        <div className="space-y-3 animate-stagger">
          {cases.length > 0 ? cases.map(c => (
            <Link key={c.id} href={`/cases/${c.id}`} className="block">
              <Card interactive className="p-5 flex items-center gap-4">
                <span className={`w-3 h-3 rounded-full shrink-0 ${c.status === "open" ? "bg-amber-400" : c.status === "resolved" ? "bg-green-400" : "bg-outline-variant"}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-on-surface text-sm truncate">{c.title}</p>
                  <p className="text-xs text-outline mt-0.5 capitalize">{c.caseType.replace("_"," ")} · {c.status}</p>
                </div>
                <p className="text-xs text-outline shrink-0">{new Date(c.createdAt).toLocaleDateString("en-IN")}</p>
              </Card>
            </Link>
          )) : (
            <EmptyState icon={FileText} title="No cases linked to this animal" />
          )}
        </div>
      )}

      {/* MEDICAL RECORD MODAL */}
      <Modal open={showMedicalModal} onClose={() => setShowMedicalModal(false)} title="Add Medical Record">
        <div className="space-y-4">
          <div>
            <Label htmlFor="med-entryType">Entry Type</Label>
            <select id="med-entryType" value={medicalForm.entryType} onChange={(e) => setMedicalForm({ ...medicalForm, entryType: e.target.value as any })} className="w-full bg-surface-container-low border-b-2 border-outline focus:border-primary focus:ring-0 focus:outline-none px-4 py-3 rounded-t-md transition-colors font-body-md text-on-surface">
              <option value="treatment">Treatment</option>
              <option value="surgery">Surgery</option>
              <option value="vaccination">Vaccination</option>
              <option value="observation">Observation</option>
            </select>
          </div>
          <div>
            <Label htmlFor="med-title">Title *</Label>
            <Input id="med-title" value={medicalForm.title} onChange={(e) => setMedicalForm({ ...medicalForm, title: e.target.value })} placeholder="e.g. Wound dressing, Surgery, Checkup" required />
          </div>
          <div>
            <Label htmlFor="med-provider">Veterinarian / Provider</Label>
            <Input id="med-provider" value={medicalForm.providerName} onChange={(e) => setMedicalForm({ ...medicalForm, providerName: e.target.value })} placeholder="Dr. Name / Clinic" />
          </div>
          <div>
            <Label htmlFor="med-date">Date *</Label>
            <Input id="med-date" type="date" value={medicalForm.treatmentDate} onChange={(e) => setMedicalForm({ ...medicalForm, treatmentDate: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="med-cost">Cost (INR)</Label>
            <Input id="med-cost" type="number" value={medicalForm.costAmount} onChange={(e) => setMedicalForm({ ...medicalForm, costAmount: e.target.value })} placeholder="0" />
          </div>
          <div>
            <Label htmlFor="med-notes">Notes</Label>
            <textarea id="med-notes" value={medicalForm.notes} onChange={(e) => setMedicalForm({ ...medicalForm, notes: e.target.value })} rows={3} className="w-full bg-surface-container-low border-b-2 border-outline focus:border-primary focus:ring-0 focus:outline-none px-4 py-3 rounded-t-md transition-colors font-body-md text-on-surface resize-none" placeholder="Diagnosis, treatment details..." />
          </div>
          <div>
            <Label htmlFor="med-attachments">Attachments (comma-separated URLs)</Label>
            <Input id="med-attachments" value={medicalForm.attachments} onChange={(e) => setMedicalForm({ ...medicalForm, attachments: e.target.value })} placeholder="https://..." />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowMedicalModal(false)} disabled={savingMedical}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveMedical} disabled={savingMedical || !medicalForm.title.trim() || !medicalForm.treatmentDate}>
              {savingMedical ? "Saving..." : "Save Record"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* VACCINATION MODAL */}
      <Modal open={showVaccinationModal} onClose={() => setShowVaccinationModal(false)} title="Add Vaccination">
        <div className="space-y-4">
          <div>
            <Label htmlFor="vac-name">Vaccine Name *</Label>
            <Input id="vac-name" value={vaccinationForm.vaccineName} onChange={(e) => setVaccinationForm({ ...vaccinationForm, vaccineName: e.target.value })} placeholder="e.g. Rabies, DHPPI" required />
          </div>
          <div>
            <Label htmlFor="vac-date">Administered Date *</Label>
            <Input id="vac-date" type="date" value={vaccinationForm.administeredAt} onChange={(e) => setVaccinationForm({ ...vaccinationForm, administeredAt: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="vac-expires">Expiry / Next Due Date</Label>
            <Input id="vac-expires" type="date" value={vaccinationForm.expiresAt} onChange={(e) => setVaccinationForm({ ...vaccinationForm, expiresAt: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="vac-batch">Batch Number</Label>
            <Input id="vac-batch" value={vaccinationForm.batchNumber} onChange={(e) => setVaccinationForm({ ...vaccinationForm, batchNumber: e.target.value })} placeholder="Batch #" />
          </div>
          <div>
            <Label htmlFor="vac-status">Status</Label>
            <select id="vac-status" value={vaccinationForm.status} onChange={(e) => setVaccinationForm({ ...vaccinationForm, status: e.target.value as any })} className="w-full bg-surface-container-low border-b-2 border-outline focus:border-primary focus:ring-0 focus:outline-none px-4 py-3 rounded-t-md transition-colors font-body-md text-on-surface">
              <option value="unverified">Unverified</option>
              <option value="verified">Verified</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <div>
            <Label htmlFor="vac-notes">Notes</Label>
            <textarea id="vac-notes" value={vaccinationForm.notes} onChange={(e) => setVaccinationForm({ ...vaccinationForm, notes: e.target.value })} rows={2} className="w-full bg-surface-container-low border-b-2 border-outline focus:border-primary focus:ring-0 focus:outline-none px-4 py-3 rounded-t-md transition-colors font-body-md text-on-surface resize-none" placeholder="Booster needed, side effects..." />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowVaccinationModal(false)} disabled={savingVaccination}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveVaccination} disabled={savingVaccination || !vaccinationForm.vaccineName.trim() || !vaccinationForm.administeredAt}>
              {savingVaccination ? "Saving..." : "Save Vaccination"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
