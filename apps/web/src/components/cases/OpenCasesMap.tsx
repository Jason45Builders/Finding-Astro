'use client';

import { useMemo } from 'react';
import OpenStreetMapEmbed, { type EmbeddedMapPoint } from '@/components/maps/OpenStreetMapEmbed';
import { getMapCoordinates } from '@/lib/map-utils';

interface CaseForMap {
  id: string;
  title: string;
  location?: unknown;
  locationText?: string | null;
  priority?: string;
}

export default function OpenCasesMap({ cases }: { cases: CaseForMap[] }) {
  const points = useMemo<EmbeddedMapPoint[]>(() => cases.flatMap((item) => {
    const coordinates = getMapCoordinates(item);
    return coordinates ? [{
      id: String(item.id),
      label: item.title || 'Open emergency case',
      detail: `${item.priority || 'Unspecified'} priority · ${item.locationText || ''}`.trim(),
      category: 'case',
      ...coordinates,
    }] : [];
  }), [cases]);

  return (
    <OpenStreetMapEmbed
      points={points}
      height={360}
      emptyLabel="No open cases with valid coordinates"
    />
  );
}
