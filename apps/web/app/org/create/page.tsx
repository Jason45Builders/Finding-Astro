"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export default function CreateWelfareGroupPage() {
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
    setSaving(true); setError("");
    try {
      const result = await api.createWelfareGroup({ name, groupType: "rescue_collective", city: city || undefined, address: address || undefined, phone: phone || undefined, email: email || undefined, website: website || undefined });
      api.setActiveOrgId(result.group.id);
      router.replace("/org/dashboard");
    } catch (err: any) {
      setError(err?.message || "Unable to create rescue collective");
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-background p-6 flex items-center justify-center">
      <Card className="w-full max-w-2xl p-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-primary/10 p-3"><Users className="w-7 h-7 text-primary" /></div>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Create a Rescue Collective</h1>
            <p className="text-sm text-on-surface-variant mt-1">Create a shared workspace for a local, community-led rescue team. You become the first organization admin.</p>
          </div>
        </div>

        <div className="rounded-xl border border-primary bg-primary/5 p-4">
          <Users className="w-5 h-5 text-primary mb-2" />
          <p className="font-bold text-on-surface">Local Rescue Collective</p>
          <p className="text-xs text-on-surface-variant mt-1">This structure is for rescue groups that may operate informally and do not need to be a registered NGO. NGO registration continues through the existing verification flow.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div><Label>Group name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. South Chennai Rescuers" required /></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Chennai" /></div>
            <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91..." /></div>
          </div>
          <div><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Optional base / operating address" /></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Contact email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="team@example.org" /></div>
            <div><Label>Website</Label><Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." /></div>
          </div>
          {error && <div className="rounded-lg bg-error/10 p-3 text-sm text-error">{error}</div>}
          <div className="rounded-xl bg-surface-container-low p-4 flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
            <div className="text-sm text-on-surface-variant">
              <p className="font-bold text-on-surface">You become the first admin</p>
              <p className="mt-1">You can immediately invite rescuers, volunteers, vets, fosters and coordinators. Rescue Collectives start unverified, but that does not block their workspace.</p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? "Creating..." : "Create Rescue Collective"}</Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
