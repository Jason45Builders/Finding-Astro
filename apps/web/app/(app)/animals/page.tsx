"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Search, Plus, MapPin } from "lucide-react";
import { api, Animal } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { statusToken } from "@/lib/status";

const AnimalMap = dynamic(() => import("@/components/animals/AnimalMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-surface-container-high rounded-xl flex items-center justify-center min-h-[400px]">
      <span className="text-on-surface-variant text-sm font-semibold">Loading Leaflet Map...</span>
    </div>
  ),
});

export default function AnimalsDirectory() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [species, setSpecies] = useState("all");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    const fetchAnimals = async () => {
      setLoading(true);
      try {
        const data = await api.listAnimals({ limit: 100 });
        setAnimals(data);
      } catch (err) {
        console.error("Failed to load animals", err);
      } finally {
        setLoading(false);
      }
    };
    void fetchAnimals();
  }, []);

  // Filter animals client-side for dynamic reactivity
  const filteredAnimals = animals.filter((a) => {
    const matchSearch =
      search === "" ||
      (a.name && a.name.toLowerCase().includes(search.toLowerCase())) ||
      a.species.toLowerCase().includes(search.toLowerCase()) ||
      (a.breed && a.breed.toLowerCase().includes(search.toLowerCase())) ||
      (a.territoryLabel && a.territoryLabel.toLowerCase().includes(search.toLowerCase()));

    const matchSpecies =
      species === "all" || a.species.toLowerCase() === species.toLowerCase();

    const matchStatus =
      status === "all" || a.status.toLowerCase() === status.toLowerCase();

    return matchSearch && matchSpecies && matchStatus;
  });

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
        <div>
          <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-on-surface tracking-tight">Animal Records</h1>
          <p className="text-sm text-on-surface-variant">Trace and register local street dogs, cats, and birds</p>
        </div>
        <Link href="/animals/new" className="self-start">
          <Button variant="primary">
            <Plus className="w-4 h-4" /> Register Animal
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="p-4 flex flex-col md:flex-row gap-4 items-center shrink-0">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-outline pointer-events-none" />
          <Input
            type="text"
            placeholder="Search by name, breed, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-md"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Select
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
            className="rounded-md w-full sm:w-auto"
          >
            <option value="all">All Species</option>
            <option value="dog">Dogs</option>
            <option value="cat">Cats</option>
            <option value="bird">Birds</option>
            <option value="other">Other</option>
          </Select>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md w-full sm:w-auto"
          >
            <option value="all">All Statuses</option>
            <option value="community">Community</option>
            <option value="lost">Lost</option>
            <option value="found">Found</option>
            <option value="adopted">Adopted</option>
          </Select>
        </div>
      </Card>

      {/* Main Split View */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: List View */}
        <Card className="lg:col-span-5 flex flex-col min-h-0 p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-title-md text-title-md text-on-surface">Results ({filteredAnimals.length})</h2>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/50 pr-1">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Spinner />
              </div>
            ) : filteredAnimals.length > 0 ? (
              filteredAnimals.map((a) => (
                <div key={a.id} className="py-4 flex gap-4 items-start group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-on-surface group-hover:text-primary transition-colors duration-150 ease-out truncate">
                        {a.name || "Unnamed Stray"}
                      </h3>
                      <StatusBadge token={statusToken.animalStatus(a.status)} className="shrink-0" />
                    </div>
                    <p className="text-xs text-on-surface-variant mt-1 capitalize">
                      {a.species} {a.breed ? `• ${a.breed}` : ""}
                    </p>
                    <p className="text-xs text-outline mt-1.5 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-outline" />
                      {a.territoryLabel || "Chennai Territory"}
                    </p>
                  </div>
                  <Link
                    href={`/animals/${a.id}`}
                    className="shrink-0 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant font-bold px-4 py-2 rounded-full text-xs transition-colors duration-150 ease-out self-center"
                  >
                    Profile
                  </Link>
                </div>
              ))
            ) : (
              <EmptyState icon={Search} title="No animals found matching criteria." className="border-none bg-transparent py-20" />
            )}
          </div>
        </Card>

        {/* Right: Map View */}
        <Card className="lg:col-span-7 h-full min-h-[400px] p-2 overflow-hidden relative">
          <AnimalMap animals={filteredAnimals} />
        </Card>
      </div>
    </div>
  );
}
