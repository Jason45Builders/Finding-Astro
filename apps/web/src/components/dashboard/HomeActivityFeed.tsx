"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  Clock3,
  MapPin,
  PawPrint,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { api, Case } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Photo } from "@/components/ui/Photo";
import { statusToken } from "@/lib/status";

type Story = {
  id: string;
  title: string;
  body: string;
  category: string;
  animal_name?: string | null;
  animal_species?: string | null;
  broad_location?: string | null;
  author_name?: string;
  media_urls?: string[] | null;
  is_featured?: boolean;
  published_at?: string | null;
  created_at: string;
};

type FeedFilter = "all" | "emergencies" | "my-cases" | "stories";

const FILTERS: Array<{ value: FeedFilter; label: string }> = [
  { value: "all", label: "For the community" },
  { value: "emergencies", label: "Open cases" },
  { value: "my-cases", label: "My cases" },
  { value: "stories", label: "Stories" },
];

function storyCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    rescue: "Rescue story",
    adoption: "Adoption",
    everyday_kindness: "Everyday kindness",
    happy_memory: "Happy memory",
    community_impact: "Community impact",
    other: "Community story",
  };
  return labels[category] ?? "Community story";
}

export function HomeActivityFeed() {
  const { user } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [caseError, setCaseError] = useState(false);
  const [storyError, setStoryError] = useState(false);

  const refresh = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);

    const [caseResult, storyResult] = await Promise.allSettled([
      api.listCases({ limit: 8, publicFeed: true }),
      api.listCommunityStories(6),
    ]);

    if (caseResult.status === "fulfilled") {
      setCases(caseResult.value);
      setCaseError(false);
    } else {
      setCaseError(true);
    }

    if (storyResult.status === "fulfilled") {
      setStories(storyResult.value);
      setStoryError(false);
    } else {
      setStoryError(true);
    }

    setUpdatedAt(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const items = useMemo(() => {
    const caseItems = cases
      .filter((item) =>
        (!item.heldForReview ||
          item.reporterUserId === user?.id ||
          item.assignedToUserId === user?.id) &&
        (item.status === "open" ||
          item.reporterUserId === user?.id ||
          item.assignedToUserId === user?.id)
      )
      .map((item) => ({
        id: `case:${item.id}`,
        kind: "case" as const,
        title: item.title || "Animal welfare case",
        summary: item.description,
        timestamp: item.updatedAt || item.createdAt,
        href: `/cases/${item.id}`,
        imageUrl: item.evidenceUrls?.[0] ?? null,
        caseItem: item,
      }));

    const storyItems = stories.map((item) => ({
      id: `story:${item.id}`,
      kind: "story" as const,
      title: item.title,
      summary: item.body,
      timestamp: item.published_at || item.created_at,
      href: "/community-stories",
      imageUrl: item.media_urls?.[0] ?? null,
      storyItem: item,
    }));

    return [...caseItems, ...storyItems].sort((a, b) => {
      const aUrgent = a.kind === "case" && a.caseItem.status === "open" && a.caseItem.priority === "high" ? 1 : 0;
      const bUrgent = b.kind === "case" && b.caseItem.status === "open" && b.caseItem.priority === "high" ? 1 : 0;
      if (aUrgent !== bUrgent) return bUrgent - aUrgent;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [cases, stories, user?.id]);

  const visibleItems = items.filter((item) => {
    if (filter === "emergencies") return item.kind === "case" && item.caseItem.status === "open";
    if (filter === "my-cases") return item.kind === "case" && (item.caseItem.reporterUserId === user?.id || item.caseItem.assignedToUserId === user?.id);
    if (filter === "stories") return item.kind === "story";
    return true;
  });

  const hasSourceError = caseError || storyError;

  return (
    <section className="space-y-5 sm:space-y-6" aria-labelledby="home-feed-title">
      <div className="relative overflow-hidden rounded-2xl border border-outline-variant bg-gradient-to-br from-surface-container-lowest via-surface-container-low to-surface-container p-4 sm:p-6">
        <div className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">
              <PawPrint className="h-3.5 w-3.5" />
              The community pulse
            </div>
            <h2 id="home-feed-title" className="text-xl font-black tracking-tight text-on-surface sm:text-2xl">
              Where animals need us
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
              Real cases, small acts of kindness, and stories from people making a difference.
            </p>
            {updatedAt && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-outline">
                <Clock3 className="h-3 w-3" />
                Updated {formatDateTime(updatedAt.toISOString())}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => void refresh(true)} disabled={loading || refreshing} className="self-start rounded-full bg-surface-container-lowest sm:self-auto">
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
        </div>

        <div className="relative mt-5 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter home updates">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={filter === item.value}
              onClick={() => setFilter(item.value)}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${filter === item.value ? "border-primary bg-primary text-white shadow-sm" : "border-outline-variant bg-surface-container-lowest/80 text-on-surface-variant hover:border-primary/40 hover:text-on-surface"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {hasSourceError && (
        <div className="flex items-start gap-2 rounded-xl border border-error/30 bg-error-container/50 p-3.5 text-sm text-on-error-container" role="status">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <p className="font-bold">Some updates could not be loaded.</p>
            <p className="mt-0.5 text-xs">Anything that loaded is still available. Refresh to try the missing source again.</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2" aria-label="Loading home updates" aria-live="polite">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
              <div className="h-36 animate-pulse bg-surface-container sm:h-44" />
              <div className="space-y-3 p-4">
                <div className="h-3 w-24 animate-pulse rounded bg-surface-container" />
                <div className="h-5 w-4/5 animate-pulse rounded bg-surface-container" />
                <div className="h-3 w-full animate-pulse rounded bg-surface-container" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-surface-container" />
              </div>
            </div>
          ))}
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest px-5 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BookOpen className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm font-extrabold text-on-surface">Nothing new in this view just yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-on-surface-variant">Try another filter, or take the first step by reporting an animal who needs help.</p>
          <Link href="/respond" className="mt-4 inline-flex items-center rounded-full bg-primary px-4 py-2.5 text-xs font-extrabold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            Explore open cases <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:gap-5" aria-label="Home activity updates">
          {visibleItems.slice(0, 10).map((item) => {
            const isCase = item.kind === "case";
            const isUrgent = isCase && item.caseItem.status === "open" && item.caseItem.priority === "high";
            const location = isCase ? item.caseItem.locationText : item.storyItem.broad_location;
            const imageAlt = isCase ? `Animal photo for ${item.title}` : `Photo from the story ${item.title}`;
            return (
              <article
                key={item.id}
                className={`group flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-surface-container-lowest shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${isUrgent ? "border-error/40 hover:border-error/70" : "border-outline-variant hover:border-primary/35"}`}
              >
                <div className={`relative h-40 overflow-hidden sm:h-48 ${isCase ? "bg-gradient-to-br from-rose-100 via-orange-50 to-amber-100" : "bg-gradient-to-br from-emerald-100 via-teal-50 to-sky-100"}`}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border border-white/70 bg-white/55 shadow-sm backdrop-blur ${isCase ? "text-rose-700" : "text-emerald-800"}`}>
                      {isCase ? <ShieldAlert className="h-7 w-7" /> : <BookOpen className="h-7 w-7" />}
                    </div>
                  </div>
                  {item.imageUrl && (
                    <Photo
                      src={item.imageUrl}
                      alt={imageAlt}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-black/15" />
                  <div className="absolute left-3 top-3 flex max-w-[75%] flex-wrap gap-1.5">
                    {isCase ? (
                      <>
                        <span className="rounded-full border border-white/30 bg-black/45 px-2.5 py-1 text-[10px] font-extrabold text-white backdrop-blur-sm">Rescue case</span>
                        {isUrgent && <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-sm"><ShieldAlert className="h-3 w-3" /> High priority</span>}
                      </>
                    ) : (
                      <>
                        <span className="rounded-full border border-white/30 bg-black/45 px-2.5 py-1 text-[10px] font-extrabold text-white backdrop-blur-sm">{storyCategoryLabel(item.storyItem.category)}</span>
                        {item.storyItem.is_featured && <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-extrabold text-emerald-900"><Sparkles className="h-3 w-3" /> Featured</span>}
                      </>
                    )}
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 text-white">
                    <p className="min-w-0 truncate text-[11px] font-semibold drop-shadow">{location || (isCase ? "Community report" : "Community story")}</p>
                    {isCase && <StatusBadge token={statusToken.caseStatus(item.caseItem.status)} />}
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2 text-[11px] text-outline">
                    <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
                      <Clock3 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{item.timestamp ? formatDateTime(item.timestamp) : "Recently updated"}</span>
                    </span>
                    {isCase && item.caseItem.caseType && (
                      <span className="shrink-0 rounded-md bg-surface-container px-2 py-1 font-bold capitalize text-on-surface-variant">{item.caseItem.caseType.replace("_", " ")}</span>
                    )}
                    {!isCase && item.storyItem.animal_name && (
                      <span className="shrink-0 rounded-md bg-surface-container px-2 py-1 font-bold text-on-surface-variant">Meet {item.storyItem.animal_name}</span>
                    )}
                  </div>
                  <h3 className="mt-3 line-clamp-2 text-base font-black leading-snug tracking-tight text-on-surface sm:text-lg">{item.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-on-surface-variant">{item.summary}</p>

                  {!isCase && item.storyItem.author_name && (
                    <p className="mt-3 text-xs font-semibold text-on-surface-variant">Shared by {item.storyItem.author_name}</p>
                  )}

                  <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                    <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] text-outline">
                      {location && <><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{location}</span></>}
                    </span>
                    <Link
                      href={item.href}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-2.5 text-xs font-extrabold text-primary transition-colors hover:bg-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      {isCase ? "View case" : "Read story"}
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
