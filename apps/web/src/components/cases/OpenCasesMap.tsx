'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { icon } from 'leaflet';
import 'leaflet-defaulticon-compatibility';

interface CaseLocation {
  latitude: number;
  longitude: number;
}

interface CaseForMap {
  id: string;
  title: string;
  location: CaseLocation;
  locationText?: string;
  priority?: string;
}

const emergencyIcon = icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const defaultIcon = icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function FitBounds({ cases }: { cases: CaseForMap[] }) {
  const map = useMap();
  if (cases.length > 0) {
    const bounds = cases.map((c) => [c.location.latitude, c.location.longitude] as [number, number]);
    map.fitBounds(bounds, { padding: [40, 40] });
  }
  return null;
}

export default function OpenCasesMap({ cases }: { cases: CaseForMap[] }) {
  if (!cases.length) {
    return (
      <div className="w-full h-full bg-slate-100 rounded-xl flex items-center justify-center text-xs text-slate-400">
        No open cases to display
      </div>
    );
  }

  const center: [number, number] = [cases[0].location.latitude, cases[0].location.longitude];

  return (
    <MapContainer center={center} zoom={13} className="w-full h-full rounded-xl" scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds cases={cases} />
      {cases.map((c) => (
        <Marker key={c.id} position={[c.location.latitude, c.location.longitude]} icon={c.priority === 'high' ? emergencyIcon : defaultIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{c.title}</p>
              <p className="text-xs text-slate-500">{c.locationText ?? `${c.location.latitude.toFixed(4)}, ${c.location.longitude.toFixed(4)}`}</p>
              <p className="text-xs capitalize">{c.priority}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
