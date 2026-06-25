"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Eye,
  Building2,
  FolderHeart,
  MapPin,
  ChevronRight,
  Sparkles,
  Heart
} from "lucide-react";
import { useAuth } from "../../../lib/auth";
import { api, Case, Animal } from "../../../lib/api";
import { formatDateTime } from "../../../lib/utils";

export default function UserDashboard() {
  const { user } = useAuth();
  const [myCases, setMyCases] = useState<Case[]>([]);
  const [nearbyAnimals, setNearbyAnimals] = useState<Animal[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const data = await api.listCases({ limit: 5 });
        setMyCases(data);
      } catch (err) {
        console.error("Failed to load my cases", err);
      } finally {
        setLoadingCases(false);
      }
    };
    void fetchCases();
  }, []);

  const handleFetchNearby = () => {
    setLoadingNearby(true);
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser");
      setLoadingNearby(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const list = await api.listAnimals({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            radiusKm: 5,
            limit: 5,
          });
          setNearbyAnimals(list);
        } catch (err) {
          console.error("Failed to load nearby animals", err);
          setGeoError("Failed to retrieve animals from backend");
        } finally {
          setLoadingNearby(false);
        }
      },
      (err) => {
        setGeoError(err.message || "Location permission denied");
        setLoadingNearby(false);
      }
    );
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "open":
        return "bg-sky-100 text-sky-800";
      case "in_review":
        return "bg-amber-100 text-amber-800";
      case "resolved":
        return "bg-emerald-100 text-emerald-800";
      case "closed":
        return "bg-slate-100 text-slate-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary to-emerald-800 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-700/50 mb-4 border border-emerald-600/30">
            <Sparkles className="w-3.5 h-3.5" /> Welcome back
          </span>
          <h1 className="text-3xl font-black tracking-tight">
            Hi, {user?.fullName || "Citizen"}!
          </h1>
          <p className="mt-2 text-emerald-100 font-medium leading-relaxed">
            Your current reputation score is <strong className="text-white">{user?.reputationScore ?? 0}</strong>. Thank you for making Chennai a safer place for animals.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-8 translate-x-4">
          <Heart className="w-72 h-72 fill-white" />
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link
          href="/cases/new?type=emergency"
          className="group bg-white p-6 rounded-3xl border border-slate-200 hover:border-accent hover:shadow-lg transition-all shadow-sm duration-300 flex flex-col justify-between"
        >
          <div className="w-12 h-12 bg-orange-100 text-accent group-hover:bg-accent group-hover:text-white rounded-2xl flex items-center justify-center transition-all duration-300">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="mt-6">
            <h3 className="font-extrabold text-slate-800 text-lg group-hover:text-accent transition-colors">Report SOS</h3>
            <p className="text-slate-500 text-sm mt-1">Submit emergency street rescue alert</p>
          </div>
        </Link>

        <Link
          href="/animals"
          className="group bg-white p-6 rounded-3xl border border-slate-200 hover:border-primary hover:shadow-lg transition-all shadow-sm duration-300 flex flex-col justify-between"
        >
          <div className="w-12 h-12 bg-emerald-100 text-primary group-hover:bg-primary group-hover:text-white rounded-2xl flex items-center justify-center transition-all duration-300">
            <Eye className="w-6 h-6" />
          </div>
          <div className="mt-6">
            <h3 className="font-extrabold text-slate-800 text-lg group-hover:text-primary transition-colors">Browse Animals</h3>
            <p className="text-slate-500 text-sm mt-1">Browse community and lost animals</p>
          </div>
        </Link>

        <Link
          href="/partners?type=clinic"
          className="group bg-white p-6 rounded-3xl border border-slate-200 hover:border-primary hover:shadow-lg transition-all shadow-sm duration-300 flex flex-col justify-between"
        >
          <div className="w-12 h-12 bg-sky-100 text-sky-600 group-hover:bg-sky-600 group-hover:text-white rounded-2xl flex items-center justify-center transition-all duration-300">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="mt-6">
            <h3 className="font-extrabold text-slate-800 text-lg group-hover:text-sky-600 transition-colors">Find a Vet</h3>
            <p className="text-slate-500 text-sm mt-1">Locate veterinary clinics and SPCAs</p>
          </div>
        </Link>

        <Link
          href="/cases"
          className="group bg-white p-6 rounded-3xl border border-slate-200 hover:border-primary hover:shadow-lg transition-all shadow-sm duration-300 flex flex-col justify-between"
        >
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white rounded-2xl flex items-center justify-center transition-all duration-300">
            <FolderHeart className="w-6 h-6" />
          </div>
          <div className="mt-6">
            <h3 className="font-extrabold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">My Cases</h3>
            <p className="text-slate-500 text-sm mt-1">View status of reported cases</p>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recent Cases */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 lg:col-span-7 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">My Recent Cases</h2>
            <Link href="/cases" className="text-sm font-bold text-primary hover:underline flex items-center gap-0.5">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loadingCases ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : myCases.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {myCases.map((c) => (
                <Link
                  key={c.id}
                  href={`/cases/${c.id}`}
                  className="py-4 flex items-center justify-between hover:bg-slate-50 rounded-xl px-2 transition-colors block"
                >
                  <div className="min-w-0 pr-4">
                    <p className="font-bold text-slate-800 truncate text-sm sm:text-base">{c.title}</p>
                    <p className="text-xs text-slate-400 mt-1">Reported {formatDateTime(c.createdAt)}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider shrink-0 ${getStatusBadgeClass(c.status)}`}>
                    {c.status.replace("_", " ")}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-sm bg-slate-50 rounded-2xl">
              You haven't reported any cases yet.
            </div>
          )}
        </div>

        {/* Nearby Stray Alerts */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 lg:col-span-5 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">Strays Nearby</h2>
            <button
              onClick={handleFetchNearby}
              disabled={loadingNearby}
              className="text-xs font-bold bg-primary-light text-primary px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-colors flex items-center gap-1"
            >
              <MapPin className="w-3.5 h-3.5" />
              {loadingNearby ? "Loading..." : "Get Location"}
            </button>
          </div>

          {geoError && (
            <div className="mb-4 bg-amber-50 text-amber-700 border border-amber-200 text-xs p-3 rounded-xl">
              {geoError}
            </div>
          )}

          {nearbyAnimals.length > 0 ? (
            <div className="space-y-4">
              {nearbyAnimals.map((animal) => (
                <div key={animal.id} className="flex gap-4 p-3 hover:bg-slate-50 rounded-2xl transition-colors">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 truncate">{animal.name || animal.species}</h4>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{animal.territoryLabel || "Chennai Area"}</p>
                    <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mt-1.5">{animal.status}</p>
                  </div>
                  <Link
                    href={`/animals/${animal.id}`}
                    className="self-center bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-bold transition-colors"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-sm bg-slate-50 rounded-2xl">
              Click "Get Location" to view strays reported within 5km of your area.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
