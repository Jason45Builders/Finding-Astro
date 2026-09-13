"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Building2, Lock, Upload } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { requireCsrf } from "@/lib/auth-middleware";
import { Input, Textarea, Select, Label } from "@/components/ui/Input";

const ORG_TYPES = [
  { value: "ngo", label: "NGO / Animal Welfare Trust" },
  { value: "society", label: "Registered Society" },
  { value: "government", label: "Government Body" },
  { value: "other", label: "Other" },
];

export default function NgoSignupPage() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    orgName: "",
    orgType: "ngo",
    registrationNumber: "",
    address: "",
    phone: "",
    website: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/ngo-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-requested-with": "Finding-Astro-App",
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fields && Array.isArray(data.fields)) {
          const errors: Record<string, string> = {};
          data.fields.forEach((f: { field: string; message: string }) => {
            errors[f.field] = f.message;
          });
          setFieldErrors(errors);
          setError(data.message || "Please fix the errors below");
        } else {
          throw new Error(data.message || "Signup failed");
        }
        return;
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Failed to create account");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="p-8 max-w-md w-full text-center space-y-4">
          <Building2 className="w-12 h-12 text-primary mx-auto" />
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Account Created</h1>
          <p className="text-sm text-on-surface-variant">
            Your organization account has been created. You can now log in with your email and password.
          </p>
          <Link href="/auth/login">
            <Button variant="primary" size="lg" className="w-full">Go to Login</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <Card className="p-6 sm:p-8 max-w-lg w-full space-y-6">
        <div className="text-center">
          <Building2 className="w-10 h-10 text-primary mx-auto mb-3" />
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Organization Sign-Up</h1>
          <p className="text-sm text-on-surface-variant mt-1">Create an account for your animal welfare organization</p>
        </div>

        {error && Object.keys(fieldErrors).length === 0 && (
          <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="p-4 bg-surface-container-high rounded-lg space-y-4">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Admin Account</p>
            <div>
              <Label>Full Name</Label>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
              {fieldErrors.fullName && <p className="text-xs text-error mt-1">{fieldErrors.fullName}</p>}
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              {fieldErrors.email && <p className="text-xs text-error mt-1">{fieldErrors.email}</p>}
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
              {fieldErrors.password && <p className="text-xs text-error mt-1">{fieldErrors.password}</p>}
            </div>
          </div>

          <div className="p-4 bg-surface-container-high rounded-lg space-y-4">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Organization Details</p>
            <div>
              <Label>Organization Name</Label>
              <Input value={form.orgName} onChange={(e) => setForm({ ...form, orgName: e.target.value })} required />
              {fieldErrors.orgName && <p className="text-xs text-error mt-1">{fieldErrors.orgName}</p>}
            </div>
            <div>
              <Label>Organization Type</Label>
              <Select value={form.orgType} onChange={(e) => setForm({ ...form, orgType: e.target.value })}>
                {ORG_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </div>
            <div>
              <Label>Registration Number (optional)</Label>
              <Input value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} />
            </div>
            <div>
              <Label>Address</Label>
              <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>Website (optional)</Label>
                <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              </div>
            </div>
          </div>

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
            {submitting ? "Creating Account..." : "Create Organization Account"}
          </Button>

          <p className="text-xs text-center text-on-surface-variant">
            Already have an account? <Link href="/auth/login" className="text-primary font-bold underline">Sign in</Link>
          </p>
        </form>
      </Card>
    </div>
  );
}