'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Popup, useMap } from 'react-leaflet';
import { icon } from 'leaflet';
import 'leaflet-defaulticon-compatibility';
import ResilientTileLayer from '@/components/maps/ResilientTileLayer';
import { DEFAULT_MAP_CENTER, getMapCoordinates } from '@/lib/map-utils';

interface CaseForMap {
  id: string;
  title: string;
  location?: unknown;
  locationText?: string | null;
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

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const pointsKey = points.map(([lat, lng]) => `${lat},${lng}`).join('|');
  const stablePoints = useMemo(
    () => pointsKey ? pointsKey.split('|').map((point) => point.split(',').map(Number) as [number, number]) : [],
    [pointsKey],
  );

  useEffect(() => {
    if (stablePoints.length === 1) map.setView(stablePoints[0], 14);
    else if (stablePoints.length > 1) map.fitBounds(stablePoints, { padding: [36, 36], maxZoom: 14 });
    else map.setView(DEFAULT_MAP_CENTER, 12);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize({ pan: false });
    });
    resizeObserver.observe(map.getContainer());
    map.invalidateSize({ pan: false });

    return () => resizeObserver.disconnect();
  }, [map, stablePoints]);

  return null;
}

export default function OpenCasesMap({ cases }: { cases: CaseForMap[] }) {
  const mappedCases = useMemo(() => cases.flatMap((item) => {
    const coordinates = getMapCoordinates(item);
    return coordinates ? [{ ...item, latitude: coordinates.latitude, longitude: coordinates.longitude }] : [];
  }), [cases]);

  const bounds = useMemo(
    () => mappedCases.map((item) => [item.latitude, item.longitude] as [number, number]),
    [mappedCases],
  );

  return (
    <div className="relative h-[360px] min-h-[320px] w-full overflow-hidden rounded-xl">
      <MapContainer center={DEFAULT_MAP_CENTER} zoom={12} style={{ height: '100%', minHeight: '320px', width: '100%' }} scrollWheelZoom={false}>
        <ResilientTileLayer />
        <FitBounds points={bounds} />
        {mappedCases.map((item) => (
          <Marker
            key={item.id}
            position={[item.latitude, item.longitude]}
            icon={item.priority === 'high' ? emergencyIcon : defaultIcon}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{item.title}</p>
                <p className="text-xs text-slate-500">
                  {item.locationText || `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`}
                </p>
                <p className="text-xs capitalize">{item.priority || 'Unspecified'} priority</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {mappedCases.length === 0 && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-[500] -translate-x-1/2 rounded-full bg-white/95 px-4 py-2 text-xs font-semibold text-slate-700 shadow">
          No open cases with valid coordinates
        </div>
      )}
    </div>
  );
}
