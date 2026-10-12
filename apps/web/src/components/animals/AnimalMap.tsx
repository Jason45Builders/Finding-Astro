'use client';

import { useMemo } from 'react';
import OpenStreetMapEmbed, { type EmbeddedMapPoint } from '@/components/maps/OpenStreetMapEmbed';
import { getMapCoordinates } from '@/lib/map-utils';

export default function AnimalMap({ animals }: { animals: any[] }) {
  const points = useMemo<EmbeddedMapPoint[]>(() => animals.flatMap((animal) => {
    const coordinates = getMapCoordinates(animal);
    return coordinates ? [{
      id: String(animal.id),
      label: animal.name || 'Unnamed animal',
      detail: [animal.species, animal.breed, animal.territoryLabel].filter(Boolean).join(' · '),
      category: 'animal',
      ...coordinates,
    }] : [];
  }), [animals]);

  return (
    <OpenStreetMapEmbed
      points={points}
      height={520}
      emptyLabel="No animals with valid coordinates in this view"
    />
  );
}
