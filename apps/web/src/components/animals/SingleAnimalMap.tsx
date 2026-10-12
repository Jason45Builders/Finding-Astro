'use client';

import OpenStreetMapEmbed from '@/components/maps/OpenStreetMapEmbed';

export default function SingleAnimalMap({ lat, lng, name, status }: { lat: number; lng: number; name: string; status: string }) {
  const point = {
    id: 'animal-location',
    label: name,
    detail: status,
    latitude: lat,
    longitude: lng,
    category: 'animal',
  };

  return (
    <OpenStreetMapEmbed
      points={[point]}
      height={288}
      emptyLabel="This animal has no valid map coordinates"
    />
  );
}
