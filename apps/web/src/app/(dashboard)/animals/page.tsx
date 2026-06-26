'use client';

import { useEffect, useState } from 'react';
import { Dog, MapPin, Plus } from 'lucide-react';
import type { Animal } from '@/types';

export default function AnimalsPage() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/animals')
      .then(r => r.json())
      .then(r => { if (r.success) setAnimals(r.data); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = animals.filter(a =>
    (a.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
    a.species.toLowerCase().includes(search.toLowerCase()) ||
    (a.territory_label?.toLowerCase() || '').includes(search.toLowerCase())
  );

  const statusBadge = (status: string) => {
    switch (status) {
      case 'community': return 'bg-astro-sage/10 text-astro-sage';
      case 'lost': return 'bg-astro-danger/10 text-astro-danger';
      case 'found': return 'bg-astro-warning/10 text-astro-warning';
      case 'adopted': return 'bg-blue-50 text-blue-600';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  if (loading) return <div className="p-8 text-center">Loading animals...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-astro-dark">Animals</h1>
          <p className="text-astro-sand">Track and manage community animals</p>
        </div>
        <a href="/animals/new" className="flex items-center gap-2 px-4 py-2 bg-astro-clay text-white rounded-xl font-medium hover:bg-astro-clay/90 transition">
          <Plus className="w-4 h-4" />
          Add Animal
        </a>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, species, or territory..."
        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-astro-clay focus:ring-2 focus:ring-astro-clay/20 outline-none transition"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((a) => (
          <div key={a.id} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-astro-cream rounded-xl flex items-center justify-center text-astro-clay">
                <Dog className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-astro-dark truncate">{a.name || 'Unnamed'}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(a.status)}`}>{a.status}</span>
                </div>
                <p className="text-sm text-astro-sand">{a.species}{a.breed ? ` · ${a.breed}` : ''}</p>
                <p className="text-xs text-astro-sand mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {a.territory_label || 'Unknown territory'}
                </p>
                {a.is_sterilized && <span className="inline-block mt-2 px-2 py-0.5 bg-astro-sage/10 text-astro-sage text-xs rounded-full">Sterilised</span>}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-astro-sand">No animals found.</div>
        )}
      </div>
    </div>
  );
}
