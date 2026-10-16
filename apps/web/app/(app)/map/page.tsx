"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, Dog, AlertTriangle, Building2, Leaf, LocateFixed, RefreshCw } from "lucide-react";
import { api, Animal, Case, Partner } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

const CityMap = dynamic(() => import("@/components/CityMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-surface-container rounded-xl flex items-center justify-center min-h-[500px]">
      <div className="flex flex-col items-center gap-3 text-on-surface-variant">
        <Spinner size="lg" />
        <span className="text-sm font-bold">Loading City Map...</span>
      </div>
    </div>
  ),
});

const LAYERS = [
  { key: "animals", label: "Animals", icon: Dog, color: "#004343", description: "Community & lost animals" },
  { key: "cases", label: "Open Cases", icon: AlertTriangle, color: "#904d00", description: "Active emergency reports" },
  { key: "clinics", label: "Vet Clinics", icon: Building2, color: "#0284c7", description: "Partner clinics" },
  { key: "abcCentres", label: "ABC Centres", icon: Leaf, color: "#16a34a", description: "Sterilisation centres" },
] as const;

type LayerKey = (typeof LAYERS)[number]["key"];

export default function CityMapPage() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [clinics, setClinics] = useState<Partner[]>([]);
  const [abcCentres, setAbcCentres] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);
  const [dataWarning, setDataWarning] = useState<string | null>(null);
  const [activeLayers, setActiveLayers] = useState<Record<LayerKey, boolean>>({
    animals: true,
    cases: true,
    clinics: true,
    abcCentres: false,
  });
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const results = await Promise.allSettled([
        api.listAnimals({ limit: 100 }),
        api.listCases({ limit: 200 }),
        api.listClinics(userLocation?.lat ?? 13.0827, userLocation?.lng ?? 80.2707, 30),
        api.listAbcCentres(),
      ]);

      if (cancelled) return;
      const [animalData, caseData, clinicData, abcData] = results;
      if (animalData.status === "fulfilled") setAnimals(animalData.value);
      if (caseData.status === "fulfilled") setCases(caseData.value.filter((item) => item.status === "open"));
      if (clinicData.status === "fulfilled") setClinics(clinicData.value);
      if (abcData.status === "fulfilled") setAbcCentres(abcData.value);

      const failedSources = results.filter((result) => result.status === "rejected").length;
      setDataWarning(
        failedSources === 0
          ? null
          : failedSources === results.length
            ? "Map data could not be loaded. Check your connection and try refreshing."
            : "Some map layers could not be loaded. Refresh to retry; other available layers remain visible.",
      );
      setLoading(false);
    };

    void load();
    return () => { cancelled = true; };
  }, [userLocation, refreshToken]);

  const detectLocation = () => {
    setLocationMessage(null);
    if (!navigator.geolocation) {
      setLocationMessage("This browser does not support location detection. Showing Chennai by default.");
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationMessage("Map services will use your current area.");
        setDetectingLocation(false);
      },
      () => {
        setLocationMessage("Location permission was unavailable. Showing Chennai as the default area.");
        setDetectingLocation(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  const toggleLayer = (key: LayerKey) => {
    setActiveLayers((previous) => ({ ...previous, [key]: !previous[key] }));
  };

  const totals: Record<LayerKey, number> = {
    animals: animals.length,
    cases: cases.length,
    clinics: clinics.length,
    abcCentres: abcCentres.length,
  };

  return (
    <div className="flex min-h-0 sm:min-h-[calc(100vh-8rem)] flex-col gap-3 sm:gap-4">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface tracking-tight flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            City Map
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Explore animals, active cases, vet clinics and ABC centres on one map.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={detectLocation}
            disabled={detectingLocation}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm font-bold text-on-surface hover:bg-surface-container disabled:opacity-60"
          >
            <LocateFixed className="h-4 w-4" />
            {detectingLocation ? "Finding location…" : "Use my location"}
          </button>
          <button
            type="button"
            onClick={() => setRefreshToken((token) => token + 1)}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-60"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh map
          </button>
        </div>
      </div>

      {(locationMessage || dataWarning) && (
        <div className="shrink-0 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
          {locationMessage && <p>{locationMessage}</p>}
          {dataWarning && <p className={locationMessage ? "mt-1" : ""}>{dataWarning}</p>}
        </div>
      )}

      <Card className="shrink-0 p-3 sm:p-4 flex flex-wrap gap-2 sm:gap-3">
        {LAYERS.map((layer) => {
          const Icon = layer.icon;
          const active = activeLayers[layer.key];
          return (
            <button
              key={layer.key}
              type="button"
              onClick={() => toggleLayer(layer.key)}
              aria-pressed={active}
              title={layer.description}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-bold transition-all duration-150 ease-out active:scale-95 sm:px-4",
                active
                  ? "border-transparent text-white shadow-sm"
                  : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container",
              )}
              style={active ? { background: layer.color, borderColor: layer.color } : {}}
            >
              <Icon className="h-4 w-4" />
              {layer.label}
              <span className={cn(
                "ml-1 rounded-full px-1.5 py-0.5 text-xs font-black",
                active ? "bg-white/25 text-white" : "bg-surface-container-high text-on-surface-variant",
              )}>
                {loading ? "…" : totals[layer.key]}
              </span>
            </button>
          );
        })}
        <div className="ml-auto hidden items-center gap-3 text-xs text-on-surface-variant lg:flex">
          {LAYERS.map((layer) => (
            <span key={layer.key} className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: layer.color }} />
              {layer.label}
            </span>
          ))}
        </div>
      </Card>

      <Card className="relative flex-1 min-h-[300px] sm:min-h-[420px] overflow-hidden p-1.5 sm:p-2">
        {loading ? (
          <div className="flex h-full min-h-[420px] w-full items-center justify-center rounded-md bg-surface-container-low">
            <div className="flex flex-col items-center gap-3 text-on-surface-variant">
              <Spinner size="lg" />
              <span className="text-sm font-bold">Fetching map data…</span>
            </div>
          </div>
        ) : (
          <CityMap
            animals={animals}
            cases={cases}
            clinics={clinics}
            abcCentres={abcCentres}
            showAnimals={activeLayers.animals}
            showCases={activeLayers.cases}
            showClinics={activeLayers.clinics}
            showAbcCentres={activeLayers.abcCentres}
          />
        )}
      </Card>
    </div>
  );
}
