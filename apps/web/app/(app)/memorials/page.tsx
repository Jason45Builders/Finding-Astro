"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Plus, MapPin, Calendar, ShieldAlert, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
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
            <Card key={post.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-on-surface text-sm">{post.dogName || "Unknown community dog"}</h3>
                  <p className="text-[10px] text-outline mt-0.5">{new Date(post.dateOfDeath).toLocaleDateString("en-IN")}</p>
                </div>
                <Badge variant={post.category === "natural_death" ? "success" : "danger"} className="capitalize">{post.category.replace("_", " ")}</Badge>
              </div>
              {post.location && <p className="text-xs text-on-surface-variant flex items-center gap-1"><MapPin className="w-3 h-3" /> {post.location}</p>}
              <p className="text-xs text-on-surface-variant line-clamp-3 leading-relaxed">{post.description}</p>
              {post.bestMemory && <p className="text-xs text-on-surface-variant italic line-clamp-2">“{post.bestMemory}”</p>}
              {post.evidenceUrls.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {post.evidenceUrls.slice(0, 4).map((url, i) => (
                    <img key={i} src={url} alt="" className="w-14 h-14 rounded-md object-cover border border-outline-variant" />
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                {post.category === "suspicious_death" && <span className="text-[10px] font-bold text-error flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Under review</span>}
                {post.isAnonymous && <span className="text-[10px] text-outline">Anonymous</span>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
