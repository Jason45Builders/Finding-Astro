"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Heart, Search, CheckCircle, MapPin, PawPrint, ArrowUpRight, Sparkles, ShieldCheck } from "lucide-react";
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
import { Photo } from "@/components/ui/Photo";
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
    fullName: user?.fullName ?? "", phone: "", address: "", livingSituation: "apartment",
    hasOtherPets: false, otherPetsDesc: "", priorExperience: "none", hoursAlonePerDay: 8, reasonForAdopting: "",
  });

  useEffect(() => {
    const tab = searchParams?.get("tab") as AdoptTab | null;
    if (tab === "browse" || tab === "my-applications") setActiveTab(tab);
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try { setAnimals(await api.listAdoptableAnimals()); }
      catch { setAnimals([]); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  useEffect(() => {
    const requestedAnimalId = searchParams?.get("animalId");
    if (!requestedAnimalId || loading || selectedAnimal) return;
    const requested = animals.find((animal) => animal.id === requestedAnimalId);
    if (requested) { setSelectedAnimal(requested); setShowForm(true); }
  }, [searchParams, loading, animals, selectedAnimal]);

  useEffect(() => {
    if (activeTab === "my-applications" && user) {
      api.listMyAdoptionApplications().then(setApplications).catch(() => setApplications([]));
    }
  }, [activeTab, user]);

  const filtered = animals.filter((a) => {
    const query = search.trim().toLowerCase();
    const matchSearch = !query || (a.name && a.name.toLowerCase().includes(query)) ||
      a.species.toLowerCase().includes(query) || (a.breed && a.breed.toLowerCase().includes(query)) ||
      (a.territoryLabel && a.territoryLabel.toLowerCase().includes(query));
    return matchSearch && (speciesFilter === "all" || a.species.toLowerCase() === speciesFilter) && a.status !== "adopted";
  });

  const handleApply = (animal: AdoptableAnimal) => {
    if (!user) { router.push("/login"); return; }
    setSelectedAnimal(animal); setShowForm(true); setSubmitSuccess(false); setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnimal || !user) return;
    setSubmitting(true); setError(null);
    try { await api.applyForAdoption({ ...form, animalId: selectedAnimal.id }); setSubmitSuccess(true); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed to submit application"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-w-0 space-y-6 sm:space-y-8">
      <section className="relative isolate overflow-hidden rounded-2xl bg-primary text-on-primary shadow-sm">
        <div className="absolute -right-10 -top-14 -z-10 h-52 w-52 rounded-full border-[28px] border-on-primary/10" />
        <div className="absolute bottom-[-4rem] right-24 -z-10 h-40 w-40 rounded-full bg-on-primary/5" />
        <div className="grid gap-5 p-5 sm:p-8 md:grid-cols-[1fr_auto] md:items-end">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-on-primary/20 bg-on-primary/10 px-3 py-1 text-xs font-semibold tracking-wide"><PawPrint className="h-3.5 w-3.5" /> FINDING ASTRO · ADOPTION</span>
            <h1 className="mt-4 max-w-xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">A new best friend is waiting for you.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-on-primary/85 sm:text-base">Meet animals in our community, learn their stories, and help them find a safe, permanent home.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => { setActiveTab("browse"); document.getElementById("animal-listings")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>Meet the animals <ArrowUpRight className="h-4 w-4" /></Button>
              <Link href="/foster/opportunities" className="inline-flex items-center gap-2 rounded-xl border border-on-primary/30 px-4 py-2 text-sm font-semibold text-on-primary transition hover:bg-on-primary/10">Explore fostering</Link>
            </div>
          </div>
          <div className="hidden min-w-40 flex-col items-center justify-center rounded-2xl border border-on-primary/15 bg-on-primary/10 p-5 text-center md:flex"><Heart className="h-8 w-8" /><p className="mt-2 text-sm font-bold">Love changes lives</p><p className="mt-1 max-w-32 text-xs text-on-primary/75">Every adoption makes room for another animal in need.</p></div>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Your next chapter starts here</p><h2 className="mt-1 text-xl font-extrabold tracking-tight text-on-surface sm:text-2xl">Find your companion</h2><p className="mt-1 text-sm text-on-surface-variant">Take your time. The right connection is worth finding.</p></div>
        <p className="text-xs text-on-surface-variant">Looking to rehome an animal? <Link href="/rehome" className="font-semibold text-primary underline underline-offset-4">Start here</Link></p>
      </div>

      <TabBar>
        <TabButton active={activeTab === "browse"} onClick={() => setActiveTab("browse")}>Browse Animals</TabButton>
        <TabButton active={activeTab === "my-applications"} onClick={() => setActiveTab("my-applications")} count={user ? applications.length : undefined}>My Applications</TabButton>
      </TabBar>

      {activeTab === "browse" && <>
        <Card className="p-3 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_190px]">
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" /><Input type="text" placeholder="Search name, breed or area..." value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-xl pl-9" /></div>
            <Select value={speciesFilter} onChange={(e) => setSpeciesFilter(e.target.value)} className="w-full rounded-xl"><option value="all">All animals</option><option value="dog">Dogs</option><option value="cat">Cats</option><option value="bird">Birds</option><option value="other">Other</option></Select>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-outline-variant/30 pt-3 text-xs text-on-surface-variant"><span>{loading ? "Finding companions…" : filtered.length + (filtered.length === 1 ? " animal to meet" : " animals to meet")}</span>{(search || speciesFilter !== "all") && <button className="font-semibold text-primary underline underline-offset-4" onClick={() => { setSearch(""); setSpeciesFilter("all"); }}>Clear filters</button>}</div>
        </Card>
        <div id="animal-listings" className="scroll-mt-5">
          {loading ? <PageSpinner /> : filtered.length > 0 ? <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-3 sm:gap-5 animate-stagger">
            {filtered.map((animal) => <Card key={animal.id} interactive className="group overflow-hidden rounded-2xl p-0 transition duration-200 hover:-translate-y-1 hover:shadow-lg">
              <Link href={"/animals/" + animal.id} className="relative block h-60 overflow-hidden bg-surface-container-high sm:h-64" aria-label={"View " + (animal.name || "animal") + "'s profile"}>
                {animal.primaryPhotoUrl ? <Photo src={animal.primaryPhotoUrl} alt={animal.name || "Animal available for adoption"} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" /> : <div className="flex h-full items-center justify-center"><PawPrint className="h-14 w-14 text-outline-variant" /></div>}
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent" /><div className="absolute left-3 top-3"><StatusBadge token={statusToken.animalStatus(animal.status)} /></div>
                {animal.isSterilized && <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold text-on-primary shadow-sm"><ShieldCheck className="h-3 w-3" /> Sterilized</span>}
                <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 text-xs font-semibold text-white"><Sparkles className="h-3.5 w-3.5" /> Meet {animal.name || "your new friend"}</span>
              </Link>
              <div className="space-y-3 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-xl font-extrabold tracking-tight text-on-surface">{animal.name || "A new friend"}</h3><p className="mt-1 text-sm capitalize text-on-surface-variant">{animal.species}{animal.breed ? " · " + animal.breed : ""}</p></div><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-container/50 text-primary"><Heart className="h-4 w-4" /></span></div>
                {animal.territoryLabel && <p className="flex items-center gap-1.5 text-xs text-on-surface-variant"><MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />{animal.territoryLabel}</p>}
                {animal.description ? <p className="line-clamp-3 min-h-[3.75rem] text-sm leading-5 text-on-surface-variant">{animal.description}</p> : <p className="min-h-[3.75rem] text-sm leading-5 text-on-surface-variant">Could this be the beginning of a beautiful friendship? Open the profile to learn more.</p>}
                <div className="grid grid-cols-[1fr_1.15fr] gap-2 border-t border-outline-variant/30 pt-3"><Link href={"/animals/" + animal.id}><Button variant="ghost" size="sm" className="w-full bg-surface-container-high">Their story</Button></Link><Button variant="secondary" size="sm" className="w-full" onClick={() => handleApply(animal)}><Heart className="h-3.5 w-3.5" /> Adopt {animal.name ? animal.name.split(" ")[0] : "me"}</Button></div>
              </div>
            </Card>)}
          </div> : <EmptyState icon={Heart} title={search || speciesFilter !== "all" ? "No animals match those filters." : "No adoptable animals are listed right now."} />}
        </div>
      </>}

      {activeTab === "my-applications" && <>
        {!user ? <EmptyState icon={Heart} title="Sign in to view your adoption applications" action={<Link href="/login"><Button variant="primary">Sign In</Button></Link>} /> : applications.length === 0 ? <EmptyState icon={Heart} title="You have not submitted any adoption applications yet." /> :
          <div className="space-y-4 animate-stagger">{applications.map((app) => <Card key={app.id} className="rounded-2xl p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4"><div><p className="font-bold text-on-surface">Adoption Application</p><p className="mt-1 font-mono text-xs text-outline">{app.animalId}</p><p className="mt-1 text-xs text-outline">Submitted {formatDateTime(app.createdAt)}</p></div><StatusBadge token={statusToken.adoptionStatus(app.status)} className="shrink-0" /></div>
            {app.status === "approved" && !app.agreementAcceptedAt && <div className="mt-4 rounded-xl border border-primary-container bg-primary-container/20 p-4"><p className="text-sm font-semibold text-on-surface">Your application is approved. Accept the agreement to schedule your trial placement.</p><Button size="sm" variant="primary" className="mt-3" onClick={() => api.confirmAdoption(app.id).then(() => api.listMyAdoptionApplications().then(setApplications))}>Accept Agreement</Button></div>}
            {app.reviewNotes && <p className="mt-3 rounded-xl bg-surface-container-low p-3 text-sm text-on-surface-variant">{app.reviewNotes}</p>}
          </Card>)}</div>}
      </>}

      <Modal open={showForm && !!selectedAnimal} onClose={() => setShowForm(false)} title={submitSuccess ? undefined : "Apply to Adopt " + (selectedAnimal?.name || "this Animal")}>
        {submitSuccess ? <div className="space-y-4 py-8 text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100"><CheckCircle className="h-9 w-9 text-green-600" /></div><h3 className="text-xl font-extrabold text-on-surface">Application submitted!</h3><p className="text-sm text-on-surface-variant">Thank you for taking the first step. The welfare team will review your application.</p><Button variant="primary" onClick={() => { setShowForm(false); setSubmitSuccess(false); }}>Done</Button></div> : <>
          {error && <div className="mb-4 rounded-xl bg-error-container p-3 text-sm text-on-error-container">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Full Name</Label><Input type="text" placeholder="Your full name" required value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} /></div>
            <div><Label>Phone</Label><Input type="tel" placeholder="+91 98765 43210" required value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} /></div>
            <div><Label>Address</Label><Input type="text" placeholder="Your home address" required value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} /></div>
            <div><Label>Living Situation</Label><Select value={form.livingSituation} onChange={(e) => setForm((p) => ({ ...p, livingSituation: e.target.value }))}><option value="house_with_yard">House with yard</option><option value="apartment">Apartment</option><option value="shared_accommodation">Shared accommodation</option><option value="other">Other</option></Select></div>
            <div><Label>Prior Experience</Label><Select value={form.priorExperience} onChange={(e) => setForm((p) => ({ ...p, priorExperience: e.target.value }))}><option value="none">None</option><option value="some">Some</option><option value="experienced">Experienced</option></Select></div>
            <div><Label>Hours animal would be alone per day</Label><Input type="number" min={0} max={24} value={form.hoursAlonePerDay} onChange={(e) => setForm((p) => ({ ...p, hoursAlonePerDay: Number(e.target.value) }))} className="w-32" /></div>
            <div className="flex items-center gap-3"><input type="checkbox" id="other-pets" checked={form.hasOtherPets} onChange={(e) => setForm((p) => ({ ...p, hasOtherPets: e.target.checked }))} className="h-4 w-4 rounded accent-primary" /><label htmlFor="other-pets" className="text-sm font-semibold text-on-surface-variant">I have other pets</label></div>
            <div><Label>Why do you want to adopt?</Label><Textarea rows={3} required value={form.reasonForAdopting} onChange={(e) => setForm((p) => ({ ...p, reasonForAdopting: e.target.value }))} placeholder="Tell us why you would like to give this animal a home..." /></div>
            <Button type="submit" disabled={submitting} variant="primary" size="lg" className="w-full">{submitting ? <Spinner size="sm" className="border-on-primary/30 border-t-on-primary" /> : <Heart className="h-4 w-4" />}{submitting ? "Submitting..." : "Submit Application"}</Button>
          </form>
        </>}
      </Modal>
    </div>
  );
}

export default function AdoptPage() {
  return <Suspense fallback={<PageSpinner />}><AdoptPageInner /></Suspense>;
}
