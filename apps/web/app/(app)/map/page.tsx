"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, Dog, AlertTriangle, Building2, Leaf } from "lucide-react";
import { api, Animal, Case, Partner } from "../../../lib/api";

const CityMap = dynamic(() => import("../../../components/CityMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 rounded-2xl flex items-center justify-center min-h-[500px]">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="text-sm font-semibold">Loading Chennai City Map...</span>
      </div>
    </div>
  ),
});

const LAYERS = [
  { key: "animals", label: "Animals", icon: Dog, color: "#16a34a", description: "Community & lost animals" },
  { key: "cases", label: "Open Cases", icon: AlertTriangle, color: "#E85D26", description: "Active emergency reports" },
  { key: "clinics", label: "Vet Clinics", icon: Building2, color: "#0284c7", description: "Partner clinics" },
  { key: "abcCentres", label: "ABC Centres", icon: Leaf, color: "#7c3aed", description: "Sterilisation centres" },
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
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            Chennai City Map
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Live overlay of animals, active cases, vet clinics and ABC centres
          </p>
        </div>
      </div>

      {/* Layer Controls */}
      <div className="shrink-0 bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap gap-3 shadow-sm">
        {LAYERS.map((layer) => {
          const Icon = layer.icon;
          const active = activeLayers[layer.key];
          return (
            <button
              key={layer.key}
              onClick={() => toggleLayer(layer.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all ${
                active
                  ? "border-transparent text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              }`}
              style={active ? { background: layer.color, borderColor: layer.color } : {}}
            >
              <Icon className="w-4 h-4" />
              {layer.label}
              <span
                className={`ml-1 text-xs font-black px-1.5 py-0.5 rounded-full ${
                  active ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {loading ? "…" : totals[layer.key]}
              </span>
            </button>
          );
        })}

        {/* Legend */}
        <div className="ml-auto hidden lg:flex items-center gap-4 text-xs text-slate-500">
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
      </div>

      {/* Map */}
      <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-3xl p-2 shadow-sm overflow-hidden">
        {loading ? (
          <div className="w-full h-full bg-slate-50 rounded-2xl flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              <span className="text-sm font-semibold">Fetching map data...</span>
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
      </div>
    </div>
  );
}
