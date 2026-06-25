"use client";

import React, { useState } from "react";
import { Shield, MapPin, Star, Save, CheckCircle, AlertCircle, ChevronDown } from "lucide-react";
import { useAuth } from "../../../lib/auth";
import { api } from "../../../lib/api";

const ROLE_LABELS: Record<string, string> = {
  citizen: "Citizen",
  ngo: "NGO Volunteer",
  govt: "Government Officer",
  hospital: "Veterinary Hospital",
  admin: "Platform Admin",
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  citizen: "Can report cases, donate, and volunteer as a responder.",
  ngo: "Can claim and respond to emergency rescue cases.",
  govt: "Government-verified responder with elevated case authority.",
  hospital: "Verified hospital — can verify treatment reimbursements.",
  admin: "Full platform administration access.",
};

export default function ProfilePage() {
  const { user, logout } = useAuth();

  const [isAvailable, setIsAvailable] = useState(user?.isAvailable ?? false);
  const [serviceRadius, setServiceRadius] = useState(user?.serviceRadiusKm ?? 10);
  const [vehicleType, setVehicleType] = useState(user?.vehicleType ?? "");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    try {
      await api.updateVolunteerProfile({
        isAvailable,
        serviceRadiusKm: serviceRadius,
        vehicleType: vehicleType || null,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to save profile settings.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const initials = (user.fullName || "A")
    .split(" ")
    .map((n) => n.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">My Profile</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your account details and responder settings</p>
      </div>

      {/* Identity Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-primary text-white flex items-center justify-center text-2xl font-black shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-black text-slate-800 truncate">
              {user.fullName || "Citizen"}
            </h2>
            <p className="text-slate-500 text-sm mt-1">{user.phone}</p>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary-light text-primary border border-emerald-200">
                <Shield className="w-3.5 h-3.5" />
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <Star className="w-3.5 h-3.5" />
                {user.reputationScore} Reputation Points
              </span>
            </div>
          </div>
        </div>
        <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Role Access Level</p>
          <p className="text-sm text-slate-700 leading-relaxed">
            {ROLE_DESCRIPTIONS[user.role] ?? "Platform member."}
          </p>
        </div>
      </div>

      {/* Responder Settings */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <MapPin className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-slate-800">Responder Settings</h3>
        </div>

        {saveSuccess && (
          <div className="mb-5 flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 p-4 rounded-xl text-sm font-semibold">
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            Settings saved successfully.
          </div>
        )}
        {saveError && (
          <div className="mb-5 flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 p-4 rounded-xl text-sm font-semibold">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            {saveError}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Availability Toggle */}
          <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
              <p className="font-bold text-slate-800 text-sm">Available for Rescue</p>
              <p className="text-xs text-slate-500 mt-0.5">
                When on, you will receive notifications for open emergency cases near you.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAvailable((v) => !v)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                isAvailable ? "bg-primary" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                  isAvailable ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Service Radius */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-bold text-slate-700">Response Radius</label>
              <span className="text-sm font-black text-primary">{serviceRadius} km</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              step="1"
              value={serviceRadius}
              onChange={(e) => setServiceRadius(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
              <span>1 km</span>
              <span>25 km</span>
              <span>50 km</span>
            </div>
          </div>

          {/* Vehicle Type */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700">Transport Type</label>
            <div className="relative">
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full appearance-none px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm bg-white"
              >
                <option value="">No vehicle / On foot</option>
                <option value="bike">Motorcycle / Bike</option>
                <option value="car">Car / Sedan</option>
                <option value="suv">SUV / Larger Vehicle</option>
                <option value="van">Van / Transport Vehicle</option>
                <option value="auto">Auto-Rickshaw</option>
              </select>
              <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-primary hover:bg-emerald-800 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors shadow-sm"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </form>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-center">
          <p className="text-3xl font-black text-primary">{user.reputationScore}</p>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-2">Reputation Score</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-center">
          <p className="text-3xl font-black text-accent">{user.activeCaseLimit}</p>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-2">Active Case Limit</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-center">
          <p className="text-3xl font-black text-slate-700">{user.serviceRadiusKm} km</p>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-2">Service Radius</p>
        </div>
      </div>

      {/* Account */}
      <div className="bg-white border border-red-100 rounded-3xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-800 mb-4">Account</h3>
        <button
          onClick={logout}
          className="bg-red-50 hover:bg-red-100 text-red-700 font-bold px-5 py-2.5 rounded-xl text-sm border border-red-200 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
