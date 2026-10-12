"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Calendar, CheckCircle2, Clock3, Heart, MapPin, PawPrint, Quote, ShieldAlert, Images, Info } from "lucide-react";
import { api, MemorialPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Photo } from "@/components/ui/Photo";
import { PageSpinner } from "@/components/ui/Spinner";

function formatDate(value: string) {
  if (!value) return "Date not provided";
  const date = new Date(value + (value.length === 10 ? "T12:00:00" : ""));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export default function MemorialDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [memorial, setMemorial] = useState<MemorialPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.getMemorial(params.id).then((result) => {
      if (!cancelled) setMemorial(result);
    }).catch((err: unknown) => {
      if (!cancelled) setError(err instanceof Error ? err.message : "This memorial could not be found.");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [params?.id]);

  if (loading) return <PageSpinner label="Opening this memory..." />;

  if (!memorial) return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary"><Heart className="h-8 w-8" /></div>
      <h1 className="mt-4 text-xl font-black text-on-surface">Memorial not available</h1>
      <p className="mt-2 text-sm text-on-surface-variant">{error || "This memorial may have been removed or is not available to your account."}</p>
      <Link href="/memorials" className="mt-5 inline-flex items-center gap-2 rounded-md bg-secondary-container px-4 py-2.5 text-sm font-bold text-on-secondary-container transition-colors hover:bg-secondary/20"><ArrowLeft className="h-4 w-4" /> Back to Memorial Wall</Link>
    </div>
  );

  const isOwner = user?.id === memorial.reporterUserId;
  const canModerate = user ? ["admin", "govt", "ngo"].includes(user.role) : false;
  const isPending = !memorial.isPublic && (isOwner || canModerate);
  const heroImage = memorial.evidenceUrls[0];

  return (
    <div className="mx-auto max-w-5xl space-y-5 sm:space-y-7">
      <Link href="/memorials" className="inline-flex items-center gap-2 text-sm font-bold text-on-surface-variant transition-colors hover:text-primary"><ArrowLeft className="h-4 w-4" /> Back to Memorial Wall</Link>

      {isPending && (
        <div className="flex items-start gap-3 rounded-xl border border-secondary/30 bg-secondary-container p-4 text-on-secondary-container">
          <Clock3 className="mt-0.5 h-5 w-5 shrink-0" />
          <div><p className="text-sm font-bold">This memory is awaiting review</p><p className="mt-1 text-sm leading-relaxed">You can view the submission here. It will appear on the public Memorial Wall only after it has been approved for publication.</p></div>
        </div>
      )}

      <Card className="overflow-hidden !p-0">
        <div className="relative min-h-[280px] overflow-hidden bg-gradient-to-br from-[#263b35] via-[#3c5147] to-[#78675a] sm:min-h-[420px]">
          {heroImage ? <Photo src={heroImage} alt={memorial.dogName ? memorial.dogName + " memorial portrait" : "Memorial portrait"} className="absolute inset-0 h-full w-full object-cover" /> : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white"><div className="rounded-full border border-white/20 bg-white/10 p-6"><PawPrint className="h-12 w-12" /></div><span className="text-sm font-medium text-white/75">Forever remembered</span></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/5" />
          <div className="absolute left-5 right-5 top-5 flex flex-wrap items-center gap-2 sm:left-8 sm:right-8 sm:top-8">
            <Badge variant={memorial.category === "natural_death" ? "success" : "danger"} className="border border-white/20 bg-white/90">{memorial.category === "natural_death" ? "In loving memory" : "Suspicious death / cruelty"}</Badge>
            {memorial.isVerified && <Badge variant="info" className="border border-white/20 bg-white/90"><CheckCircle2 className="mr-1 h-3 w-3" /> Reviewed</Badge>}
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-5 text-white sm:p-8">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/70"><Heart className="h-3.5 w-3.5 fill-current" /> Always in our hearts</p>
            <h1 className="mt-2 text-3xl font-black leading-tight sm:text-5xl">{memorial.dogName || "A beloved community dog"}</h1>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/85">
              <span className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Remembered {formatDate(memorial.dateOfDeath)}</span>
              {memorial.location && <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {memorial.location}</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 p-5 sm:grid-cols-[minmax(0,1fr)_260px] sm:p-8">
          <div className="space-y-6">
            <section>
              <h2 className="flex items-center gap-2 text-lg font-black text-on-surface"><Heart className="h-5 w-5 text-primary" /> Their story</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-on-surface-variant sm:text-base">{memorial.description}</p>
            </section>
            {memorial.bestMemory && (
              <section className="rounded-xl border border-primary/15 bg-primary/5 p-5 sm:p-6">
                <Quote className="h-6 w-6 text-primary/70" />
                <p className="mt-3 whitespace-pre-line text-base italic leading-relaxed text-on-surface sm:text-lg">“{memorial.bestMemory}”</p>
                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.15em] text-outline">A memory to keep</p>
              </section>
            )}
            {memorial.evidenceUrls.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-lg font-black text-on-surface"><Images className="h-5 w-5 text-primary" /> Photos and memories <span className="text-sm font-semibold text-outline">({memorial.evidenceUrls.length})</span></h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {memorial.evidenceUrls.map((url, index) => (
                    <a key={url + index} href={url} target="_blank" rel="noreferrer" aria-label={"Open memorial photo " + (index + 1)} className="group relative aspect-square overflow-hidden rounded-xl border border-outline-variant bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                      <Photo src={url} alt={memorial.dogName ? memorial.dogName + " — photo " + (index + 1) : "Memorial photo " + (index + 1)} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-1 text-[10px] font-bold text-white">View photo ↗</span>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-3">
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-outline">Memorial details</p>
              <dl className="mt-3 space-y-4">
                <div><dt className="text-xs text-on-surface-variant">Date</dt><dd className="mt-1 text-sm font-bold text-on-surface">{formatDate(memorial.dateOfDeath)}</dd></div>
                {memorial.causeOfDeath && <div><dt className="text-xs text-on-surface-variant">Reported cause</dt><dd className="mt-1 text-sm font-semibold text-on-surface">{memorial.causeOfDeath}</dd></div>}
                {memorial.location && <div><dt className="text-xs text-on-surface-variant">Location</dt><dd className="mt-1 flex items-start gap-1.5 text-sm font-semibold text-on-surface"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{memorial.location}</dd></div>}
                <div><dt className="text-xs text-on-surface-variant">Shared by</dt><dd className="mt-1 text-sm font-semibold text-on-surface">{memorial.isAnonymous ? "A community member" : "Community contributor"}</dd></div>
              </dl>
            </div>
            {memorial.category === "suspicious_death" && (
              <div className="flex items-start gap-3 rounded-xl border border-error/20 bg-error/5 p-4">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-error" />
                <div><p className="text-sm font-bold text-on-surface">Cruelty concern</p><p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{memorial.isVerified ? "This report has been reviewed by the moderation team." : "This report has not yet been marked as reviewed."}</p></div>
              </div>
            )}
            <div className="flex items-start gap-2 rounded-xl bg-surface-container-low p-4 text-xs leading-relaxed text-on-surface-variant"><Info className="mt-0.5 h-4 w-4 shrink-0 text-outline" /> Shared in remembrance. Please keep comments and interactions compassionate and respectful.</div>
            <Link href="/memorials" className="block"><Button variant="secondary" className="w-full"><ArrowLeft className="h-4 w-4" /> Return to the wall</Button></Link>
          </aside>
        </div>
      </Card>
    </div>
  );
}
