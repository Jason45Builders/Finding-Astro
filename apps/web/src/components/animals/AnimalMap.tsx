'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet';
import 'leaflet-defaulticon-compatibility';

export default function AnimalMap({ animals }: { animals: any[] }) {
  return (
    <MapContainer center={[13.0827, 80.2707]} zoom={13} style={{ height: '100%', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {animals.map((a) => a.location && (
        <Marker key={a.id} position={[a.location.latitude ?? a.location.lat, a.location.longitude ?? a.location.lng]}>
          <Popup>{a.name || a.species}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
