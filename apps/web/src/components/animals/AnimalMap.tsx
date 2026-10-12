'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet';
import 'leaflet-defaulticon-compatibility';
import ResilientTileLayer from '@/components/maps/ResilientTileLayer';
import { DEFAULT_MAP_CENTER, getMapCoordinates } from '@/lib/map-utils';

type AnimalPoint = {
  id: string;
  name: string | null;
  species: string;
  breed?: string | null;
  territoryLabel?: string | null;
  latitude: number;
  longitude: number;
};

function FitAnimalPoints({ points }: { points: [number, number][] }) {
  const map = useMap();
  const pointsKey = points.map(([lat, lng]) => `${lat},${lng}`).join('|');
  const stablePoints = useMemo(
    () => pointsKey ? pointsKey.split('|').map((point) => point.split(',').map(Number) as [number, number]) : [],
    [pointsKey],
  );

  useEffect(() => {
    if (stablePoints.length === 1) map.setView(stablePoints[0], 14);
    else if (stablePoints.length > 1) map.fitBounds(stablePoints, { padding: [32, 32], maxZoom: 14 });
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

export default function AnimalMap({ animals }: { animals: any[] }) {
  const points = useMemo<AnimalPoint[]>(() => animals.flatMap((animal) => {
    const coordinates = getMapCoordinates(animal);
    return coordinates ? [{
      id: String(animal.id),
      name: animal.name ?? null,
      species: String(animal.species ?? 'Animal'),
      breed: animal.breed ?? null,
      territoryLabel: animal.territoryLabel ?? null,
      ...coordinates,
    }] : [];
  }), [animals]);

  const bounds = useMemo(
    () => points.map((point) => [point.latitude, point.longitude] as [number, number]),
    [points],
  );

  return (
    <div className="relative h-[520px] min-h-[420px] w-full overflow-hidden rounded-xl">
      <MapContainer center={DEFAULT_MAP_CENTER} zoom={12} style={{ height: '100%', minHeight: '420px', width: '100%' }}>
        <ResilientTileLayer />
        <FitAnimalPoints points={bounds} />
        {points.map((animal) => (
          <Marker key={animal.id} position={[animal.latitude, animal.longitude]}>
            <Popup>
              <strong>{animal.name || 'Unnamed animal'}</strong>
              <div className="capitalize">{animal.species}{animal.breed ? ` · ${animal.breed}` : ''}</div>
              {animal.territoryLabel && <div>{animal.territoryLabel}</div>}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {points.length === 0 && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-[500] -translate-x-1/2 rounded-full bg-white/95 px-4 py-2 text-xs font-semibold text-slate-700 shadow">
          No animals with valid coordinates in this view
        </div>
      )}
    </div>
  );
}
