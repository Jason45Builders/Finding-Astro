"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, ArrowLeft, CheckCircle, MapPin, PawPrint, ShieldCheck, Sparkles, Home, Clock } from "lucide-react";
import { api, Animal } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSpinner } from "@/components/ui/Spinner";
import { Photo } from "@/components/ui/Photo";
import { Modal } from "@/components/ui/Modal";

export default function FosterOpportunitiesPage() {
  const { user } = useAuth();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Animal | null>(null);
  const [message, setMessage] = useState("");
  const [availability, setAvailability] = useState("");
  const [experience, setExperience] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.listFosterOpportunities().then(setAnimals).catch(() => setAnimals([])).finally(() => setLoading(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    if (!user) { window.location.assign("/login"); return; }
    setBusy(true); setError(null);
    try {
      await api.applyForFoster({ animalId: selected.id, message, availability, experience });
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit application");
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-6 sm:space-y-8">
      <Link href="/foster" className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:gap-3"><ArrowLeft className="h-4 w-4" /> Foster & Recovery</Link>
      <section className="relative isolate overflow-hidden rounded-2xl bg-primary text-on-primary shadow-sm">
        <div className="absolute -right-10 -top-12 -z-10 h-52 w-52 rounded-full border-[28px] border-on-primary/10" />
        <div className="grid gap-5 p-5 sm:p-8 md:grid-cols-[1fr_auto] md:items-end">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-on-primary/20 bg-on-primary/10 px-3 py-1 text-xs font-semibold tracking-wide"><PawPrint className="h-3.5 w-3.5" /> FINDING ASTRO · FOSTER CARE</span>
            <h1 className="mt-4 max-w-xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">A safe place to land. A little time to heal.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-on-primary/85 sm:text-base">Fostering gives an animal a calm, temporary home while the welfare team works toward their next chapter. You can make a difference without making a forever commitment.</p>
            <div className="mt-5 flex flex-wrap gap-3"><Button variant="secondary" onClick={() => document.getElementById("foster-listings")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Meet animals needing care <Heart className="h-4 w-4" /></Button><Link href="/adopt" className="inline-flex items-center gap-2 rounded-xl border border-on-primary/30 px-4 py-2 text-sm font-semibold text-on-primary transition hover:bg-on-primary/10">Explore adoption</Link></div>
          </div>
          <div className="hidden min-w-44 flex-col items-center rounded-2xl border border-on-primary/15 bg-on-primary/10 p-5 text-center md:flex"><Home className="h-8 w-8" /><p className="mt-2 text-sm font-bold">Open your home</p><p className="mt-1 max-w-36 text-xs text-on-primary/75">Temporary care can change an animal’s whole future.</p></div>
        </div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Small stay. Huge impact.</p><h2 className="mt-1 text-xl font-extrabold tracking-tight text-on-surface sm:text-2xl">Animals looking for a foster home</h2><p className="mt-1 text-sm text-on-surface-variant">Browse their profiles and tell us what kind of care you can offer.</p></div>{!loading && <span className="text-xs text-on-surface-variant">{animals.length} {animals.length === 1 ? "opportunity" : "opportunities"}</span>}</div>

      <div className="grid gap-3 rounded-2xl border border-outline-variant/40 bg-surface-container-low p-4 sm:grid-cols-3 sm:p-5">
        <div className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container/60 text-primary"><Clock className="h-5 w-5" /></span><div><p className="text-sm font-bold text-on-surface">Temporary by design</p><p className="mt-1 text-xs leading-5 text-on-surface-variant">Share the time and availability you can offer.</p></div></div>
        <div className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container/60 text-primary"><ShieldCheck className="h-5 w-5" /></span><div><p className="text-sm font-bold text-on-surface">Guided by the welfare team</p><p className="mt-1 text-xs leading-5 text-on-surface-variant">Your application helps the team understand the best fit.</p></div></div>
        <div className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container/60 text-primary"><Heart className="h-5 w-5" /></span><div><p className="text-sm font-bold text-on-surface">Every home matters</p><p className="mt-1 text-xs leading-5 text-on-surface-variant">A safe place to recover can be the turning point.</p></div></div>
      </div>

      <div id="foster-listings" className="scroll-mt-5">
        {loading ? <PageSpinner /> : animals.length ? <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-3 sm:gap-5 animate-stagger">
          {animals.map((animal) => <Card key={animal.id} interactive className="group overflow-hidden rounded-2xl p-0 transition duration-200 hover:-translate-y-1 hover:shadow-lg">
            <Link href={"/animals/" + animal.id} className="relative block h-60 overflow-hidden bg-surface-container-high sm:h-64" aria-label={"View " + (animal.name || "animal") + "'s profile"}>
              {animal.primaryPhotoUrl ? <Photo src={animal.primaryPhotoUrl} alt={animal.name || animal.species} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" /> : <div className="flex h-full items-center justify-center"><PawPrint className="h-14 w-14 text-outline-variant" /></div>}
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent" /><span className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/35 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">Foster needed</span>
              {animal.isSterilized && <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold text-on-primary shadow-sm"><ShieldCheck className="h-3 w-3" /> Sterilized</span>}
              <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 text-xs font-semibold text-white"><Sparkles className="h-3.5 w-3.5" /> Help them feel safe</span>
            </Link>
            <div className="space-y-3 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-xl font-extrabold tracking-tight text-on-surface">{animal.name || "A friend in need"}</h3><p className="mt-1 text-sm capitalize text-on-surface-variant">{animal.species}{animal.breed ? " · " + animal.breed : ""}</p></div><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-container/50 text-primary"><Heart className="h-4 w-4" /></span></div>
              {animal.territoryLabel && <p className="flex items-center gap-1.5 text-xs text-on-surface-variant"><MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />{animal.territoryLabel}</p>}
              {animal.description ? <p className="line-clamp-3 min-h-[3.75rem] text-sm leading-5 text-on-surface-variant">{animal.description}</p> : <p className="min-h-[3.75rem] text-sm leading-5 text-on-surface-variant">A temporary home can give this animal the space and care they need while the next steps are arranged.</p>}
              <div className="grid grid-cols-[1fr_1.15fr] gap-2 border-t border-outline-variant/30 pt-3"><Link href={"/animals/" + animal.id}><Button variant="ghost" size="sm" className="w-full bg-surface-container-high">Their story</Button></Link><Button variant="secondary" size="sm" className="w-full" onClick={() => { setSelected(animal); setSuccess(false); setError(null); }}>Offer a home</Button></div>
            </div>
          </Card>)}
        </div> : <EmptyState icon={Heart} title="No foster opportunities are published right now." />}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={success ? "Application received" : "Offer to foster"}>
        {success ? <div className="space-y-3 py-6 text-center"><CheckCircle className="mx-auto h-12 w-12 text-primary" /><h3 className="text-lg font-bold text-on-surface">Thank you for opening your home.</h3><p className="text-sm text-on-surface-variant">Your application is with the welfare team. They’ll review the details and follow up with you.</p><Button onClick={() => setSelected(null)}>Done</Button></div> :
          <form onSubmit={submit} className="space-y-4">
            {error && <p className="rounded-xl bg-error-container p-3 text-sm text-on-error-container">{error}</p>}
            <div className="rounded-xl bg-surface-container-low p-3"><p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">You’re offering care to</p><p className="mt-1 font-bold text-on-surface">{selected?.name || selected?.species}</p><p className="text-sm capitalize text-on-surface-variant">{selected?.species}{selected?.breed ? " · " + selected.breed : ""}</p></div>
            <div><Label>Why can you foster this animal?</Label><Textarea rows={3} required minLength={10} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us about the space and care you can provide..." /></div>
            <div><Label>Availability / duration</Label><Input required minLength={2} value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="e.g. weekdays, 3 weeks, until recovery" /></div>
            <div><Label>Relevant experience (optional)</Label><Textarea rows={2} value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="Any experience with animals or special care..." /></div>
            {!user && <p className="text-xs text-on-surface-variant">You’ll be asked to sign in before your application can be submitted.</p>}
            <Button type="submit" disabled={busy} className="w-full">{busy ? "Submitting..." : "Submit foster application"}</Button>
          </form>}
      </Modal>
    </div>
  );
}
