"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Eye,
  Building2,
  FolderHeart,
  MapPin,
  ChevronRight,
  Heart,
  Camera,
  RefreshCw
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoFallback, setPhotoFallback] = useState(false);
  const [optimisticPhoto, setOptimisticPhoto] = useState<string | null>(null);
  const [casesError, setCasesError] = useState<string | null>(null);
  const photoUploadAbortRef = useRef<AbortController | null>(null);
  const geoAbortRef = useRef<AbortController | null>(null);

  useEffect(() => () => { if (optimisticPhoto) URL.revokeObjectURL(optimisticPhoto); }, [optimisticPhoto]);

  useEffect(() => {
    let cancelled = false;
    const fetchCases = async () => {
      try {
        const data = await api.listCases({ limit: 5 });
        if (cancelled) return;
        setMyCases(data);
        setCasesError(null);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load my cases", err);
        setCasesError(err instanceof Error ? err.message : "Failed to load cases");
      } finally {
        if (!cancelled) setLoadingCases(false);
      }
    };
    void fetchCases();
    return () => { cancelled = true; };
  }, [user?.id]);

  const retryCases = useCallback(() => {
    setLoadingCases(true);
    setCasesError(null);
  }, []);

  const handleFetchNearby = () => {
    setLoadingNearby(true);
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser");
      setLoadingNearby(false);
      return;
    }

    const geoAbort = new AbortController();
    geoAbortRef.current = geoAbort;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const signal = geoAbortRef.current?.signal;
          const list = await api.listAnimals({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            radiusKm: 5,
            limit: 5,
          });
          if (signal?.aborted) return;
          setNearbyAnimals(list);
        } catch (err) {
          if (geoAbortRef.current?.signal.aborted) return;
          console.error("Failed to load nearby animals", err);
          setGeoError(err instanceof Error ? err.message : "Failed to retrieve animals from backend");
        } finally {
          if (geoAbortRef.current === geoAbort) {
            setLoadingNearby(false);
            geoAbortRef.current = null;
          }
        }
      },
      (err) => {
        if (geoAbortRef.current === geoAbort) {
          setGeoError(err.message || "Location permission denied");
          setLoadingNearby(false);
          geoAbortRef.current = null;
        }
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    );
  };

  const initials = (user?.fullName || "A").split(" ").map((n) => n.charAt(0).toUpperCase()).slice(0, 2).join("");
  const photoSrc = optimisticPhoto || user?.profilePhotoUrl || null;

  const handlePhotoLoadError = () => {
    console.warn("[profile] Failed to load profile photo:", user?.profilePhotoUrl);
    setPhotoFallback(true);
  };

  const retryProfilePhoto = useCallback(() => {
    setPhotoFallback(false);
    setPhotoError(null);
  }, []);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoError("Please select an image file");
      return;
    }

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setPhotoError("Image must be smaller than 5MB");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setOptimisticPhoto(objectUrl);
    setPhotoFallback(false);
    setPhotoError(null);
    setUploadingPhoto(true);

    const controller = new AbortController();
    photoUploadAbortRef.current = controller;

    const withTimeout = <T,>(promise: Promise<T>, ms: number) =>
      Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          const id = setTimeout(() => {
            controller.abort();
            reject(new Error("Upload timed out. Please try again."));
          }, ms);
          controller.signal.addEventListener("abort", () => clearTimeout(id));
        }),
      ]);

    try {
      const uploadPromise = api.uploadMedia(file, "profile");
      const { uploadUrl } = await withTimeout(uploadPromise, 60000);

      const savePromise = api.updateProfilePhoto(uploadUrl);
      await withTimeout(savePromise, 30000);

      const refreshed = await api.getMe();
      console.log("[profile-photo-debug] refreshed user:", refreshed);
      useAuth.getState().updateUser(refreshed);
      setOptimisticPhoto((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    } catch (err: unknown) {
      console.error("[profile-photo-debug] upload/save error:", err);
      if (controller.signal.aborted) {
        setPhotoError("Upload was cancelled or timed out");
      } else {
        setPhotoError(err instanceof Error ? err.message : "Failed to save profile photo");
      }
      setOptimisticPhoto((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    } finally {
      if (photoUploadAbortRef.current === controller) {
        setUploadingPhoto(false);
        photoUploadAbortRef.current = null;
      }
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. Welcome Hero */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl text-white shadow-lg sm:shadow-xl">
        <div className="absolute inset-0">
          <img src="/Finding Astro_Header_D.png" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-primary/60 to-transparent" />
        </div>
        <div className="relative p-5 sm:p-8 lg:p-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 sm:gap-8">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs font-bold text-white/70 uppercase tracking-widest mb-1">Welcome back</p>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                Hi, {user?.fullName || "Citizen"}!
              </h1>
              <p className="text-xs sm:text-sm text-white/75 mt-2">
                Your current reputation score is <strong className="text-white font-semibold">{user?.reputationScore ?? 0}</strong>
              </p>
              <p className="text-xs sm:text-sm text-white/60 mt-1 hidden sm:block">
                Thank you for making your community a safer place for animals.
              </p>
              {photoError && (
                <div className="mt-3 inline-flex items-center gap-2 bg-red-500/20 border border-red-400/40 text-red-100 px-3 py-1.5 rounded-lg text-xs font-semibold">
                  <span>{photoError}</span>
                </div>
              )}
              {photoFallback && !photoSrc && (
                <div className="mt-3">
                  <button onClick={retryProfilePhoto} className="inline-flex items-center gap-1 text-xs font-bold text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" /> Retry photo
                  </button>
                </div>
              )}
            </div>
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full border-[3px] border-white/80 shadow-xl overflow-hidden bg-white/20">
                {photoSrc ? (
                  <img src={photoSrc} alt="Profile" className="w-full h-full object-cover" onError={handlePhotoLoadError} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/15 text-white text-xl sm:text-2xl font-black">
                    {initials}
                  </div>
                )}
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-white hover:bg-white/90 rounded-full flex items-center justify-center cursor-pointer shadow-lg border-2 border-primary transition-colors">
                <Camera className="w-4 h-4 text-primary" />
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} disabled={uploadingPhoto} />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-stagger">
        <Link href="/cases/new?type=emergency" className="group bg-surface-container-lowest p-3 sm:p-4 lg:p-5 rounded-xl border border-outline-variant hover:border-secondary hover:shadow-md transition-all shadow-sm active:scale-[0.98] flex flex-col justify-between">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-secondary-container text-on-secondary-container group-hover:coral-gradient group-hover:text-white rounded-md flex items-center justify-center transition-all">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="mt-3 sm:mt-4">
            <h3 className="font-bold text-on-surface text-sm sm:text-base group-hover:text-secondary transition-colors">Report SOS</h3>
            <p className="text-on-surface-variant text-[11px] sm:text-xs mt-0.5 hidden sm:block">Submit emergency street rescue alert</p>
          </div>
        </Link>

        <Link href="/animals" className="group bg-surface-container-lowest p-3 sm:p-4 lg:p-5 rounded-xl border border-outline-variant hover:border-primary hover:shadow-md transition-all shadow-sm active:scale-[0.98] flex flex-col justify-between">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary-container text-on-primary-container group-hover:bg-primary group-hover:text-on-primary rounded-md flex items-center justify-center transition-all">
            <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="mt-3 sm:mt-4">
            <h3 className="font-bold text-on-surface text-sm sm:text-base group-hover:text-primary transition-colors">Browse Animals</h3>
            <p className="text-on-surface-variant text-[11px] sm:text-xs mt-0.5 hidden sm:block">Browse community and lost animals</p>
          </div>
        </Link>

        <Link href="/partners?type=clinic" className="group bg-surface-container-lowest p-3 sm:p-4 lg:p-5 rounded-xl border border-outline-variant hover:border-primary hover:shadow-md transition-all shadow-sm active:scale-[0.98] flex flex-col justify-between">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-sky-100 text-sky-600 group-hover:bg-sky-600 group-hover:text-white rounded-md flex items-center justify-center transition-all">
            <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="mt-3 sm:mt-4">
            <h3 className="font-bold text-on-surface text-sm sm:text-base group-hover:text-sky-600 transition-colors">Find a Vet</h3>
            <p className="text-on-surface-variant text-[11px] sm:text-xs mt-0.5 hidden sm:block">Locate veterinary clinics and SPCAs</p>
          </div>
        </Link>

        <Link href="/cases" className="group bg-surface-container-lowest p-3 sm:p-4 lg:p-5 rounded-xl border border-outline-variant hover:border-primary hover:shadow-md transition-all shadow-sm active:scale-[0.98] flex flex-col justify-between">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-surface-container-high text-on-surface-variant group-hover:bg-primary group-hover:text-on-primary rounded-md flex items-center justify-center transition-all">
            <FolderHeart className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="mt-3 sm:mt-4">
            <h3 className="font-bold text-on-surface text-sm sm:text-base group-hover:text-primary transition-colors">My Cases</h3>
            <p className="text-on-surface-variant text-[11px] sm:text-xs mt-0.5 hidden sm:block">View status of reported cases</p>
          </div>
        </Link>
      </div>

      {/* 3. Impact Summary */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-4 sm:p-6">
        <h2 className="font-title-md text-title-md text-on-surface mb-4">Your Impact</h2>
        <div className="grid grid-cols-3 gap-3 sm:gap-6">
          <div>
            <p className="text-[10px] sm:text-xs text-outline uppercase tracking-wide">Cases Reported</p>
            <p className="text-lg sm:text-xl font-bold text-on-surface">{user?.activityCount ?? 0}</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-outline uppercase tracking-wide">Cases Resolved</p>
            <p className="text-lg sm:text-xl font-bold text-on-surface">{user?.completedCaseCount ?? 0}</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-outline uppercase tracking-wide">Reputation</p>
            <p className="text-lg sm:text-xl font-bold text-on-surface">{user?.reputationScore ?? 0}</p>
          </div>
        </div>
      </div>

      {/* 4. Main Content: Recent Cases + Strays Nearby */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Recent Cases */}
        <Card className="p-4 sm:p-6 lg:col-span-7">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="font-title-md text-title-md text-on-surface">My Recent Cases</h2>
            <Link href="/cases" className="text-sm font-bold text-primary hover:underline flex items-center gap-0.5">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loadingCases ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : casesError ? (
            <div className="p-6 sm:p-8 text-center space-y-3 bg-surface-container-low rounded-md">
              <p className="text-sm text-on-surface-variant">{casesError}</p>
              <button onClick={retryCases} className="text-sm font-bold text-primary hover:underline">Retry</button>
            </div>
          ) : myCases.length > 0 ? (
            <div className="divide-y divide-outline-variant/50">
              {myCases.map((c) => (
                <Link
                  key={c.id}
                  href={`/cases/${c.id}`}
                  className="py-3 sm:py-4 flex items-center justify-between hover:bg-surface-container rounded-md px-2 transition-colors block"
                >
                  <div className="min-w-0 pr-4">
                    <p className="font-bold text-on-surface truncate text-sm sm:text-base">{c.title}</p>
                    <p className="text-[11px] sm:text-xs text-outline mt-0.5 sm:mt-1">Reported {formatDateTime(c.createdAt)}</p>
                  </div>
                  <StatusBadge token={statusToken.caseStatus(c.status)} className="shrink-0" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-6 sm:p-8 text-center text-outline text-sm bg-surface-container-low rounded-md">
              You haven&apos;t reported any cases yet.
            </div>
          )}
        </Card>

        {/* Nearby Strays */}
        <Card className="p-4 sm:p-6 lg:col-span-5">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="font-title-md text-title-md text-on-surface">Strays Nearby</h2>
            <Button size="sm" variant="secondary" onClick={handleFetchNearby} disabled={loadingNearby} className="rounded-full">
              <MapPin className="w-3.5 h-3.5" />
              {loadingNearby ? "Loading..." : "Get Location"}
            </Button>
          </div>

          {geoError && (
            <div className="mb-3 sm:mb-4 bg-error-container text-on-error-container text-xs p-3 rounded-md">
              {geoError}
            </div>
          )}

          {nearbyAnimals.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {nearbyAnimals.map((animal) => (
                <div key={animal.id} className="flex gap-3 p-2.5 sm:p-3 hover:bg-surface-container rounded-md transition-colors">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-on-surface truncate text-sm">{animal.name || animal.species}</h4>
                    <p className="text-[11px] sm:text-xs text-on-surface-variant truncate mt-0.5">{animal.territoryLabel || "Local Area"}</p>
                    <StatusBadge token={statusToken.animalStatus(animal.status)} className="mt-1.5" />
                  </div>
                  <Link href={`/animals/${animal.id}`} className="self-center bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold transition-colors">
                    View
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 sm:p-8 text-center text-outline text-sm bg-surface-container-low rounded-md">
              Click &quot;Get Location&quot; to view strays reported within 5km of your area.
            </div>
          )}
        </Card>
      </div>

      {/* 5. Quote + Footer Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl">
        <img src="/Finding Astro_Footer.png" alt="Community" className="w-full h-48 sm:h-64 lg:h-72 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="relative p-5 sm:p-8 lg:p-10 text-center">
          <p className="text-sm sm:text-base lg:text-lg italic text-white leading-relaxed">
            “The greatness of a nation and its moral progress can be judged by the way its animals are treated.”
          </p>
          <p className="text-xs sm:text-sm text-white/70 mt-2 sm:mt-3">— Mahatma Gandhi</p>
        </div>
      </div>
    </div>
  );
}
