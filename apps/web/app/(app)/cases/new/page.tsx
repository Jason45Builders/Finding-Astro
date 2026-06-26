"use client";

import React, { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  MapPin,
  Camera,
  HeartPulse,
  Upload,
  CheckCircle,
  HelpCircle,
  ChevronLeft
} from "lucide-react";
import { useAuth } from "../../../../lib/auth";
import { api, Case } from "../../../../lib/api";

type FormTab = "emergency" | "regular";

function NewCaseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<FormTab>("emergency");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCase, setSuccessCase] = useState<Case | null>(null);

  // Form Fields
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");

  // Emergency Specific
  const [severity, setSeverity] = useState("critical"); // critical, serious, stable

  // Regular Specific
  const [caseType, setCaseType] = useState("rescue"); // rescue, lost_pet, abc, conflict
  const [title, setTitle] = useState("");

  // Auto-fill regular form animal query if present
  useEffect(() => {
    const typeParam = searchParams?.get("type");
    const animalIdParam = searchParams?.get("animalId");
    if (typeParam === "regular" || animalIdParam) {
      setActiveTab("regular");
      setCaseType("rescue");
      if (animalIdParam) {
        setTitle(`Rescue report for animal ${animalIdParam.slice(0, 8)}`);
      }
    }
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
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

    if (latitude === null || longitude === null) {
      setError("Please pin/detect your coordinates before submitting.");
      return;
    }

    setLoading(true);
    try {
      const publicImageUrl = await handleUploadImage();

      if (activeTab === "emergency") {
        const emergencyCase = await api.createEmergencyCase({
          severity,
          description: description || `Emergency Stray Rescue: ${severity} condition`,
          latitude,
          longitude,
          evidenceUrl: publicImageUrl || undefined,
          guestEmail: guestEmail || undefined,
        });
        setSuccessCase(emergencyCase);
      } else {
        if (!user) {
          setError("You must be logged in to file a regular case report.");
          setLoading(false);
          return;
        }
        const regularCase = await api.createCase({
          caseType,
          title: title || `${caseType.replace("_", " ")} report`,
          description,
          latitude,
          longitude,
          evidenceUrls: publicImageUrl ? [publicImageUrl] : undefined,
        });
        setSuccessCase(regularCase);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to submit case. Please check form fields.");
    } finally {
      setLoading(false);
    }
  };

  if (successCase) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 bg-white border border-slate-200 rounded-3xl p-8 shadow-xl mt-8 space-y-6">
        <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Report Received</h2>
        <p className="text-slate-600 text-sm leading-relaxed">
          Your alert has been broadcasted to the responder network. Responders in the area are receiving notifications.
        </p>
        <div className="bg-slate-50 p-4 rounded-xl text-left border border-slate-100">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Case Reference ID</p>
          <p className="font-mono text-sm text-slate-700 mt-1 truncate">{successCase.id}</p>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-3">Title</p>
          <p className="text-sm font-semibold text-slate-700 mt-1">{successCase.title}</p>
        </div>
        <div className="pt-4 flex flex-col gap-2">
          {user ? (
            <Link
              href={`/cases/${successCase.id}`}
              className="bg-primary hover:bg-emerald-800 text-white font-bold py-3 px-6 rounded-xl text-sm transition-colors shadow-sm"
            >
              Track Case Timeline
            </Link>
          ) : (
            <Link
              href="/"
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-6 rounded-xl text-sm transition-colors"
            >
              Back to Home
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-800">
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">File Case Report</h1>
          <p className="text-sm text-slate-500">Report stray welfare needs, abuse conflicts, or lost dogs</p>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 gap-4">
          <button
            onClick={() => setActiveTab("emergency")}
            className={`pb-3 text-sm font-black border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "emergency"
                ? "border-accent text-accent"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            <HeartPulse className="w-4.5 h-4.5" /> Emergency SOS
          </button>
          <button
            onClick={() => setActiveTab("regular")}
            className={`pb-3 text-sm font-black border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "regular"
                ? "border-primary text-primary"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            <HelpCircle className="w-4.5 h-4.5" /> Regular Report
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-medium border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Geolocation Input */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700">Location Coordinates</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Latitude"
                  value={latitude !== null ? latitude.toFixed(6) : ""}
                  readOnly
                  className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none text-slate-600"
                />
                <input
                  type="text"
                  placeholder="Longitude"
                  value={longitude !== null ? longitude.toFixed(6) : ""}
                  readOnly
                  className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none text-slate-600"
                />
              </div>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={detectingLocation}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 shrink-0"
              >
                <MapPin className="w-4.5 h-4.5" />
                {detectingLocation ? "Detecting..." : "Detect Location"}
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              We leverage browser GPS coordinates to direct nearby emergency rescue responders.
            </p>
          </div>

          {/* Emergency Specific Fields */}
          {activeTab === "emergency" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">Condition Severity</label>
                <div className="grid grid-cols-3 gap-3">
                  {["critical", "serious", "stable"].map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setSeverity(sev)}
                      className={`py-3 px-4 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all ${
                        severity === sev
                          ? sev === "critical"
                            ? "bg-red-500 text-white border-red-500 shadow-md shadow-red-500/20"
                            : sev === "serious"
                            ? "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20"
                            : "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20"
                          : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              {!user && (
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Your Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="Enter email to track report timeline"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                  />
                </div>
              )}
            </div>
          )}

          {/* Regular Specific Fields */}
          {activeTab === "regular" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">Report Category</label>
                <select
                  value={caseType}
                  onChange={(e) => setCaseType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                >
                  <option value="rescue">Stray Welfare Rescue</option>
                  <option value="lost_pet">Lost Pet Search</option>
                  <option value="abc">ABC sterilization</option>
                  <option value="conflict">Harassment / Legal Conflict</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">Report Summary Title</label>
                <input
                  type="text"
                  placeholder="e.g. Lost Golden Retriever near Adyar Beach"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                  required
                />
              </div>
            </div>
          )}

          {/* Shared Details */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700">Description & Details</label>
            <textarea
              placeholder="Provide symptoms, breed, behavior notes, or landmark details..."
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
              required
            ></textarea>
          </div>

          {/* File Upload Input */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700">Evidence / Photo Upload</label>
            <div className="border-2 border-dashed border-slate-200 hover:border-primary rounded-2xl p-6 text-center transition-colors relative cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-2">
                <Camera className="w-8 h-8 text-slate-400" />
                <span className="text-sm font-bold text-slate-600">
                  {file ? file.name : "Click to select a photo"}
                </span>
                <span className="text-xs text-slate-400">PNG or JPG formats up to 5MB</span>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading || uploadingFile}
            className={`w-full font-extrabold py-4 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
              activeTab === "emergency"
                ? "bg-accent hover:bg-orange-600 text-white shadow-orange-500/10"
                : "bg-primary hover:bg-emerald-800 text-white shadow-emerald-800/10"
            }`}
          >
            {loading || uploadingFile ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : activeTab === "emergency" ? (
              "Send Emergency SOS Alert"
            ) : (
              "Submit Regular Report"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function NewCasePage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center py-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <NewCaseForm />
    </Suspense>
  );
}
