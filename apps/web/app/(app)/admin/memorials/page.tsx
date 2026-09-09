"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, ShieldAlert, CheckCircle, XCircle, Eye } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { api, MemorialPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function AdminMemorialsPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<MemorialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.listMemorials(undefined, 100);
      setPosts(Array.isArray(data) ? data : []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const pending = posts.filter((p) => !p.isVerified);
  const suspicious = posts.filter((p) => p.category === "suspicious_death");
  const natural = posts.filter((p) => p.category === "natural_death");

  const handleVerify = async (id: string, isPublic: boolean) => {
    setActionId(id);
    try {
      await api.verifyMemorial(id, isPublic);
      await load();
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setActionId(id);
    try {
      await api.deleteMemorial(id);
      await load();
    } finally {
      setActionId(null);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><PageSpinner label="Loading memorials..." /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-1 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors"><Heart className="w-4 h-4" /> Admin</Link>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-2">Memorial Wall</h1>
          <p className="text-sm text-on-surface-variant mt-1">Review suspicious death submissions. Natural deaths are published automatically.</p>
        </div>
        <Button variant="ghost" onClick={load} className="bg-surface-container-high">Refresh</Button>
      </div>

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-error" /> Suspicious Deaths — Pending Review ({pending.filter((p) => p.category === "suspicious_death").length})</h2>
        {pending.filter((p) => p.category === "suspicious_death").length === 0 ? (
          <Card className="p-6"><p className="text-sm text-on-surface-variant">No suspicious death submissions pending review.</p></Card>
        ) : (
          <div className="space-y-3">
            {pending.filter((p) => p.category === "suspicious_death").map((post) => (
              <Card key={post.id} className="p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-on-surface text-sm">{post.dogName || "Unknown community dog"}</h3>
                  <Badge variant="danger" className="capitalize">{post.category.replace("_", " ")}</Badge>
                </div>
                <p className="text-xs text-on-surface-variant">{new Date(post.dateOfDeath).toLocaleDateString("en-IN")} • {post.location || "Location not provided"}</p>
                <p className="text-xs text-on-surface-variant line-clamp-3">{post.description}</p>
                {post.evidenceUrls.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {post.evidenceUrls.slice(0, 4).map((url, i) => <img key={i} src={url} alt="" className="w-16 h-16 rounded-md object-cover border border-outline-variant" />)}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="primary" onClick={() => handleVerify(post.id, true)} disabled={actionId === post.id}>{actionId === post.id ? "Approving..." : "Approve & Publish"}</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleVerify(post.id, false)} disabled={actionId === post.id}>Reject</Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(post.id)} disabled={actionId === post.id}>Delete</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-600" /> Natural Deaths ({natural.length})</h2>
        {natural.length === 0 ? (
          <Card className="p-6"><p className="text-sm text-on-surface-variant">No natural death memorials yet.</p></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {natural.map((post) => (
              <Card key={post.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-on-surface text-sm">{post.dogName || "Unknown community dog"}</h3>
                    <p className="text-[10px] text-outline mt-0.5">{new Date(post.dateOfDeath).toLocaleDateString("en-IN")}</p>
                  </div>
                  <Badge variant="success" className="capitalize">Published</Badge>
                </div>
                <p className="text-xs text-on-surface-variant line-clamp-2">{post.description}</p>
                {post.evidenceUrls.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {post.evidenceUrls.slice(0, 3).map((url, i) => <img key={i} src={url} alt="" className="w-12 h-12 rounded-md object-cover border border-outline-variant" />)}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
