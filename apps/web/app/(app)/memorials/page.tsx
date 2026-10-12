"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Plus, MapPin, Calendar, ShieldAlert, Sparkles, ArrowUpRight, PawPrint, Quote } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Photo } from "@/components/ui/Photo";
import { api, MemorialPost } from "@/lib/api";

type Filter = "all" | "natural_death" | "suspicious_death";

export default function MemorialsPage() {
  const [posts, setPosts] = useState<MemorialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.listMemorials(filter === "all" ? undefined : filter, 50);
      setPosts(Array.isArray(data) ? data : []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [filter]);

  const filtered = posts;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-outline-variant bg-gradient-to-br from-[#243b35] via-[#344d42] to-[#6e6256] px-5 py-7 text-white sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -right-8 -top-10 opacity-[0.08]"><PawPrint className="h-48 w-48" /></div>
        <div className="relative max-w-2xl">
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/65"><Heart className="h-3.5 w-3.5 fill-current" /> A place for love that stays</p>
          <h2 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">Every life leaves a pawprint.</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75">Stories, little habits, and memories of the community dogs who will never be forgotten.</p>
        </div>
      </section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-2">
            <Heart className="w-6 h-6 text-primary" /> Community Memorial Wall
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">Remembering the community dogs we loved and lost.</p>
        </div>
        <Link href="/memorials/new"><Button variant="primary"><Plus className="w-4 h-4" /> Add a Memory</Button></Link>
      </div>

      <div className="flex gap-2">
        {(["all", "natural_death", "suspicious_death"] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-md text-xs font-bold capitalize transition-colors ${filter === f ? "bg-primary text-on-primary" : "bg-surface-container-low text-on-surface-variant"}`}>
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><PageSpinner label="Loading memorials..." /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-8"><EmptyState icon={Heart} title="No memorials yet" description="Be the first to honor a community dog who touched your heart." /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((post) => (
            <Link key={post.id} href={"/memorials/" + post.id} className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              <Card className="h-full overflow-hidden !p-0 flex flex-col transition-all duration-200 group-hover:-translate-y-1 group-hover:border-primary/50 group-hover:shadow-lg">
                <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-stone-200 via-rose-100 to-amber-100">
                  {post.evidenceUrls[0] ? (
                    <Photo src={post.evidenceUrls[0]} alt={"Portrait of " + (post.dogName || "a beloved community dog")} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#263b35] via-[#3c5147] to-[#78675a] text-white">
                      <div className="rounded-full border border-white/25 bg-white/10 p-5"><PawPrint className="h-10 w-10" /></div>
                      <span className="text-xs font-medium tracking-wide text-white/75">Forever remembered</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-2">
                    <Badge variant={post.category === "natural_death" ? "success" : "danger"} className="border border-white/20 bg-white/90 capitalize text-[9px] shadow-sm">{post.category === "natural_death" ? "In loving memory" : "Remember & seek justice"}</Badge>
                    {post.evidenceUrls.length > 1 && <span className="rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">+{post.evidenceUrls.length - 1} photos</span>}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                    <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/75"><Heart className="h-3 w-3 fill-current" /> Always in our hearts</p>
                    <h2 className="font-headline-lg text-2xl font-black leading-tight drop-shadow-sm">{post.dogName || "A beloved community dog"}</h2>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-white/85"><Calendar className="h-3.5 w-3.5" /> Remembered {new Date(post.dateOfDeath).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  {post.bestMemory ? (
                    <div className="flex gap-2.5"><Quote className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" /><p className="line-clamp-2 text-sm italic leading-relaxed text-on-surface-variant">{post.bestMemory}</p></div>
                  ) : (
                    <p className="line-clamp-3 text-sm leading-relaxed text-on-surface-variant">{post.description}</p>
                  )}
                  {post.location && <p className="mt-3 flex items-center gap-1.5 text-xs text-outline"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{post.location}</span></p>}
                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-outline-variant/60 pt-4 mt-4">
                    <span className="text-xs font-bold text-primary">Read {post.dogName ? post.dogName + "’s story" : "their story"}</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-on-primary"><ArrowUpRight className="h-4 w-4" /></span>
                  </div>
                </div>
              </Card>
            </Link>
          ))
        </div>
      )}
    </div>
  );
}
