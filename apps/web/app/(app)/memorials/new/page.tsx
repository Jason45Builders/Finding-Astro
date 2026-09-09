"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Heart, MapPin, Calendar, Camera, ShieldAlert, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { PageSpinner } from "@/components/ui/Spinner";

const CATEGORIES = [
  { value: "natural_death", label: "Natural death / In memory of", icon: Sparkles, tone: "Peaceful passing or old age" },
  { value: "suspicious_death", label: "Suspicious death / Cruelty", icon: ShieldAlert, tone: "Poisoning, hit-and-run, abuse, unknown" },
] as const;

export default function NewMemorialPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const [form, setForm] = useState({
    dogName: "",
    category: "natural_death" as "natural_death" | "suspicious_death",
    description: "",
    bestMemory: "",
    location: "",
    dateOfDeath: new Date().toISOString().slice(0, 10),
    causeOfDeath: "",
    isAnonymous: true,
  });

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [user, isLoading, router]);

  if (!user) return null;

  const detectLocation = () => {
    setDetecting(true);
    navigator.geolocation?.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); setDetecting(false); },
      () => setDetecting(false)
    );
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    const combined = [...files, ...selected].slice(0, 10);
    setFiles(combined);
    setPreviews(combined.map((f) => URL.createObjectURL(f)));
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
    setPreviews((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (previews[index]) URL.revokeObjectURL(previews[index]);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    try {
      const evidenceUrls: string[] = [];
      for (const file of files) {
        const upload = await api.uploadMedia(file, "profile");
        evidenceUrls.push(upload.publicUrl);
      }

      const memorial = await api.createMemorial({
        dogName: form.dogName,
        category: form.category,
        description: form.description,
        bestMemory: form.bestMemory || undefined,
        location: form.location || undefined,
        latitude: lat ?? undefined,
        longitude: lng ?? undefined,
        dateOfDeath: form.dateOfDeath,
        causeOfDeath: form.causeOfDeath || undefined,
        evidenceUrls,
        isAnonymous: form.isAnonymous,
      });

      if (memorial) {
        setSuccess(true);
        setTimeout(() => router.push("/memorials"), 1500);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create memorial");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/memorials" className="inline-flex items-center gap-1 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors"><ChevronLeft className="w-4 h-4" /> Memorial Wall</Link>

      <Card className="p-6 sm:p-8 space-y-6">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-2"><Heart className="w-6 h-6 text-primary" /> Add a Memory</h1>
          <p className="text-sm text-on-surface-variant mt-1">Honor a community dog who touched your heart.</p>
        </div>

        {error && <div className="bg-error-container text-on-error-container p-4 rounded-md text-sm font-medium">{error}</div>}
        {success && <div className="bg-green-100 text-green-800 p-4 rounded-md text-sm font-bold">Memorial submitted. Redirecting...</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label className="mb-0">Category <span className="text-error">*</span></Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CATEGORIES.map((c) => (
                <button key={c.value} type="button" onClick={() => setForm((f) => ({ ...f, category: c.value }))} className={`p-4 rounded-xl border-2 text-left transition-all ${form.category === c.value ? "border-primary bg-primary-container" : "border-outline-variant bg-surface-container-low"}`}>
                  <c.icon className={`w-5 h-5 mb-2 ${form.category === c.value ? "text-primary" : "text-on-surface-variant"}`} />
                  <p className="text-sm font-bold text-on-surface">{c.label}</p>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">{c.tone}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="mb-0">Dog name <span className="text-error">*</span></Label>
            <Input value={form.dogName} onChange={(e) => setForm((f) => ({ ...f, dogName: e.target.value }))} required placeholder="e.g. Bruno, Unknown community dog" />
          </div>

          <div className="space-y-2">
            <Label className="mb-0">What happened / memories <span className="text-error">*</span></Label>
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required rows={4} placeholder="Share what made this dog special..." />
          </div>

          <div className="space-y-2">
            <Label className="mb-0">Best memory / What will you miss most?</Label>
            <Textarea value={form.bestMemory} onChange={(e) => setForm((f) => ({ ...f, bestMemory: e.target.value }))} rows={3} placeholder="A favorite moment, habit, or trait..." />
          </div>

          <div className="space-y-2">
            <Label className="mb-0">Location</Label>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Area / landmark" className="flex-1" />
              <Button type="button" variant="ghost" onClick={detectLocation} disabled={detecting} className="bg-surface-container-high shrink-0"><MapPin className="w-4 h-4" /> {detecting ? "Detecting..." : "Detect"}</Button>
            </div>
            {(lat !== null && lng !== null) && <p className="text-[10px] text-primary font-bold">Location tagged</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="mb-0">Date <span className="text-error">*</span></Label>
               <Input type="date" value={form.dateOfDeath} onChange={(e) => setForm((f) => ({ ...f, dateOfDeath: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label className="mb-0">Cause of death</Label>
              <Input value={form.causeOfDeath} onChange={(e) => setForm((f) => ({ ...f, causeOfDeath: e.target.value }))} placeholder="Natural / Poisoning / Hit-and-run / Unknown" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="mb-0">Photos</Label>
            <div className="flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative w-20 h-20">
                  <img src={src} alt="" className="w-full h-full object-cover rounded-md border border-outline-variant" />
                  <button type="button" onClick={() => removeFile(i)} className="absolute -top-1.5 -right-1.5 bg-error text-white rounded-full w-5 h-5 text-[10px] font-bold">×</button>
                </div>
              ))}
              {files.length < 10 && (
                <label className="w-20 h-20 rounded-md border-2 border-dashed border-outline-variant flex items-center justify-center cursor-pointer hover:bg-surface-container-low transition-colors">
                  <Camera className="w-5 h-5 text-outline" />
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
                </label>
              )}
            </div>
            <p className="text-[10px] text-outline">Up to 10 photos. They will be reviewed before publishing.</p>
          </div>

          <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant">
            <div>
              <p className="font-bold text-on-surface text-sm">Post anonymously</p>
              <p className="text-xs text-on-surface-variant mt-0.5">Your name will not be shown publicly.</p>
            </div>
            <button type="button" onClick={() => setForm((f) => ({ ...f, isAnonymous: !f.isAnonymous }))} className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${form.isAnonymous ? "bg-primary" : "bg-surface-container-highest"}`}>
              <span className={`inline-block h-5 w-5 transform rounded-full bg-surface shadow-sm transition-transform ${form.isAnonymous ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
            {submitting ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Submit Memorial"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
