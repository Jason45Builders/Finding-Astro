"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquare, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { PageSpinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

type Category = "bug" | "feature_request" | "ui_ux" | "performance" | "accessibility" | "documentation" | "other";
type Severity = "low" | "medium" | "high" | "critical";

const CATEGORIES: { value: Category; label: string; description: string }[] = [
  { value: "bug", label: "Bug / Mistake", description: "Something is broken or not working as expected." },
  { value: "feature_request", label: "Feature Request", description: "An idea for a new capability or improvement." },
  { value: "ui_ux", label: "UI / UX", description: "Layout, design, usability, or visual issues." },
  { value: "performance", label: "Performance", description: "Slowness, lag, or crashes." },
  { value: "accessibility", label: "Accessibility", description: "Screen reader, contrast, keyboard, or inclusion issues." },
  { value: "documentation", label: "Documentation", description: "Missing or unclear help text, labels, or guidance." },
  { value: "other", label: "Other", description: "Something that doesn't fit the above categories." },
];

const SEVERITIES: { value: Severity; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export default function BetaFeedbackPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [category, setCategory] = useState<Category | "">("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<Severity>("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successId, setSuccessId] = useState<string | null>(null);

  const selectedCategory = CATEGORIES.find((c) => c.value === category);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!category) {
      setError("Please select a category.");
      return;
    }
    setLoading(true);
    try {
      const result = await api.requestBetaFeedback({ category, title, description, severity });
      setSuccessId((result as { id: string }).id);
    } catch (err: any) {
      setError(err?.message || "Failed to submit feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (successId) {
    return (
      <div className="max-w-xl mx-auto">
        <Card className="p-6 sm:p-8 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
          <h1 className="font-headline-lg text-on-surface">Feedback received</h1>
          <p className="text-sm text-on-surface-variant">Thank you — your beta feedback helps improve the platform for every animal and volunteer.</p>
          <div className="bg-surface-container-low border border-outline-variant rounded-md p-4 text-left">
            <p className="text-[10px] font-label-caps text-outline uppercase tracking-wider">Reference ID</p>
            <p className="font-mono text-sm text-on-surface mt-1 break-all">{successId}</p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button variant="primary" onClick={() => router.push("/dashboard")} className="w-full">Back to Dashboard</Button>
            <Button variant="ghost" onClick={() => { setSuccessId(null); setTitle(""); setDescription(""); setCategory(""); setSeverity("medium"); }} className="w-full">Submit another feedback</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" /> Feedback
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">Found a bug, have an idea, or want to suggest a fix? Submit it here and the team will review it.</p>
      </div>

      <Card className="p-5 sm:p-6 space-y-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-2 text-error text-sm bg-error-container p-3 rounded-md">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label className="mb-0">Category <span className="text-error">*</span></Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CATEGORIES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setCategory(item.value)}
                  className={`text-left px-3 py-2 rounded-md border-2 transition-all duration-150 ease-out ${category === item.value ? "border-primary bg-primary-container/40" : "border-outline-variant hover:bg-surface-container"}`}
                >
                  <p className={`text-sm font-bold ${category === item.value ? "text-primary" : "text-on-surface"}`}>{item.label}</p>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">{item.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="mb-0">Title <span className="text-error">*</span></Label>
            <Input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short summary of the issue or idea" required maxLength={200} />
          </div>

          <div className="space-y-2">
            <Label className="mb-0">Details <span className="text-error">*</span></Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Describe what happened, what you expected, steps to reproduce, or the suggested improvement." required minLength={10} maxLength={5000} />
          </div>

          <div className="space-y-2">
            <Label className="mb-0">Severity</Label>
            <div className="flex flex-wrap gap-2">
              {SEVERITIES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setSeverity(item.value)}
                  className={`px-3 py-1.5 rounded-full border-2 text-xs font-bold transition-all duration-150 ease-out ${severity === item.value ? "border-primary bg-primary-container text-primary" : "border-outline-variant text-on-surface-variant hover:bg-surface-container"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={loading} variant="primary" size="lg" className="w-full">
            {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send className="w-4 h-4" /> Submit Feedback</>}
          </Button>
        </form>
      </Card>
    </div>
  );
}
