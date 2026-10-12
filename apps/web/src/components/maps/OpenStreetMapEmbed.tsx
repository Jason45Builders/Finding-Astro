'use client';

import { useMemo, useState } from 'react';
import type { MapCoordinates } from '@/lib/map-utils';

export type EmbeddedMapPoint = MapCoordinates & {
  id: string;
  label: string;
  detail?: string;
  category?: string;
};

function mapUrl(points: EmbeddedMapPoint[], selected: EmbeddedMapPoint | undefined) {
  const center = selected ?? points[0] ?? { latitude: 13.0827, longitude: 80.2707 };
  const lats = points.length ? points.map((point) => point.latitude) : [center.latitude];
  const lngs = points.length ? points.map((point) => point.longitude) : [center.longitude];
  const latSpan = Math.max(Math.max(...lats) - Math.min(...lats), 0.012);
  const lngSpan = Math.max(Math.max(...lngs) - Math.min(...lngs), 0.012);
  const south = Math.max(-85, Math.min(...lats) - latSpan * 0.18);
  const north = Math.min(85, Math.max(...lats) + latSpan * 0.18);
  const west = Math.max(-180, Math.min(...lngs) - lngSpan * 0.18);
  const east = Math.min(180, Math.max(...lngs) + lngSpan * 0.18);
  const bbox = [west, south, east, north].map((value) => value.toFixed(6)).join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${center.latitude.toFixed(6)}%2C${center.longitude.toFixed(6)}`;
}

export default function OpenStreetMapEmbed({
  points,
  height = 520,
  emptyLabel = 'No locations with valid coordinates',
}: {
  points: EmbeddedMapPoint[];
  height?: number;
  emptyLabel?: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = points.find((point) => point.id === selectedId) ?? points[0];
  const src = useMemo(() => mapUrl(points, selected), [points, selected]);
  const openUrl = selected
    ? `https://www.openstreetmap.org/?mlat=${selected.latitude}&mlon=${selected.longitude}#map=16/${selected.latitude}/${selected.longitude}`
    : 'https://www.openstreetmap.org/';

  return (
    <section className="w-full space-y-3">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100" style={{ height }}>
        <iframe
          key={src}
          title={selected ? `Map showing ${selected.label}` : 'OpenStreetMap'}
          src={src}
          className="block h-full w-full border-0"
          loading="eager"
          referrerPolicy="no-referrer"
          allowFullScreen
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <span>{selected ? `Selected: ${selected.label} · ${selected.latitude.toFixed(5)}, ${selected.longitude.toFixed(5)}` : emptyLabel}</span>
        <a className="font-semibold text-primary underline underline-offset-2" href={openUrl} target="_blank" rel="noreferrer">
          Open in OpenStreetMap
        </a>
      </div>
      {points.length > 0 ? (
        <div className="grid max-h-44 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
          {points.map((point) => {
            const active = point.id === (selected?.id ?? points[0]?.id);
            return (
              <button
                key={point.id}
                type="button"
                onClick={() => setSelectedId(point.id)}
                aria-pressed={active}
                className={`flex min-w-0 items-start gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${active ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
              >
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${active ? 'bg-primary' : 'bg-slate-400'}`} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-900">{point.label}</span>
                  {point.detail && <span className="block truncate text-xs text-slate-500">{point.detail}</span>}
                  <span className="block text-xs text-slate-500">{point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-600">{emptyLabel}</div>
      )}
    </section>
  );
}
