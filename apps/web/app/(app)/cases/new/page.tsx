"use client";

import React, { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin, Camera, HeartPulse, CheckCircle, HelpCircle, ChevronLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api, Case } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmergencyReportForm } from "@/components/forms/EmergencyReportForm";

type FormTab = "emergency" | "regular";

function RegularReportForm() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCase, setSuccessCase] = useState<Case | null>(null);

  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [caseType, setCaseType] = useState("rescue");
  const [title, setTitle] = useState("");

  const searchParams = useSearchParams();
  useEffect(() => {
    const animalIdParam = searchParams?.get("animalId");
    if (animalIdParam) setTitle(`Rescue report for animal ${animalIdParam.slice(0, 8)}`);
  }, [searchParams]);

  const handleDetectLocation = () => {
    setDetectingLocation(true);
    setError(null);
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setDetectingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setDetectingLocation(false);
      },
      (err) => {
        setError(err.message || "Location permission denied");
        setDetectingLocation(false);
      }
    );
  };

  const handleUploadImage = async (): Promise<string | undefined> => {
    if (!file) return undefined;
    setUploadingFile(true);
    try {
      const { publicUrl } = await api.uploadMedia(file, "evidence");
      return publicUrl;
    } catch (err) {
      console.warn("Upload failed, using fallback mock URL", err);
      const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
      return `${base}${base ? "/" : ""}mock-uploads/${Date.now()}-${file.name}`;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user) {
      setError("You must be logged in to file a regular case report.");
      return;
    }
    if (latitude === null || longitude === null) {
      setError("Please detect your coordinates before submitting.");
      return;
    }
    setLoading(true);
    try {
      const publicImageUrl = await handleUploadImage();
      const regularCase = await api.createCase({
        caseType,
        title: title || `${caseType.replace("_", " ")} report`,
        description,
        latitude,
        longitude,
        evidenceUrls: publicImageUrl ? [publicImageUrl] : [],
      });
      setSuccessCase(regularCase);
    } catch (err: any) {
      setError(err?.message || "Failed to submit case. Please check form fields.");
    } finally {
      setLoading(false);
    }
  };

  if (successCase) {
    return (
      <Card className="max-w-xl mx-auto text-center p-8 space-y-6">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle className="w-9 h-9 text-green-600" />
        </div>
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Report Received</h2>
        <p className="text-on-surface-variant text-sm leading-relaxed">
          Your report has been filed. You can track its progress from your case list.
        </p>
        <div className="bg-surface-container-low p-4 rounded-md text-left border border-outline-variant">
          <p className="font-label-caps text-label-caps text-outline">Case Reference ID</p>
          <p className="font-mono text-sm text-on-surface mt-1 truncate">{successCase.id}</p>
        </div>
        <Link href={`/cases/${successCase.id}`}>
          <Button variant="primary" size="lg" className="w-full">Track Case Timeline</Button>
        </Link>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-error-container text-on-error-container p-4 rounded-md text-sm font-medium">{error}</div>
      )}

      <div>
        <Label>Report Category</Label>
        <select
          value={caseType}
          onChange={(e) => setCaseType(e.target.value)}
          className="w-full bg-surface-container-low border-b-2 border-outline focus:border-primary focus:ring-0 focus:outline-none px-4 py-3 rounded-t-md transition-colors font-body-md text-on-surface"
        >
          <option value="rescue">Stray Welfare Rescue</option>
          <option value="lost_pet">Lost Pet Search</option>
          <option value="abc">ABC sterilization</option>
          <option value="conflict">Harassment / Legal Conflict</option>
        </select>
      </div>

      <div>
        <Label>Report Summary Title</Label>
        <Input type="text" placeholder="e.g. Lost Golden Retriever near Adyar Beach" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      <div className="space-y-2">
        <Label className="mb-0">Location Coordinates</Label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 grid grid-cols-2 gap-2">
            <Input type="text" placeholder="Latitude" value={latitude !== null ? latitude.toFixed(6) : ""} readOnly className="rounded-md" />
            <Input type="text" placeholder="Longitude" value={longitude !== null ? longitude.toFixed(6) : ""} readOnly className="rounded-md" />
          </div>
          <Button type="button" variant="ghost" onClick={handleDetectLocation} disabled={detectingLocation} className="bg-surface-container-high shrink-0">
            <MapPin className="w-4 h-4" />
            {detectingLocation ? "Detecting..." : "Detect Location"}
          </Button>
        </div>
      </div>

      <div>
        <Label>Description &amp; Details</Label>
        <Textarea placeholder="Provide symptoms, breed, behavior notes, or landmark details..." rows={4} value={description} onChange={(e) => setDescription(e.target.value)} required />
      </div>

      <div>
        <Label>Evidence / Photo Upload</Label>
        <div className="border-2 border-dashed border-outline-variant hover:border-primary hover:bg-surface-container rounded-md p-6 text-center transition-colors duration-150 ease-out relative cursor-pointer">
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          <div className="flex flex-col items-center gap-2">
            <Camera className="w-8 h-8 text-outline" />
            <span className="text-sm font-bold text-on-surface-variant">{file ? file.name : "Click to select a photo"}</span>
            <span className="text-xs text-outline">PNG or JPG formats up to 5MB</span>
          </div>
        </div>
      </div>

      <Button type="submit" disabled={loading || uploadingFile} variant="primary" size="lg" className="w-full">
        {loading || uploadingFile ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Submit Regular Report"}
      </Button>
    </form>
  );
}

function NewCaseForm() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<FormTab>("emergency");

  useEffect(() => {
    const typeParam = searchParams?.get("type");
    const animalIdParam = searchParams?.get("animalId");
    if (typeParam === "regular" || animalIdParam) setActiveTab("regular");
    else if (typeParam === "emergency") setActiveTab("emergency");
  }, [searchParams]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>

      <Card className="p-6 sm:p-8 space-y-6 shadow-xl">
        <div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">File Case Report</h1>
          <p className="text-sm text-on-surface-variant">Report stray welfare needs, abuse conflicts, or lost dogs</p>
        </div>

        <div className="flex border-b border-outline-variant gap-4">
          <button
            type="button"
            onClick={() => setActiveTab("emergency")}
            className={cn(
              "pb-3 text-sm font-black border-b-2 transition-colors duration-150 ease-out flex items-center gap-1.5",
              activeTab === "emergency" ? "border-secondary text-secondary" : "border-transparent text-outline hover:text-on-surface"
            )}
          >
            <HeartPulse className="w-4 h-4" /> Emergency SOS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("regular")}
            className={cn(
              "pb-3 text-sm font-black border-b-2 transition-colors duration-150 ease-out flex items-center gap-1.5",
              activeTab === "regular" ? "border-primary text-primary" : "border-transparent text-outline hover:text-on-surface"
            )}
          >
            <HelpCircle className="w-4 h-4" /> Regular Report
          </button>
        </div>

        {activeTab === "emergency" ? <EmergencyReportForm homeHref="/dashboard" /> : <RegularReportForm />}
      </Card>
    </div>
  );
}

export default function NewCasePage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <NewCaseForm />
    </Suspense>
  );
}
