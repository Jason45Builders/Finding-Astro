'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { icon } from 'leaflet';
import 'leaflet-defaulticon-compatibility';

const animalIcon = icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function SingleAnimalMap({ lat, lng, name, status }: { lat: number; lng: number; name: string; status: string }) {
  return (
    <MapContainer center={[lat, lng]} zoom={15} className="w-full h-full rounded-xl" scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]} icon={animalIcon}>
        <Popup>
          <div className="text-sm">
            <p className="font-semibold">{name}</p>
            <p className="text-xs text-slate-500 capitalize">{status}</p>
            <p className="text-xs text-slate-500">{lat.toFixed(4)}, {lng.toFixed(4)}</p>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}
