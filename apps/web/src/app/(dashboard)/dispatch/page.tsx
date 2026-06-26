'use client';

import { useEffect, useState } from 'react';
import { Radio, User, MapPin, CheckCircle } from 'lucide-react';
import type { CaseRecord, Profile } from '@/types';

export default function DispatchPage() {
  const [openCases, setOpenCases] = useState<CaseRecord[]>([]);
  const [responders, setResponders] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/cases?status=open')
      .then(r => r.json())
      .then(r => { if (r.success) setOpenCases(r.data); });
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(r => { if (r.success) setResponders(r.data.filter((u: Profile) => u.is_available)); })
      .finally(() => setLoading(false));
  }, []);

  const handleAssign = async (caseId: string, responderId: string) => {
    await fetch(`/api/cases/${caseId}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responder_id: responderId }),
    });
    setOpenCases(prev => prev.filter(c => c.id !== caseId));
  };

  if (loading) return <div className="p-8 text-center">Loading dispatch...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-astro-dark">Responder Dispatch</h1>
        <p className="text-astro-sand">Assign open cases to available responders</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-astro-dark flex items-center gap-2">
            <Radio className="w-5 h-5 text-astro-danger" />
            Open Cases ({openCases.length})
          </h2>
          {openCases.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.priority === 'critical' ? 'bg-astro-danger text-white' : c.priority === 'high' ? 'bg-astro-warning text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {c.priority}
                  </span>
                  <h3 className="font-semibold text-astro-dark mt-1">{c.title}</h3>
                  <p className="text-sm text-astro-sand">{c.description.slice(0, 100)}...</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-astro-sand mb-3">
                <MapPin className="w-3 h-3" />
                {c.location_text || `${c.location?.lat.toFixed(4)}, ${c.location?.lng.toFixed(4)}`}
              </div>
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-medium text-astro-dark mb-2">Assign to:</p>
                <div className="flex flex-wrap gap-2">
                  {responders.slice(0, 5).map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleAssign(c.id, r.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-astro-cream rounded-lg text-xs font-medium text-astro-dark hover:bg-astro-clay/10 transition"
                    >
                      <User className="w-3 h-3" />
                      {r.full_name || r.phone}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {openCases.length === 0 && <div className="text-center py-8 text-astro-sand">No open cases.</div>}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-astro-dark flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-astro-sage" />
            Available Responders ({responders.length})
          </h2>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {responders.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-astro-cream flex items-center justify-center text-astro-clay font-bold text-sm">
                    {(r.full_name || r.phone).charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-astro-dark">{r.full_name || r.phone}</p>
                    <p className="text-xs text-astro-sand">{r.role} · Reputation: {r.reputation_score}</p>
                  </div>
                </div>
                <span className="w-2 h-2 bg-astro-sage rounded-full" title="Available" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
