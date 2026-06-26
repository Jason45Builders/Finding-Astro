'use client';

import { useEffect, useState } from 'react';
import { Shield, MapPin, Calendar } from 'lucide-react';
import type { CaseRecord } from '@/types';

export default function CasesPage() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/cases')
      .then(r => r.json())
      .then(r => { if (r.success) setCases(r.data); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? cases : cases.filter(c => c.status === filter);

  const statusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-astro-danger/10 text-astro-danger';
      case 'in_review': return 'bg-astro-warning/10 text-astro-warning';
      case 'action_taken': return 'bg-astro-sage/10 text-astro-sage';
      case 'resolved': return 'bg-gray-100 text-astro-sand';
      case 'closed': return 'bg-gray-100 text-gray-400';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case 'critical': return 'text-astro-danger font-bold';
      case 'high': return 'text-astro-warning font-semibold';
      default: return 'text-astro-sand';
    }
  };

  if (loading) return <div className="p-8 text-center">Loading cases...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-astro-dark">Cases</h1>
          <p className="text-astro-sand">Manage and track all welfare cases</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in_review">In Review</option>
          <option value="action_taken">Action Taken</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="grid gap-4">
        {filtered.map((c) => (
          <a key={c.id} href={`/cases/${c.id}`} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor(c.status)}`}>
                    {c.status.replace('_', ' ')}
                  </span>
                  <span className={`text-xs ${priorityColor(c.priority)}`}>{c.priority}</span>
                </div>
                <h3 className="font-semibold text-astro-dark">{c.title}</h3>
                <p className="text-sm text-astro-sand mt-1 line-clamp-2">{c.description}</p>
                <div className="flex items-center gap-4 mt-3 text-xs text-astro-sand">
                  <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> {c.case_type}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {c.location_text || 'GPS location'}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(c.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </a>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-astro-sand">No cases found.</div>
        )}
      </div>
    </div>
  );
}
