"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Building2, CheckCircle2, Upload, ChevronLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, Label } from "@/components/ui/Input";

const ORG_TYPES = [
  { value: "ngo", label: "NGO / Animal Welfare Trust" },
  { value: "society", label: "Registered Society" },
  { value: "government", label: "Government Body" },
  { value: "other", label: "Other" },
];

export default function NgoVerificationPage() {
  const { user } = useAuth();

  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("ngo");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [address, setAddress] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      let documentUrls: string[] = [];
      if (file) {
        setUploading(true);
        try {
          const { publicUrl } = await api.uploadMedia(file, "verification");
          documentUrls = [publicUrl];
        } catch {
          // proof upload is optional; continue without it if it fails
        } finally {
          setUploading(false);
        }
      }
      await api.requestOrgVerification({
        orgName,
        orgType,
        registrationNumber: registrationNumber || undefined,
        address: address || undefined,
        documentUrls,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Failed to submit verification request");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-xl mx-auto py-8">
        <Card className="p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9 text-green-600" />
          </div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Request Submitted</h1>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            An administrator will review your organization details. Once approved, your account will be upgraded to NGO access with the tools for verification, dispatch, and reimbursement review.
          </p>
          <Link href="/dashboard">
            <Button variant="primary" size="lg" className="w-full">Back to Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 py-4">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <Card className="p-6 sm:p-8 space-y-6">
        <div className="flex items-start gap-3">
          <Building2 className="w-8 h-8 text-primary shrink-0" />
          <div>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Register Your Organization</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Submit your organization for verification to unlock NGO tools: case verification, dispatch, and reimbursement review.
            </p>
          </div>
        </div>

        {!user && (
          <div className="bg-secondary-container text-on-secondary-container rounded-md p-4 text-sm font-bold">
            Sign in required to submit a request.
          </div>
        )}

        {error && (
          <div className="bg-error-container text-on-error-container p-4 rounded-md text-sm font-medium">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label>Organization Name</Label>
            <Input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="e.g. Blue Cross of India" required />
          </div>

          <div>
            <Label>Organization Type</Label>
            <Select value={orgType} onChange={(e) => setOrgType(e.target.value)}>
              {ORG_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Registration Number (optional)</Label>
            <Input type="text" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} placeholder="Trust / society registration number" />
          </div>

          <div>
            <Label>Address (optional)</Label>
            <Textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Registered address" />
          </div>

          <div>
            <Label>Registration Document (optional)</Label>
            <div className="border-2 border-dashed border-outline-variant hover:border-primary hover:bg-surface-container rounded-md p-6 text-center transition-colors duration-150 ease-out relative cursor-pointer">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-outline" />
                <span className="text-sm font-bold text-on-surface-variant">{file ? file.name : "Upload registration certificate"}</span>
                <span className="text-xs text-outline">PDF, PNG, or JPG up to 5MB</span>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={submitting || uploading || !user} variant="primary" size="lg" className="w-full">
            {submitting || uploading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "Submit for Verification"
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
