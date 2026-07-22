"use client";

import React, { useState } from "react";
import { Building2, Store, MapPin, Phone, Clock, CheckCircle, Loader2 } from "lucide-react";

const CLINIC_TYPES = ["govt_hospital", "hospital", "clinic"] as const;

export default function PartnerSignupPage() {
  const [type, setType] = useState<"clinic" | "store">("clinic");
  const [form, setForm] = useState({
    name: "",
    address: "",
    wardName: "",
    city: "",
    phone: "",
    latitude: 13.0827,
    longitude: 80.2707,
    clinicType: "clinic",
    acceptsStrays: false,
    emergency24hr: false,
    hasSurgery: false,
    hasInpatient: false,
    sellsMedicine: false,
    sellsFood: true,
    operatingHours: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/v1/partner-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerType: type, ...form }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Submission failed");
      }
      setSuccess(true);
      setForm({ name: "", address: "", wardName: "", city: "", phone: "", latitude: 13.0827, longitude: 80.2707, clinicType: "clinic", acceptsStrays: false, emergency24hr: false, hasSurgery: false, hasInpatient: false, sellsMedicine: false, sellsFood: true, operatingHours: "", notes: "" });
    } catch (err: any) {
      setError(err?.message || "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Partner Sign-Up</h1>
        <p className="text-sm text-slate-500 mt-2">Join the Finding Astro partner network. Your listing will be reviewed by our team before going live.</p>
      </div>

      {success && (
        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-4 rounded-xl text-sm font-semibold">
          ✓ Application submitted! Our team will review and verify your listing within 2-3 business days.
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 p-4 rounded-xl text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex gap-2">
          <button type="button" onClick={() => setType("clinic")} className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 ${type === "clinic" ? "bg-primary text-white border-primary" : "bg-white text-slate-600 border-slate-200 hover:border-primary"}`}>
            <Building2 className="w-4 h-4" /> Clinic / Hospital
          </button>
          <button type="button" onClick={() => setType("store")} className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 ${type === "store" ? "bg-primary text-white border-primary" : "bg-white text-slate-600 border-slate-200 hover:border-primary"}`}>
            <Store className="w-4 h-4" /> Pet Store
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Business Name *</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Address</label>
            <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2} className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Ward</label>
              <input value={form.wardName} onChange={e => setForm(f => ({ ...f, wardName: e.target.value }))} className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">City</label>
              <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
            </div>
          </div>

          {type === "clinic" && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Clinic Type</label>
              <select value={form.clinicType} onChange={e => setForm(f => ({ ...f, clinicType: e.target.value as any }))} className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm font-semibold">
                {CLINIC_TYPES.map(t => <option key={t} value={t}>{t.replace("_", " ").toUpperCase()}</option>)}
              </select>
            </div>
          )}

          {type === "clinic" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl cursor-pointer">
                <input type="checkbox" checked={form.acceptsStrays} onChange={e => setForm(f => ({ ...f, acceptsStrays: e.target.checked }))} className="w-4 h-4 text-primary rounded" />
                <span className="text-xs font-semibold text-slate-700">Accepts Strays</span>
              </label>
              <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl cursor-pointer">
                <input type="checkbox" checked={form.emergency24hr} onChange={e => setForm(f => ({ ...f, emergency24hr: e.target.checked }))} className="w-4 h-4 text-primary rounded" />
                <span className="text-xs font-semibold text-slate-700">24/7 Emergency</span>
              </label>
              <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl cursor-pointer">
                <input type="checkbox" checked={form.hasSurgery} onChange={e => setForm(f => ({ ...f, hasSurgery: e.target.checked }))} className="w-4 h-4 text-primary rounded" />
                <span className="text-xs font-semibold text-slate-700">Surgery</span>
              </label>
              <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl cursor-pointer">
                <input type="checkbox" checked={form.hasInpatient} onChange={e => setForm(f => ({ ...f, hasInpatient: e.target.checked }))} className="w-4 h-4 text-primary rounded" />
                <span className="text-xs font-semibold text-slate-700">Inpatient Care</span>
              </label>
            </div>
          )}

          {type === "store" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl cursor-pointer">
                <input type="checkbox" checked={form.sellsMedicine} onChange={e => setForm(f => ({ ...f, sellsMedicine: e.target.checked }))} className="w-4 h-4 text-primary rounded" />
                <span className="text-xs font-semibold text-slate-700">Sells Medicine</span>
              </label>
              <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl cursor-pointer">
                <input type="checkbox" checked={form.sellsFood} onChange={e => setForm(f => ({ ...f, sellsFood: e.target.checked }))} className="w-4 h-4 text-primary rounded" />
                <span className="text-xs font-semibold text-slate-700">Sells Food</span>
              </label>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Operating Hours</label>
            <div className="relative">
              <Clock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input value={form.operatingHours} onChange={e => setForm(f => ({ ...f, operatingHours: e.target.value }))} placeholder="e.g. Mon-Sat 9AM-8PM" className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Additional Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none" />
          </div>
        </div>

        <button type="submit" disabled={submitting || !form.name} className="w-full bg-primary hover:bg-emerald-800 text-white font-extrabold py-3.5 rounded-xl text-sm transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
          {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</> : <><CheckCircle className="w-5 h-5" /> Submit Application</>}
        </button>
      </form>
    </div>
  );
}
