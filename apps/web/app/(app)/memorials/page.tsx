"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Plus, MapPin, Calendar, ArrowUpRight, PawPrint, Quote, ChevronDown, ChevronUp, Images } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { buttonVariants } from "@/components/ui/Button";
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-outline-variant bg-gradient-to-br from-[#243b35] via-[#344d42] to-[#6e6256] px-4 py-5 text-white sm:px-7 sm:py-8">
        <div className="pointer-events-none absolute -right-5 -top-5 opacity-[0.08] sm:-right-8 sm:-top-10"><PawPrint className="h-28 w-28 sm:h-48 sm:w-48" /></div>
        <div className="relative max-w-2xl pr-2 sm:pr-8">
          <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-white/65 sm:gap-2 sm:text-[10px] sm:tracking-[0.2em]"><Heart className="h-3.5 w-3.5 fill-current" /> A place for love that stays</p>
          <h2 className="mt-2 max-w-sm text-xl font-black leading-tight sm:max-w-none sm:text-3xl">Every life leaves a pawprint.</h2>
          <p className="mt-2 max-w-xl text-xs leading-relaxed text-white/75 sm:text-sm">Stories, little habits, and memories of the community dogs who will never be forgotten.</p>
        </div>
      </section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black leading-tight text-on-surface sm:text-2xl lg:text-3xl"><Heart className="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6" /> <span>Community Memorial Wall</span></h1>
          <p className="mt-1 text-xs leading-relaxed text-on-surface-variant sm:text-sm">Remembering the community dogs we loved and lost.</p>
        </div>
        <Link href="/memorials/new" className={buttonVariants({ variant: "primary", className: "inline-flex w-full justify-center sm:w-auto" })}><Plus className="w-4 h-4" /> Add a Memory</Link>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {(["all", "natural_death", "suspicious_death"] as Filter[]).map((f) => (
          <button key={f} onClick={() => { setFilter(f); setExpandedId(null); }} className={`shrink-0 rounded-full px-3 py-2 text-[11px] font-bold transition-colors sm:px-4 sm:text-xs ${filter === f ? "bg-primary text-on-primary" : "bg-surface-container-low text-on-surface-variant"}`}>
            {f === "all" ? "All memories" : f === "natural_death" ? "Natural causes" : "Suspicious death"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><PageSpinner label="Loading memorials..." /></div>
      ) : posts.length === 0 ? (
        <Card className="p-4 sm:p-8"><EmptyState icon={Heart} title="No memorials yet" description="Be the first to honor a community dog who touched your heart." /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {posts.map((post) => {
            const expanded = expandedId === post.id;
            const photos = (post.evidenceUrls ?? []).filter((url) => typeof url === "string" && url.trim().length > 0);
            return (
              <article key={post.id} className="min-w-0">
                <Card className={`h-full overflow-hidden !p-0 flex flex-col transition-all duration-200 ${expanded ? "border-primary/60 shadow-lg" : "hover:border-primary/40 hover:shadow-md"}`}>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={expanded}
                    aria-controls={`memory-details-${post.id}`}
                    onClick={() => setExpandedId((current) => current === post.id ? null : post.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setExpandedId((current) => current === post.id ? null : post.id);
                      }
                    }}
                    className="group block w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                  >                    <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#263b35] via-[#3c5147] to-[#78675a]">
                      {photos[0] ? (
                        <Photo
                          src={photos[0]}
                          alt={`Portrait of ${post.dogName || "a beloved community dog"}`}
                          loading="lazy"
                          className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="absolute inset-0 flex h-full w-full flex-col items-center justify-center gap-3 text-white">
                          <div className="rounded-full border border-white/25 bg-white/10 p-5"><PawPrint className="h-10 w-10" /></div>
                          <span className="text-xs font-medium tracking-wide text-white/75">Forever remembered</span>
                        </div>
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                      <div className="pointer-events-none absolute left-3 right-3 top-3 flex items-start justify-between gap-2 sm:left-4 sm:right-4 sm:top-4">
                        <Badge variant={post.category === "natural_death" ? "success" : "danger"} className="border border-white/20 bg-white/90 capitalize text-[8px] shadow-sm sm:text-[9px]">{post.category === "natural_death" ? "In loving memory" : "Remember & seek justice"}</Badge>
                        {photos.length > 1 && <span className="rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">+{photos.length - 1} photos</span>}
                      </div>
                      <div className="pointer-events-none absolute bottom-0 left-0 right-0 p-3.5 text-white sm:p-5">
                        <p className="mb-1 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/75 sm:text-[10px] sm:tracking-[0.16em]"><Heart className="h-3 w-3 fill-current" /> Always in our hearts</p>
                        <h2 className="text-xl font-black leading-tight drop-shadow-sm sm:text-2xl">{post.dogName || "A beloved community dog"}</h2>
                        <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/85 sm:text-xs"><Calendar className="h-3.5 w-3.5" /> Remembered {new Date(post.dateOfDeath).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                      </div>
                    </div>
                    <div className="flex min-h-[150px] flex-col p-3.5 sm:p-5">
                      {post.bestMemory ? (
                        <div className="flex gap-2.5"><Quote className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" /><p className="line-clamp-3 text-sm italic leading-relaxed text-on-surface-variant">{post.bestMemory}</p></div>
                      ) : (
                        <p className="line-clamp-3 text-sm leading-relaxed text-on-surface-variant">{post.description}</p>
                      )}
                      {post.location && <p className="mt-3 flex items-center gap-1.5 text-xs text-outline"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{post.location}</span></p>}
                      <span className="mt-auto flex items-center justify-between gap-2 border-t border-outline-variant/60 pt-3 mt-3 sm:pt-4 sm:mt-4">
                        <span className="min-w-0 truncate text-[11px] font-bold text-primary sm:text-xs">{expanded ? "Close memory" : "Tap to read the full memory"}</span>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-on-primary">{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
                      </span>
                    </div>
                  </div>
                  {expanded && (
                    <div id={`memory-details-${post.id}`} className="border-t border-outline-variant p-4 sm:p-5">
                      <h3 className="text-sm font-black text-on-surface">Their story</h3>
                      <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-on-surface-variant">{post.description}</p>
                      {post.bestMemory && <blockquote className="mt-4 rounded-xl border border-primary/15 bg-primary/5 p-3 text-sm italic leading-relaxed text-on-surface">“{post.bestMemory}”</blockquote>}
                      {post.causeOfDeath && <p className="mt-3 text-xs text-on-surface-variant"><strong>Reported cause:</strong> {post.causeOfDeath}</p>}
                      {photos.length > 1 && (
                        <div className="mt-4">
                          <p className="mb-2 flex items-center gap-2 text-xs font-bold text-on-surface"><Images className="h-4 w-4 text-primary" /> Photos ({photos.length})</p>
                          <div className="grid grid-cols-2 gap-2">
                            {photos.map((url, index) => <a key={url + index} href={url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="block aspect-square overflow-hidden rounded-lg border border-outline-variant bg-surface-container"><Photo src={url} alt={`${post.dogName || "Memorial"} photo ${index + 1}`} loading="lazy" className="h-full w-full object-cover object-center" /></a>)}
                          </div>
                        </div>
                      )}
                      <Link href={`/memorials/${post.id}`} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-on-primary transition-colors hover:opacity-90">
                        Open full memorial <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </div>
                  )}
                </Card>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
