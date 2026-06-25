"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Search, SlidersHorizontal, Plus, MapPin } from "lucide-react";
import { api, Animal } from "../../../lib/api";

const AnimalMap = dynamic(() => import("../../../components/animals/AnimalMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 rounded-2xl flex items-center justify-center min-h-[400px]">
      <span className="text-slate-400 text-sm font-semibold">Loading Leaflet Map...</span>
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "community":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "lost":
        return "bg-red-100 text-red-800 border-red-200";
      case "found":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "adopted":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Animal Records</h1>
          <p className="text-sm text-slate-500">Trace and register local street dogs, cats, and birds</p>
        </div>
        <Link
          href="/cases/new?type=regular"
          className="inline-flex items-center gap-2 bg-primary hover:bg-emerald-800 text-white font-bold px-4 py-2.5 rounded-xl shadow-sm self-start transition-colors"
        >
          <Plus className="w-4 h-4" /> Register Animal
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center shrink-0 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, breed, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
          >
            <option value="all">All Species</option>
            <option value="dog">Dogs</option>
            <option value="cat">Cats</option>
            <option value="bird">Birds</option>
            <option value="other">Other</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="community">Community</option>
            <option value="lost">Lost</option>
            <option value="found">Found</option>
            <option value="adopted">Adopted</option>
          </select>
        </div>
      </div>

      {/* Main Split View */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: List View */}
        <div className="lg:col-span-5 flex flex-col min-h-0 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800 text-lg">Results ({filteredAnimals.length})</h2>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredAnimals.length > 0 ? (
              filteredAnimals.map((a) => (
                <div key={a.id} className="py-4 flex gap-4 items-start group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 group-hover:text-primary transition-colors truncate">
                        {a.name || "Unnamed Stray"}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border tracking-wider ${getStatusColor(a.status)}`}>
                        {a.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 capitalize">
                      {a.species} {a.breed ? `• ${a.breed}` : ""}
                    </p>
                    <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-300" />
                      {a.territoryLabel || "Chennai Territory"}
                    </p>
                  </div>
                  <Link
                    href={`/animals/${a.id}`}
                    className="shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition-colors self-center"
                  >
                    Profile
                  </Link>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-400 py-20 text-sm">No animals found matching criteria.</div>
            )}
          </div>
        </div>

        {/* Right: Map View */}
        <div className="lg:col-span-7 h-full min-h-[400px] bg-white border border-slate-200 rounded-3xl p-2 shadow-sm overflow-hidden relative">
          <AnimalMap animals={filteredAnimals} />
        </div>
      </div>
    </div>
  );
}
