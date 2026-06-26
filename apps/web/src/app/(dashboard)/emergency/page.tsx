'use client';

import { useState, useCallback } from 'react';
import { AlertTriangle, Camera, MapPin, Phone, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function EmergencyPage() {
  const [severity, setSeverity] = useState<'critical' | 'serious' | 'stable_needs_care'>('serious');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationText, setLocationText] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [caseId, setCaseId] = useState('');
  const supabase = createClient();

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocationText('Unable to get location. Please type the address.')
    );
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const json = await res.json();
    if (json.success) setPhotoUrl(json.data.url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location) { getLocation(); return; }
    setSubmitting(true);
    const res = await fetch('/api/emergency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ severity, description, location, location_text: locationText, photo_url: photoUrl, guest_phone: guestPhone }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (json.success) { setSubmitted(true); setCaseId(json.data.id); }
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center">
        <div className="w-16 h-16 bg-astro-sage rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-astro-dark mb-2">Emergency Reported</h2>
        <p className="text-astro-sand mb-4">Help is on the way. Case ID: {caseId}</p>
        <a href="/cases" className="text-astro-clay font-medium hover:underline">View your cases</a>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-astro-danger text-white rounded-2xl p-6 mb-6 flex items-center gap-4">
        <AlertTriangle className="w-8 h-8" />
        <div>
          <h1 className="text-xl font-bold">Emergency Report</h1>
          <p className="text-white/80">Report an injured animal immediately. No account required.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <label className="block text-sm font-medium text-astro-dark mb-2">Severity</label>
          <div className="grid grid-cols-3 gap-3">
            {(['critical', 'serious', 'stable_needs_care'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(s)}
                className={`p-3 rounded-xl text-sm font-medium border-2 transition ${
                  severity === s
                    ? s === 'critical' ? 'border-astro-danger bg-astro-danger text-white'
                    : s === 'serious' ? 'border-astro-warning bg-astro-warning text-white'
                    : 'border-astro-sage bg-astro-sage text-white'
                    : 'border-gray-200 text-astro-sand hover:border-gray-300'
                }`}
              >
                {s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-astro-dark mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the animal's condition..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-astro-clay focus:ring-2 focus:ring-astro-clay/20 outline-none transition"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-astro-dark mb-1">Location</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              placeholder="Type address or landmark"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-astro-clay focus:ring-2 focus:ring-astro-clay/20 outline-none transition"
            />
            <button
              type="button"
              onClick={getLocation}
              className="px-4 py-3 bg-astro-cream rounded-xl text-astro-clay font-medium hover:bg-astro-clay/10 transition flex items-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              GPS
            </button>
          </div>
          {location && <p className="text-xs text-astro-sage mt-1">Location captured: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-astro-dark mb-1">Photo</label>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 px-4 py-3 bg-astro-cream rounded-xl cursor-pointer hover:bg-astro-clay/10 transition">
              <Camera className="w-5 h-5 text-astro-clay" />
              <span className="text-sm font-medium text-astro-clay">{photoUrl ? 'Change photo' : 'Take photo'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </label>
            {photoUrl && <span className="text-sm text-astro-sage">Photo uploaded</span>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-astro-dark mb-1">Your Phone (optional)</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-astro-sand" />
            <input
              type="tel"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              placeholder="For responder follow-up"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-astro-clay focus:ring-2 focus:ring-astro-clay/20 outline-none transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-astro-danger text-white py-4 rounded-xl font-bold text-lg hover:bg-astro-danger/90 disabled:opacity-50 transition"
        >
          {submitting ? 'Sending...' : 'SEND EMERGENCY ALERT'}
        </button>
      </form>
    </div>
  );
}
