"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Heart, Search, CheckCircle, MapPin } from "lucide-react";
import { api, AdoptableAnimal, AdoptionApplication } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea, Label } from "@/components/ui/Input";
import { TabBar, TabButton } from "@/components/ui/Tabs";
import { StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSpinner, Spinner } from "@/components/ui/Spinner";
import { statusToken } from "@/lib/status";

type AdoptTab = "browse" | "my-applications";

function AdoptPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdoptTab>("browse");
  const [animals, setAnimals] = useState<AdoptableAnimal[]>([]);
  const [applications, setApplications] = useState<AdoptionApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState("all");
  const [selectedAnimal, setSelectedAnimal] = useState<AdoptableAnimal | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: user?.fullName ?? "",
    phone: "",
    address: "",
    livingSituation: "apartment",
    hasOtherPets: false,
    otherPetsDesc: "",
    priorExperience: "none",
    hoursAlonePerDay: 8,
    reasonForAdopting: "",
  });

  useEffect(() => {
    const tab = searchParams?.get("tab") as AdoptTab | null;
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.listAdoptableAnimals();
        setAnimals(data);
      } catch {
        try {
          const all = await api.listAnimals({ limit: 100 });
          setAnimals(all.filter(a => a.status === "found" || a.status === "community") as AdoptableAnimal[]);
        } catch { /* ignore */ }
      } finally { setLoading(false); }
    };
    load();
  }, []);

  useEffect(() => {
    if (activeTab === "my-applications" && user) {
      api.listMyAdoptionApplications().then(setApplications).catch(() => setApplications([]));
    }
  }, [activeTab, user]);

  const filtered = animals.filter(a => {
    const matchSearch = !search ||
      (a.name && a.name.toLowerCase().includes(search.toLowerCase())) ||
      a.species.toLowerCase().includes(search.toLowerCase()) ||
      (a.breed && a.breed.toLowerCase().includes(search.toLowerCase())) ||
      (a.territoryLabel && a.territoryLabel.toLowerCase().includes(search.toLowerCase()));
    const matchSpecies = speciesFilter === "all" || a.species.toLowerCase() === speciesFilter;
    return matchSearch && matchSpecies && a.status !== "adopted";
  });

  const handleApply = (animal: AdoptableAnimal) => {
    if (!user) { router.push("/login"); return; }
    setSelectedAnimal(animal);
    setShowForm(true);
    setSubmitSuccess(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnimal || !user) return;
    setSubmitting(true); setError(null);
    try {
      await api.applyForAdoption({ ...form, animalId: selectedAnimal.id });
      setSubmitSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit application");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-on-surface tracking-tight flex items-center gap-2">
          <Heart className="w-6 h-6 text-secondary" /> Adoption Centre
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">Give a community animal a permanent home</p>
      </div>

      <TabBar>
        <TabButton active={activeTab === "browse"} onClick={() => setActiveTab("browse")}>
          Browse Animals
        </TabButton>
        <TabButton active={activeTab === "my-applications"} onClick={() => setActiveTab("my-applications")} count={user ? applications.length : undefined}>
          My Applications
        </TabButton>
      </TabBar>

      {activeTab === "browse" && (
        <>
          <Card className="p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3.5 w-4 h-4 text-outline pointer-events-none" />
              <Input type="text" placeholder="Search by name, breed, area..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 rounded-md" />
            </div>
            <Select value={speciesFilter} onChange={e => setSpeciesFilter(e.target.value)} className="rounded-md w-full sm:w-auto">
              <option value="all">All Species</option>
              <option value="dog">Dogs</option>
              <option value="cat">Cats</option>
              <option value="bird">Birds</option>
              <option value="other">Other</option>
            </Select>
          </Card>

          {loading ? (
            <PageSpinner />
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-stagger">
              {filtered.map(animal => (
                <Card key={animal.id} interactive className="overflow-hidden p-0">
                  <div className="h-48 bg-surface-container-high relative flex items-center justify-center">
                    {animal.primaryPhotoUrl
                      ? <img src={animal.primaryPhotoUrl} alt={animal.name ?? "Animal"} className="w-full h-full object-cover" />
                      : <Heart className="w-16 h-16 text-outline-variant" />}
                    <StatusBadge token={statusToken.animalStatus(animal.status)} className="absolute top-3 left-3" />
                    {animal.isSterilized && (
                      <span className="absolute top-3 right-3 bg-primary text-on-primary text-[9px] font-bold px-2 py-0.5 rounded-full">Sterilized</span>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-headline-lg-mobile text-lg font-extrabold text-on-surface">{animal.name || "Unnamed"}</h3>
                    <p className="text-sm text-on-surface-variant capitalize mt-0.5">{animal.species}{animal.breed ? ` · ${animal.breed}` : ""}</p>
                    {animal.territoryLabel && (
                      <p className="text-xs text-outline mt-2 flex items-center gap-1"><MapPin className="w-3 h-3" />{animal.territoryLabel}</p>
                    )}
                    {animal.description && (
                      <p className="text-xs text-on-surface-variant mt-3 line-clamp-2 leading-relaxed">{animal.description}</p>
                    )}
                    <div className="mt-4 flex gap-2">
                      <Link href={`/animals/${animal.id}`} className="flex-1">
                        <Button variant="ghost" size="sm" className="w-full bg-surface-container-high">View Profile</Button>
                      </Link>
                      <Button variant="secondary" size="sm" className="flex-1" onClick={() => handleApply(animal)}>
                        <Heart className="w-3.5 h-3.5" /> Apply
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon={Heart} title="No adoptable animals found matching your criteria." />
          )}
        </>
      )}

      {activeTab === "my-applications" && (
        <>
          {!user ? (
            <EmptyState
              icon={Heart}
              title="Sign in to view your adoption applications"
              action={<Link href="/login"><Button variant="primary">Sign In</Button></Link>}
            />
          ) : applications.length === 0 ? (
            <EmptyState icon={Heart} title="You have not submitted any adoption applications yet." />
          ) : (
            <div className="space-y-4 animate-stagger">
              {applications.map(app => (
                <Card key={app.id} className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold text-on-surface">Adoption Application</p>
                      <p className="text-xs text-outline font-mono mt-0.5">{app.animalId}</p>
                      <p className="text-xs text-outline mt-1">Submitted {formatDateTime(app.createdAt)}</p>
                    </div>
                    <StatusBadge token={statusToken.adoptionStatus(app.status)} className="shrink-0" />
                  </div>
                  {app.status === "approved" && !app.agreementAcceptedAt && (
                    <div className="mt-4 bg-primary-container/20 border border-primary-container rounded-md p-4">
                      <p className="text-sm font-semibold text-on-surface">Your application is approved! Confirm to proceed.</p>
                      <Button
                        size="sm"
                        variant="primary"
                        className="mt-2"
                        onClick={() => api.confirmAdoption(app.id).then(() => api.listMyAdoptionApplications().then(setApplications))}
                      >
                        Confirm Adoption
                      </Button>
                    </div>
                  )}
                  {app.reviewNotes && (
                    <p className="text-xs text-on-surface-variant mt-3 bg-surface-container-low p-3 rounded-md">{app.reviewNotes}</p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Modal
        open={showForm && !!selectedAnimal}
        onClose={() => setShowForm(false)}
        title={submitSuccess ? undefined : `Apply to Adopt ${selectedAnimal?.name || "this Animal"}`}
      >
        {submitSuccess ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-9 h-9 text-green-600" />
            </div>
            <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Application Submitted!</h3>
            <p className="text-on-surface-variant text-sm">An NGO volunteer will review your application within 2–3 days.</p>
            <Button variant="primary" onClick={() => { setShowForm(false); setSubmitSuccess(false); }}>Done</Button>
          </div>
        ) : (
          <>
            {error && <div className="bg-error-container text-on-error-container p-3 rounded-md text-sm mb-4">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input type="text" placeholder="Your full name" required
                  value={form.fullName}
                  onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input type="tel" placeholder="+91 98765 43210" required
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <Label>Address</Label>
                <Input type="text" placeholder="Your home address" required
                  value={form.address}
                  onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
              </div>
              <div>
                <Label>Living Situation</Label>
                <Select value={form.livingSituation} onChange={e => setForm(p => ({ ...p, livingSituation: e.target.value }))}>
                  <option value="house_with_yard">House with yard</option>
                  <option value="apartment">Apartment</option>
                  <option value="shared_accommodation">Shared accommodation</option>
                  <option value="other">Other</option>
                </Select>
              </div>
              <div>
                <Label>Prior Experience</Label>
                <Select value={form.priorExperience} onChange={e => setForm(p => ({ ...p, priorExperience: e.target.value }))}>
                  <option value="none">None</option>
                  <option value="some">Some</option>
                  <option value="experienced">Experienced</option>
                </Select>
              </div>
              <div>
                <Label>Hours animal would be alone per day</Label>
                <Input type="number" min={0} max={24} value={form.hoursAlonePerDay}
                  onChange={e => setForm(p => ({ ...p, hoursAlonePerDay: Number(e.target.value) }))}
                  className="w-32" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="other-pets" checked={form.hasOtherPets}
                  onChange={e => setForm(p => ({ ...p, hasOtherPets: e.target.checked }))} className="w-4 h-4 rounded accent-primary" />
                <label htmlFor="other-pets" className="text-sm font-semibold text-on-surface-variant">I have other pets</label>
              </div>
              <div>
                <Label>Why do you want to adopt?</Label>
                <Textarea rows={3} required value={form.reasonForAdopting}
                  onChange={e => setForm(p => ({ ...p, reasonForAdopting: e.target.value }))}
                  placeholder="Tell us why you would like to give this animal a home..." />
              </div>
              <Button type="submit" disabled={submitting} variant="primary" size="lg" className="w-full">
                {submitting ? <Spinner size="sm" className="border-on-primary/30 border-t-on-primary" /> : <Heart className="w-4 h-4" />}
                {submitting ? "Submitting..." : "Submit Application"}
              </Button>
            </form>
          </>
        )}
      </Modal>
    </div>
  );
}

export default function AdoptPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <AdoptPageInner />
    </Suspense>
  );
}
