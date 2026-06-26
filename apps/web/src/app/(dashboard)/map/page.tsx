'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility';
import type { Animal, CaseRecord } from '@/types';

const animalIcon = new Icon({ iconUrl: '/marker-animal.png', iconSize: [32, 32], iconAnchor: [16, 32] });
const caseIcon = new Icon({ iconUrl: '/marker-case.png', iconSize: [32, 32], iconAnchor: [16, 32] });
const clinicIcon = new Icon({ iconUrl: '/marker-clinic.png', iconSize: [32, 32], iconAnchor: [16, 32] });

export default function MapPage() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [center, setCenter] = useState<[number, number]>([13.0827, 80.2707]); // Chennai

  useEffect(() => {
    Promise.all([
      fetch('/api/animals').then(r => r.json()),
      fetch('/api/cases').then(r => r.json()),
    ]).then(([a, c]) => {
      if (a.success) setAnimals(a.data);
      if (c.success) setCases(c.data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCenter([pos.coords.latitude, pos.coords.longitude]);
      });
    }
  }, []);

  if (loading) return <div className="p-8 text-center">Loading map...</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-astro-dark">Live Map</h1>
        <p className="text-astro-sand">Real-time view of animals, cases, and partners</p>
      </div>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ height: '70vh' }}>
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {animals.map((a) => (
            a.location && (
              <Marker key={a.id} position={[a.location.lat, a.location.lng]} icon={animalIcon}>
                <Popup>
                  <div className="p-2">
                    <p className="font-semibold">{a.name || 'Unnamed'}</p>
                    <p className="text-sm text-gray-500">{a.species} · {a.status}</p>
                  </div>
                </Popup>
              </Marker>
            )
          ))}
          {cases.filter(c => c.status === 'open').map((c) => (
            c.location && (
              <Marker key={c.id} position={[c.location.lat, c.location.lng]} icon={caseIcon}>
                <Popup>
                  <div className="p-2">
                    <p className="font-semibold text-astro-danger">{c.title}</p>
                    <p className="text-sm text-gray-500">{c.case_type} · {c.priority}</p>
                  </div>
                </Popup>
                <Circle center={[c.location.lat, c.location.lng]} radius={500} pathOptions={{ color: '#B83232', fillColor: '#B83232', fillOpacity: 0.1 }} />
              </Marker>
            )
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
