"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowUpRight, BookOpen, Clock3, RefreshCw, ShieldAlert } from "lucide-react";
import { api, Case } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { statusToken } from "@/lib/status";

type Story = {
  id: string;
  title: string;
  body: string;
  category: string;
  animal_name?: string | null;
  broad_location?: string | null;
  author_name?: string;
  published_at?: string | null;
  created_at: string;
};

type FeedFilter = "all" | "emergencies" | "my-cases" | "stories";

const FILTERS: Array<{ value: FeedFilter; label: string }> = [
  { value: "all", label: "All updates" },
  { value: "emergencies", label: "Open cases" },
  { value: "my-cases", label: "My cases" },
  { value: "stories", label: "Community stories" },
];

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
      .filter((item) => (!item.heldForReview || item.reporterUserId === user?.id || item.assignedToUserId === user?.id) && (item.status === "open" || item.reporterUserId === user?.id || item.assignedToUserId === user?.id))
      .map((item) => ({
        id: `case:${item.id}`,
        kind: "case" as const,
        title: item.title || "Animal welfare case",
        summary: item.description,
        timestamp: item.updatedAt || item.createdAt,
        href: `/cases/${item.id}`,
        caseItem: item,
      }));
    const storyItems = stories.map((item) => ({
      id: `story:${item.id}`,
      kind: "story" as const,
      title: item.title,
      summary: item.body,
      timestamp: item.published_at || item.created_at,
      href: "/community-stories",
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
    <Card className="p-4 sm:p-5 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Home feed</p>
          <h2 className="text-lg sm:text-xl font-black text-on-surface">Useful updates for animals</h2>
          <p className="mt-1 text-xs sm:text-sm text-on-surface-variant">Open animal-welfare cases and published community stories, with direct paths to act.</p>
          {updatedAt && <p className="mt-1 text-[11px] text-outline">Updated {formatDateTime(updatedAt.toISOString())}</p>}
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh(true)} disabled={loading || refreshing} className="self-start rounded-full">
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter home updates">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={filter === item.value}
            onClick={() => setFilter(item.value)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${filter === item.value ? "border-primary bg-primary text-white" : "border-outline-variant text-on-surface-variant hover:bg-surface-container"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {hasSourceError && (
        <div className="flex items-start gap-2 rounded-lg border border-error/30 bg-error-container/50 p-3 text-xs text-on-error-container" role="status">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <p className="font-bold">Some updates could not be loaded.</p>
            <p>Any updates that did load remain available. Try refreshing to check again.</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3" aria-label="Loading home updates" aria-live="polite">
          {[0, 1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-surface-container" />)}
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="rounded-xl bg-surface-container-low p-5 text-center">
          <BookOpen className="mx-auto h-6 w-6 text-outline" />
          <p className="mt-2 text-sm font-bold text-on-surface">No updates in this view yet</p>
          <p className="mt-1 text-xs text-on-surface-variant">Check another filter or use a quick action to report an animal in need.</p>
          <Link href="/respond" className="mt-3 inline-flex items-center text-xs font-bold text-primary hover:underline">
            View open cases <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-outline-variant" aria-label="Home activity updates">
          {visibleItems.slice(0, 10).map((item) => (
            <article key={item.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${item.kind === "case" && item.caseItem.status === "open" ? "bg-error-container text-on-error-container" : "bg-surface-container text-primary"}`}>
                  {item.kind === "case" && item.caseItem.status === "open" ? <ShieldAlert className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-on-surface">{item.title}</p>
                    {item.kind === "case" && <StatusBadge token={statusToken.caseStatus(item.caseItem.status)} />}
                    {item.kind === "case" && item.caseItem.status === "open" && item.caseItem.priority === "high" && <span className="rounded-full bg-error-container px-2 py-0.5 text-[10px] font-black text-on-error-container">High priority</span>}
                    {item.kind === "story" && <span className="rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">Community story</span>}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-on-surface-variant">{item.summary}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-outline">
                    <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{item.timestamp ? formatDateTime(item.timestamp) : "Recently updated"}</span>
                    {item.kind === "story" && item.storyItem.animal_name && <span>About {item.storyItem.animal_name}</span>}
                    {item.kind === "story" && item.storyItem.broad_location && <span>{item.storyItem.broad_location}</span>}
                    {item.kind === "case" && item.caseItem.locationText && <span>{item.caseItem.locationText}</span>}
                  </div>
                  <Link href={item.href} className="mt-2 inline-flex items-center text-xs font-extrabold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    {item.kind === "case" ? "View case" : "Read community stories"} <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </Card>
  );
}
