'use client';

import { useMemo } from 'react';
import OpenStreetMapEmbed, { type EmbeddedMapPoint } from '@/components/maps/OpenStreetMapEmbed';
import { getMapCoordinates } from '@/lib/map-utils';

function pointsFor(items: any[], category: string, labelFor: (item: any) => string): EmbeddedMapPoint[] {
  return items.flatMap((item) => {
    const coordinates = getMapCoordinates(item);
    return coordinates ? [{
      ...coordinates,
      id: `${category}-${String(item.id)}`,
      label: labelFor(item),
      detail: item.address ?? item.locationText ?? item.territoryLabel ?? undefined,
      category,
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
  const animalPoints = useMemo(() => pointsFor(animals, 'animal', (a) => a.name || `Animal: ${a.species || 'Unknown'}`), [animals]);
  const casePoints = useMemo(() => pointsFor(cases.filter((c) => c.status === 'open'), 'case', (c) => c.title || 'Open case'), [cases]);
  const clinicPoints = useMemo(() => pointsFor(clinics, 'clinic', (p) => p.name || 'Veterinary clinic'), [clinics]);
  const abcPoints = useMemo(() => pointsFor(abcCentres, 'abc', (p) => p.name || 'ABC centre'), [abcCentres]);

  const visiblePoints = useMemo(() => [
    ...(showAnimals ? animalPoints : []),
    ...(showCases ? casePoints : []),
    ...(showClinics ? clinicPoints : []),
    ...(showAbcCentres ? abcPoints : []),
  ], [showAnimals, showCases, showClinics, showAbcCentres, animalPoints, casePoints, clinicPoints, abcPoints]);

  return (
    <OpenStreetMapEmbed
      points={visiblePoints}
      height={520}
      emptyLabel="No mapped records in the selected layers"
    />
  );
}
