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
import { useAuth } from "@/lib/auth";
import { api, Case, Animal } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { statusToken } from "@/lib/status";

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

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-primary rounded-xl p-8 text-on-primary shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-label-caps text-label-caps bg-on-primary/10 mb-4 border border-on-primary/20">
            <Sparkles className="w-3.5 h-3.5" /> Welcome back
          </span>
          <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg tracking-tight">
            Hi, {user?.fullName || "Citizen"}!
          </h1>
          <p className="mt-2 text-on-primary/80 font-medium leading-relaxed">
            Your current reputation score is <strong className="text-on-primary">{user?.reputationScore ?? 0}</strong>. Thank you for making Chennai a safer place for animals.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-8 translate-x-4">
          <Heart className="w-72 h-72 fill-on-primary" />
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-stagger">
        <Link
          href="/cases/new?type=emergency"
          className="group bg-surface-container-lowest p-6 rounded-xl border border-outline-variant hover:border-secondary hover:shadow-lg transition-all shadow-sm duration-200 ease-out flex flex-col justify-between active:scale-[0.98]"
        >
          <div className="w-12 h-12 bg-secondary-container text-on-secondary-container group-hover:coral-gradient group-hover:text-white rounded-md flex items-center justify-center transition-all duration-200 ease-out">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="mt-6">
            <h3 className="font-bold text-on-surface text-lg group-hover:text-secondary transition-colors">Report SOS</h3>
            <p className="text-on-surface-variant text-sm mt-1">Submit emergency street rescue alert</p>
          </div>
        </Link>

        <Link
          href="/animals"
          className="group bg-surface-container-lowest p-6 rounded-xl border border-outline-variant hover:border-primary hover:shadow-lg transition-all shadow-sm duration-200 ease-out flex flex-col justify-between active:scale-[0.98]"
        >
          <div className="w-12 h-12 bg-primary-container text-on-primary-container group-hover:bg-primary group-hover:text-on-primary rounded-md flex items-center justify-center transition-all duration-200 ease-out">
            <Eye className="w-6 h-6" />
          </div>
          <div className="mt-6">
            <h3 className="font-bold text-on-surface text-lg group-hover:text-primary transition-colors">Browse Animals</h3>
            <p className="text-on-surface-variant text-sm mt-1">Browse community and lost animals</p>
          </div>
        </Link>

        <Link
          href="/partners?type=clinic"
          className="group bg-surface-container-lowest p-6 rounded-xl border border-outline-variant hover:border-primary hover:shadow-lg transition-all shadow-sm duration-200 ease-out flex flex-col justify-between active:scale-[0.98]"
        >
          <div className="w-12 h-12 bg-sky-100 text-sky-600 group-hover:bg-sky-600 group-hover:text-white rounded-md flex items-center justify-center transition-all duration-200 ease-out">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="mt-6">
            <h3 className="font-bold text-on-surface text-lg group-hover:text-sky-600 transition-colors">Find a Vet</h3>
            <p className="text-on-surface-variant text-sm mt-1">Locate veterinary clinics and SPCAs</p>
          </div>
        </Link>

        <Link
          href="/cases"
          className="group bg-surface-container-lowest p-6 rounded-xl border border-outline-variant hover:border-primary hover:shadow-lg transition-all shadow-sm duration-200 ease-out flex flex-col justify-between active:scale-[0.98]"
        >
          <div className="w-12 h-12 bg-surface-container-high text-on-surface-variant group-hover:bg-primary group-hover:text-on-primary rounded-md flex items-center justify-center transition-all duration-200 ease-out">
            <FolderHeart className="w-6 h-6" />
          </div>
          <div className="mt-6">
            <h3 className="font-bold text-on-surface text-lg group-hover:text-primary transition-colors">My Cases</h3>
            <p className="text-on-surface-variant text-sm mt-1">View status of reported cases</p>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recent Cases */}
        <Card className="p-6 lg:col-span-7">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-title-md text-title-md text-on-surface">My Recent Cases</h2>
            <Link href="/cases" className="text-sm font-bold text-primary hover:underline flex items-center gap-0.5">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loadingCases ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : myCases.length > 0 ? (
            <div className="divide-y divide-outline-variant/50">
              {myCases.map((c) => (
                <Link
                  key={c.id}
                  href={`/cases/${c.id}`}
                  className="py-4 flex items-center justify-between hover:bg-surface-container rounded-md px-2 transition-colors block"
                >
                  <div className="min-w-0 pr-4">
                    <p className="font-bold text-on-surface truncate text-sm sm:text-base">{c.title}</p>
                    <p className="text-xs text-outline mt-1">Reported {formatDateTime(c.createdAt)}</p>
                  </div>
                  <StatusBadge token={statusToken.caseStatus(c.status)} className="shrink-0" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-outline text-sm bg-surface-container-low rounded-md">
              You haven&apos;t reported any cases yet.
            </div>
          )}
        </Card>

        {/* Nearby Stray Alerts */}
        <Card className="p-6 lg:col-span-5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-title-md text-title-md text-on-surface">Strays Nearby</h2>
            <Button size="sm" variant="secondary" onClick={handleFetchNearby} disabled={loadingNearby} className="rounded-full">
              <MapPin className="w-3.5 h-3.5" />
              {loadingNearby ? "Loading..." : "Get Location"}
            </Button>
          </div>

          {geoError && (
            <div className="mb-4 bg-error-container text-on-error-container text-xs p-3 rounded-md">
              {geoError}
            </div>
          )}

          {nearbyAnimals.length > 0 ? (
            <div className="space-y-4">
              {nearbyAnimals.map((animal) => (
                <div key={animal.id} className="flex gap-4 p-3 hover:bg-surface-container rounded-md transition-colors">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-on-surface truncate">{animal.name || animal.species}</h4>
                    <p className="text-xs text-on-surface-variant truncate mt-0.5">{animal.territoryLabel || "Chennai Area"}</p>
                    <StatusBadge token={statusToken.animalStatus(animal.status)} className="mt-1.5" />
                  </div>
                  <Link
                    href={`/animals/${animal.id}`}
                    className="self-center bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant px-3 py-1 rounded-full text-xs font-bold transition-colors"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-outline text-sm bg-surface-container-low rounded-md">
              Click &quot;Get Location&quot; to view strays reported within 5km of your area.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
