"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, Dog, AlertTriangle, Building2, Leaf } from "lucide-react";
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
        <span className="text-sm font-bold">Loading Chennai City Map...</span>
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
  const [activeLayers, setActiveLayers] = useState<Record<LayerKey, boolean>>({
    animals: true,
    cases: true,
    clinics: true,
    abcCentres: false,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [animalData, caseData, clinicData, abcData] = await Promise.allSettled([
          api.listAnimals({ limit: 100 }),
          api.listCases({ limit: 200 }),
          api.listClinics(13.0827, 80.2707, 30),
          api.listAbcCentres(),
        ]);
        if (animalData.status === "fulfilled") setAnimals(animalData.value);
        if (caseData.status === "fulfilled") setCases(caseData.value.filter((c) => c.status === "open"));
        if (clinicData.status === "fulfilled") setClinics(clinicData.value);
        if (abcData.status === "fulfilled") setAbcCentres(abcData.value);
      } catch (err) {
        console.error("Failed to load map data", err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const toggleLayer = (key: LayerKey) => {
    setActiveLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const totals: Record<LayerKey, number> = {
    animals: animals.length,
    cases: cases.length,
    clinics: clinics.length,
    abcCentres: abcCentres.length,
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      {/* Header */}
      <div className="shrink-0 flex items-start justify-between">
        <div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface tracking-tight flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            Chennai City Map
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Live overlay of animals, active cases, vet clinics and ABC centres
          </p>
        </div>
      </div>

      {/* Layer Controls */}
      <Card className="shrink-0 p-4 flex flex-wrap gap-3">
        {LAYERS.map((layer) => {
          const Icon = layer.icon;
          const active = activeLayers[layer.key];
          return (
            <button
              key={layer.key}
              onClick={() => toggleLayer(layer.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold transition-all duration-150 ease-out active:scale-95",
                active
                  ? "border-transparent text-white shadow-sm"
                  : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container"
              )}
              style={active ? { background: layer.color, borderColor: layer.color } : {}}
            >
              <Icon className="w-4 h-4" />
              {layer.label}
              <span
                className={cn(
                  "ml-1 text-xs font-black px-1.5 py-0.5 rounded-full",
                  active ? "bg-white/25 text-white" : "bg-surface-container-high text-on-surface-variant"
                )}
              >
                {loading ? "…" : totals[layer.key]}
              </span>
            </button>
          );
        })}

        {/* Legend */}
        <div className="ml-auto hidden lg:flex items-center gap-4 text-xs text-on-surface-variant">
          {LAYERS.map((l) => (
            <span key={l.key} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-full inline-block"
                style={{ background: l.color }}
              ></span>
              {l.label}
            </span>
          ))}
        </div>
      </Card>

      {/* Map */}
      <Card className="flex-1 min-h-0 p-2 overflow-hidden">
        {loading ? (
          <div className="w-full h-full bg-surface-container-low rounded-md flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-on-surface-variant">
              <Spinner size="lg" />
              <span className="text-sm font-bold">Fetching map data...</span>
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
