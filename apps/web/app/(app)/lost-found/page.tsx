"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Camera, MapPin, CheckCircle, RefreshCw } from "lucide-react";
import { api, Animal } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { statusToken } from "@/lib/status";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Input, Textarea, Select, Label } from "@/components/ui/Input";
import { TabBar, TabButton } from "@/components/ui/Tabs";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

type Tab = "lost" | "found" | "report-lost" | "report-found";

const TABS: [Tab, string][] = [
  ["lost", "Lost Animals"],
  ["found", "Found Animals"],
  ["report-lost", "Report Lost Pet"],
  ["report-found", "Report Found Animal"],
];

export default function LostFoundPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("lost");
  const [lostAnimals, setLostAnimals] = useState<Animal[]>([]);
  const [foundAnimals, setFoundAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", species: "Dog", breed: "", color: "", description: "",
    locationText: "", latitude: null as number | null, longitude: null as number | null,
    guestContact: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [lost, found] = await Promise.all([
          api.listAnimals({ status: "lost", limit: 50 }),
          api.listAnimals({ status: "found", limit: 50 }),
        ]);
        setLostAnimals(lost);
        setFoundAnimals(found);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const detectLocation = () => {
    setDetectingLocation(true);
    navigator.geolocation?.getCurrentPosition(
      pos => { setForm(p => ({ ...p, latitude: pos.coords.latitude, longitude: pos.coords.longitude })); setDetectingLocation(false); },
      () => setDetectingLocation(false)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.latitude || !form.longitude) { setError("Please detect your location first"); return; }
    setSubmitting(true); setError(null);
    try {
      let evidenceUrls: string[] = [];
      if (file) {
        try {
          const { publicUrl } = await api.uploadMedia(file, "evidence");
          evidenceUrls = [publicUrl];
        } catch { /* ignore */ }
      }
      await api.createCase({
        caseType: "lost_pet",
        title: `${tab === "report-lost" ? "Lost" : "Found"} ${form.species}${form.name ? ` — ${form.name}` : ""}`,
        description: `${form.description}\n\nColor: ${form.color || "Not specified"}\nBreed: ${form.breed || "Not specified"}`,
        latitude: form.latitude,
        longitude: form.longitude,
        evidenceUrls,
      });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit report");
    } finally { setSubmitting(false); }
  };

  const displayList = tab === "lost" ? lostAnimals : foundAnimals;
  const filtered = displayList.filter(a =>
    !search ||
    (a.name && a.name.toLowerCase().includes(search.toLowerCase())) ||
    a.species.toLowerCase().includes(search.toLowerCase()) ||
    (a.territoryLabel && a.territoryLabel.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile sm:font-headline-lg sm:text-headline-lg text-on-surface tracking-tight flex items-center gap-2">
          <Search className="w-6 h-6 text-primary" /> Lost &amp; Found
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">Report a missing pet or a found animal to help reunite families</p>
      </div>

      <TabBar>
        {TABS.map(([t, label]) => (
          <TabButton key={t} active={tab === t} onClick={() => { setTab(t); setSuccess(false); setError(null); }}>
            {label}
          </TabButton>
        ))}
      </TabBar>

      {(tab === "lost" || tab === "found") && (
        <>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-outline pointer-events-none" />
            <Input
              type="text"
              placeholder="Search by name, species, area..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 rounded-md"
            />
          </div>
          {loading ? (
            <PageSpinner />
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-stagger">
              {filtered.map(animal => (
                <Link key={animal.id} href={`/animals/${animal.id}`}>
                  <Card interactive className="p-5">
                    <div className="h-40 bg-surface-container-high rounded-md mb-4 flex items-center justify-center overflow-hidden">
                      {animal.primaryPhotoUrl
                        ? <img src={animal.primaryPhotoUrl} alt={animal.name ?? "Animal"} className="w-full h-full object-cover rounded-md" />
                        : <Search className="w-12 h-12 text-outline" />}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-on-surface truncate">{animal.name || "Unknown"}</h3>
                      <StatusBadge token={statusToken.animalStatus(animal.status)} className="shrink-0" />
                    </div>
                    <p className="text-xs text-on-surface-variant capitalize mt-0.5">{animal.species}{animal.breed ? ` · ${animal.breed}` : ""}</p>
                    {animal.territoryLabel && (
                      <p className="text-xs text-outline mt-2 flex items-center gap-1"><MapPin className="w-3 h-3" />{animal.territoryLabel}</p>
                    )}
                    {animal.lastSeenText && (
                      <p className="text-xs text-on-surface-variant mt-2 bg-surface-container-low p-2 rounded-md line-clamp-2">{animal.lastSeenText}</p>
                    )}
                    <p className="text-[10px] text-outline mt-2">{formatDateTime(animal.createdAt)}</p>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState icon={Search} title="No animals found" description={`No ${tab} animals found.`} />
          )}
        </>
      )}

      {(tab === "report-lost" || tab === "report-found") && (
        <div className="max-w-xl">
          {success ? (
            <Card className="p-10 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle className="w-9 h-9 text-green-600" />
              </div>
              <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Report Submitted</h3>
              <p className="text-on-surface-variant text-sm">Your report is now live and searchable.</p>
              <Button
                variant="primary"
                size="lg"
                onClick={() => { setSuccess(false); setTab(tab === "report-lost" ? "lost" : "found"); }}
              >
                View Listings
              </Button>
            </Card>
          ) : (
            <Card className="p-6 space-y-5">
              <h2 className="font-title-md text-title-md text-on-surface">
                {tab === "report-lost" ? "Report a Lost Pet" : "Report a Found Animal"}
              </h2>
              {error && (
                <div className="bg-error-container text-on-error-container p-3 rounded-md text-sm font-medium">{error}</div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Species</Label>
                    <Select value={form.species} onChange={e => setForm(p => ({ ...p, species: e.target.value }))}>
                      <option>Dog</option><option>Cat</option><option>Bird</option><option>Other</option>
                    </Select>
                  </div>
                  <div>
                    <Label>Name (if known)</Label>
                    <Input type="text" placeholder="e.g. Bruno" value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Breed</Label>
                    <Input type="text" placeholder="e.g. Labrador" value={form.breed}
                      onChange={e => setForm(p => ({ ...p, breed: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Color / Markings</Label>
                    <Input type="text" placeholder="e.g. Golden with collar" value={form.color}
                      onChange={e => setForm(p => ({ ...p, color: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Last known location</Label>
                  <Input type="text" placeholder="e.g. Near T. Nagar market" value={form.locationText}
                    onChange={e => setForm(p => ({ ...p, locationText: e.target.value }))} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea rows={3} required value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Distinguishing marks, collar, microchip, behaviour..." />
                </div>
                <div className="space-y-2">
                  <Label className="mb-0">GPS Location</Label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Input readOnly value={form.latitude?.toFixed(5) ?? ""} placeholder="Latitude" className="rounded-md" />
                      <Input readOnly value={form.longitude?.toFixed(5) ?? ""} placeholder="Longitude" className="rounded-md" />
                    </div>
                    <Button type="button" variant="ghost" onClick={detectLocation} disabled={detectingLocation} className="bg-surface-container-high shrink-0">
                      <MapPin className="w-4 h-4" />{detectingLocation ? "Detecting..." : "Detect Location"}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Photo</Label>
                  <div className="border-2 border-dashed border-outline-variant hover:border-primary hover:bg-surface-container rounded-md p-5 text-center cursor-pointer relative transition-colors duration-150 ease-out">
                    <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] ?? null)}
                      className="absolute inset-0 opacity-0 cursor-pointer" />
                    <Camera className="w-6 h-6 text-outline mx-auto mb-1" />
                    <p className="text-xs text-on-surface-variant font-semibold">{file ? file.name : "Upload a clear photo"}</p>
                  </div>
                </div>
                {!user && (
                  <div>
                    <Label>Your contact (optional)</Label>
                    <Input type="text" placeholder="Phone or email for reunification" value={form.guestContact}
                      onChange={e => setForm(p => ({ ...p, guestContact: e.target.value }))} />
                  </div>
                )}
                <Button type="submit" disabled={submitting} variant="primary" size="lg" className="w-full">
                  {submitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {submitting ? "Submitting..." : tab === "report-lost" ? "Report Lost Pet" : "Report Found Animal"}
                </Button>
              </form>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
