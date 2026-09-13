"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Settings, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { PageSpinner } from "@/components/ui/Spinner";

export default function OrgSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<{
    name: string;
    address: string | null;
    city: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    upiId: string | null;
    upiName: string | null;
    paymentEnabled: boolean;
    isVerified: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api.getOrgSettings();
        if (!cancelled) setSettings(data);
      } catch (err: any) {
        console.error("Failed to load settings", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await api.updateOrgSettings({
        name: settings.name,
        address: settings.address || undefined,
        city: settings.city || undefined,
        phone: settings.phone || undefined,
        email: settings.email || undefined,
        website: settings.website || undefined,
        upiId: settings.upiId || undefined,
        upiName: settings.upiName || undefined,
        paymentEnabled: settings.paymentEnabled,
      });
      setSettings((prev) => prev ? { ...prev, ...updated } : prev);
      setMessage({ type: "success", text: "Settings updated" });
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Failed to update settings" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageSpinner />;
  if (!settings) return <div className="p-6 text-center text-error">Unable to load settings</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-8 h-8 text-primary" />
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Organization Settings</h1>
          <p className="text-sm text-on-surface-variant">Manage your organization profile and donation settings</p>
        </div>
      </div>

      <Card className="p-6 space-y-5">
        <div className="space-y-4">
          <div>
            <Label>Organization Name</Label>
            <Input value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} />
          </div>
          <div>
            <Label>Address</Label>
            <Input value={settings.address || ""} onChange={(e) => setSettings({ ...settings, address: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>City</Label>
              <Input value={settings.city || ""} onChange={(e) => setSettings({ ...settings, city: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={settings.phone || ""} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Email</Label>
              <Input type="email" value={settings.email || ""} onChange={(e) => setSettings({ ...settings, email: e.target.value })} />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={settings.website || ""} onChange={(e) => setSettings({ ...settings, website: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="border-t border-outline-variant pt-5 space-y-4">
          <h3 className="font-headline-md text-headline-md text-on-surface">Donation Settings</h3>
          <div>
            <Label>UPI ID</Label>
            <Input value={settings.upiId || ""} onChange={(e) => setSettings({ ...settings, upiId: e.target.value })} placeholder="yourorg@okaxis" />
          </div>
          <div>
            <Label>UPI Name</Label>
            <Input value={settings.upiName || ""} onChange={(e) => setSettings({ ...settings, upiName: e.target.value })} placeholder="Name as registered with UPI" />
          </div>
          <div className="flex items-center gap-3">
            <input
              id="paymentEnabled"
              type="checkbox"
              checked={settings.paymentEnabled}
              onChange={(e) => setSettings({ ...settings, paymentEnabled: e.target.checked })}
              className="w-4 h-4 rounded border-outline text-primary focus:ring-primary"
            />
            <Label htmlFor="paymentEnabled" className="mb-0">Accepting donations</Label>
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded-lg text-sm ${message.type === "success" ? "bg-primary/10 text-primary" : "bg-error/10 text-error"}`}>
            {message.text}
          </div>
        )}

        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </Card>

      <Card className="p-6">
        <h3 className="font-headline-md text-headline-md text-on-surface mb-4">Verification Status</h3>
        <div className="flex items-center gap-2">
          {settings.isVerified ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-success" />
              <span className="text-sm text-success font-bold">Verified Organization</span>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5 text-error" />
              <span className="text-sm text-error font-bold">Unverified</span>
            </>
          )}
        </div>
        <p className="text-xs text-on-surface-variant mt-2">
          {settings.isVerified
            ? "Your organization has been verified by the platform. Donors will see a verified badge."
            : "Submit verification documents via /ngo-verification to unlock full features."}
        </p>
      </Card>
    </div>
  );
}