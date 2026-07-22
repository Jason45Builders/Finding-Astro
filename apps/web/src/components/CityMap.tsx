'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet';
import 'leaflet-defaulticon-compatibility';

export default function CityMap({ animals, cases, clinics, abcCentres, showAnimals, showCases, showClinics, showAbcCentres }: {
  animals: any[]; cases: any[]; clinics: any[]; abcCentres: any[];
  showAnimals: boolean; showCases: boolean; showClinics: boolean; showAbcCentres: boolean;
}) {
  return (
    <MapContainer center={[13.0827, 80.2707]} zoom={13} style={{ height: '100%', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {showAnimals && animals.map((a) => a.location && (
        <Marker key={a.id} position={[a.location.latitude ?? a.location.lat, a.location.longitude ?? a.location.lng]} />
      ))}
      {showCases && cases.filter((c: any) => c.status === 'open').map((c) => c.location && (
        <Marker key={c.id} position={[c.location.latitude ?? c.location.lat, c.location.longitude ?? c.location.lng]} />
      ))}
    </MapContainer>
  );
}
