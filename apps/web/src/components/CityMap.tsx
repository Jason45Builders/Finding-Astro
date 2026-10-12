'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet';
import 'leaflet-defaulticon-compatibility';
import { DEFAULT_MAP_CENTER, getMapCoordinates, type MapCoordinates } from '@/lib/map-utils';

type MapPoint = MapCoordinates & { id: string; label: string; detail?: string };

function FitMapToPoints({ points }: { points: [number, number][] }) {
  const map = useMap();
  const pointsKey = points.map(([lat, lng]) => `${lat},${lng}`).join('|');
  const stablePoints = useMemo(
    () => pointsKey ? pointsKey.split('|').map((point) => point.split(',').map(Number) as [number, number]) : [],
    [pointsKey],
  );

  useEffect(() => {
    if (stablePoints.length === 1) {
      map.setView(stablePoints[0], 14);
    } else if (stablePoints.length > 1) {
      map.fitBounds(stablePoints, { padding: [32, 32], maxZoom: 14 });
    } else {
      map.setView(DEFAULT_MAP_CENTER, 12);
    }
    map.invalidateSize();
  }, [map, stablePoints]);

  return null;
}

function pointsFor(items: any[], labelFor: (item: any) => string): MapPoint[] {
  return items.flatMap((item) => {
    const coordinates = getMapCoordinates(item);
    return coordinates ? [{
      ...coordinates,
      id: String(item.id),
      label: labelFor(item),
      detail: item.address ?? item.locationText ?? item.territoryLabel ?? undefined,
    }] : [];
  });
}

export default function CityMap({
  animals, cases, clinics, abcCentres,
  showAnimals, showCases, showClinics, showAbcCentres,
}: {
  animals: any[];
  cases: any[];
  clinics: any[];
  abcCentres: any[];
  showAnimals: boolean;
  showCases: boolean;
  showClinics: boolean;
  showAbcCentres: boolean;
}) {
  const animalPoints = useMemo(() => pointsFor(animals, (a) => a.name || `Animal: ${a.species || 'Unknown'}`), [animals]);
  const casePoints = useMemo(() => pointsFor(cases.filter((c) => c.status === 'open'), (c) => c.title || 'Open case'), [cases]);
  const clinicPoints = useMemo(() => pointsFor(clinics, (p) => p.name || 'Veterinary clinic'), [clinics]);
  const abcPoints = useMemo(() => pointsFor(abcCentres, (p) => p.name || 'ABC centre'), [abcCentres]);

  const visiblePoints = useMemo(() => [
    ...(showAnimals ? animalPoints : []),
    ...(showCases ? casePoints : []),
    ...(showClinics ? clinicPoints : []),
    ...(showAbcCentres ? abcPoints : []),
  ], [showAnimals, showCases, showClinics, showAbcCentres, animalPoints, casePoints, clinicPoints, abcPoints]);

  const bounds = useMemo(
    () => visiblePoints.map((point) => [point.latitude, point.longitude] as [number, number]),
    [visiblePoints],
  );

  return (
    <div className="relative h-full min-h-[400px] w-full overflow-hidden rounded-xl">
      <MapContainer center={DEFAULT_MAP_CENTER} zoom={12} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <FitMapToPoints points={bounds} />
        {showAnimals && animalPoints.map((point) => (
          <Marker key={`animal-${point.id}`} position={[point.latitude, point.longitude]}>
            <Popup><strong>{point.label}</strong>{point.detail && <div>{point.detail}</div>}</Popup>
          </Marker>
        ))}
        {showCases && casePoints.map((point) => (
          <Marker key={`case-${point.id}`} position={[point.latitude, point.longitude]}>
            <Popup><strong>{point.label}</strong>{point.detail && <div>{point.detail}</div>}<div>Open emergency case</div></Popup>
          </Marker>
        ))}
        {showClinics && clinicPoints.map((point) => (
          <Marker key={`clinic-${point.id}`} position={[point.latitude, point.longitude]}>
            <Popup><strong>{point.label}</strong>{point.detail && <div>{point.detail}</div>}</Popup>
          </Marker>
        ))}
        {showAbcCentres && abcPoints.map((point) => (
          <Marker key={`abc-${point.id}`} position={[point.latitude, point.longitude]}>
            <Popup><strong>{point.label}</strong>{point.detail && <div>{point.detail}</div>}</Popup>
          </Marker>
        ))}
      </MapContainer>
      {visiblePoints.length === 0 && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-[500] -translate-x-1/2 rounded-full bg-white/95 px-4 py-2 text-xs font-semibold text-slate-700 shadow">
          No mapped records in the selected layers
        </div>
      )}
    </div>
  );
}
