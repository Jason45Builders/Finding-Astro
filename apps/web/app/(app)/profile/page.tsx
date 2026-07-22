"use client";

import React, { useState } from "react";
import { Shield, MapPin, Star, Save, CheckCircle, AlertCircle, ChevronDown, Award, Radar } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { KpiStat } from "@/components/ui/KpiStat";

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
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface tracking-tight">My Profile</h1>
        <p className="text-sm text-on-surface-variant mt-1">Manage your account details and responder settings</p>
      </div>

      {/* Identity Card */}
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-primary text-on-primary flex items-center justify-center text-2xl font-black shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-black text-on-surface truncate">
              {user.fullName || "Citizen"}
            </h2>
            <p className="text-on-surface-variant text-sm mt-1">{user.phone}</p>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <Badge variant="primary">
                <Shield className="w-3.5 h-3.5" />
                {ROLE_LABELS[user.role] ?? user.role}
              </Badge>
              <Badge variant="warning">
                <Star className="w-3.5 h-3.5" />
                {user.reputationScore} Reputation Points
              </Badge>
            </div>
          </div>
        </div>
        <div className="mt-6 p-4 bg-surface-container-low rounded-xl border border-outline-variant">
          <p className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-1">Role Access Level</p>
          <p className="text-sm text-on-surface leading-relaxed">
            {ROLE_DESCRIPTIONS[user.role] ?? "Platform member."}
          </p>
        </div>
      </Card>

      {/* Responder Settings */}
      <Card className="p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <MapPin className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-on-surface">Responder Settings</h3>
        </div>

        {saveSuccess && (
          <div className="mb-5 flex items-center gap-2 bg-primary-container text-on-primary-container p-4 rounded-xl text-sm font-semibold">
            <CheckCircle className="w-5 h-5 shrink-0" />
            Settings saved successfully.
          </div>
        )}
        {saveError && (
          <div className="mb-5 flex items-center gap-2 bg-error-container text-on-error-container p-4 rounded-xl text-sm font-semibold">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {saveError}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Availability Toggle */}
          <div className="flex items-center justify-between p-5 bg-surface-container-low rounded-xl border border-outline-variant">
            <div>
              <p className="font-bold text-on-surface text-sm">Available for Rescue</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                When on, you will receive notifications for open emergency cases near you.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAvailable((v) => !v)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-150 ease-out ${
                isAvailable ? "bg-primary" : "bg-surface-container-highest"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-surface shadow-sm transition-transform duration-150 ease-out ${
                  isAvailable ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Service Radius */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-bold text-on-surface">Response Radius</label>
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
            <div className="flex justify-between text-[10px] text-outline font-semibold">
              <span>1 km</span>
              <span>25 km</span>
              <span>50 km</span>
            </div>
          </div>

          {/* Vehicle Type */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-on-surface">Transport Type</label>
            <div className="relative">
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full appearance-none bg-surface-container-low border-b-2 border-outline focus:border-primary focus:ring-0 focus:outline-none px-4 py-3 rounded-t-md transition-colors font-body-md text-on-surface text-sm"
              >
                <option value="">No vehicle / On foot</option>
                <option value="bike">Motorcycle / Bike</option>
                <option value="car">Car / Sedan</option>
                <option value="suv">SUV / Larger Vehicle</option>
                <option value="van">Van / Transport Vehicle</option>
                <option value="auto">Auto-Rickshaw</option>
              </select>
              <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-outline pointer-events-none" />
            </div>
          </div>

          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </form>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 animate-stagger">
        <KpiStat label="Reputation Score" value={user.reputationScore} icon={Award} />
        <KpiStat label="Active Case Limit" value={user.activeCaseLimit} icon={Radar} accent="secondary" />
        <KpiStat label="Service Radius" value={user.serviceRadiusKm} suffix="km" accent="neutral" />
      </div>

      {/* Account */}
      <Card className="p-6 border-error/30">
        <h3 className="text-base font-bold text-on-surface mb-4">Account</h3>
        <Button variant="danger" onClick={logout}>
          Sign Out
        </Button>
      </Card>
    </div>
  );
}
