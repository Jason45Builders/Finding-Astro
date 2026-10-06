"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, HeartHandshake, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export default function CreateRescueCollectivePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await api.createWelfareGroup({
        name,
        groupType: "rescue_collective",
        city: city || undefined,
        address: address || undefined,
        phone: phone || undefined,
        email: email || undefined,
        website: website || undefined,
      });
      api.setActiveOrgId(result.group.id);
      router.replace("/org/dashboard");
    } catch (err: any) {
      setError(err?.message || "Unable to create rescue collective");
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to my dashboard
        </Link>

        <Card className="overflow-hidden">
          <div className="bg-primary px-6 py-8 sm:px-8">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-white/15 p-3">
                <HeartHandshake className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-white/70">Community action</p>
                <h1 className="mt-1 text-2xl sm:text-3xl font-black text-white">Start a local Rescue Collective</h1>
                <p className="mt-2 max-w-2xl text-sm text-white/80">
                  Bring your local rescuers together in one shared workspace for animals, cases, tasks and volunteers.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex gap-3">
                <Users className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-on-surface">Built for local rescue groups</p>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    You do not need to be a registered NGO to start a Rescue Collective. Your Finding Astro account becomes the first group admin, and the collective can operate while unverified.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label>Collective name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. South Chennai Rescuers" required />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Chennai" /></div>
                <div><Label>Contact phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91..." /></div>
              </div>

              <div><Label>Operating area / address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Optional base or neighbourhood" /></div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>Contact email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="team@example.org" /></div>
                <div><Label>Website</Label><Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." /></div>
              </div>

              {error && <div className="rounded-lg bg-error/10 p-3 text-sm text-error">{error}</div>}

              <div className="rounded-xl bg-surface-container-low p-4 flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                <div className="text-sm text-on-surface-variant">
                  <p className="font-bold text-on-surface">What happens next</p>
                  <p className="mt-1">You become the first admin, then invite local rescuers, volunteers, vets, fosters and coordinators into the shared workspace.</p>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={saving}>{saving ? "Creating..." : "Start Rescue Collective"}</Button>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </main>
  );
}
