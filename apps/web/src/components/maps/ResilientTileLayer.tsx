'use client';

import { useEffect, useState } from 'react';
import { TileLayer } from 'react-leaflet';

/**
 * Keep the interactive Leaflet map usable when one public raster-tile host
 * is blocked, throttled, or unavailable. No API key is required.
 */
export default function ResilientTileLayer() {
  const [provider, setProvider] = useState<'osm' | 'carto' | 'failed'>('osm');
  const [tileErrors, setTileErrors] = useState(0);

  useEffect(() => {
    if (provider === 'osm' && tileErrors >= 2) {
      setProvider('carto');
      setTileErrors(0);
    } else if (provider === 'carto' && tileErrors >= 2) {
      setProvider('failed');
      setTileErrors(0);
    }
  }, [provider, tileErrors]);

  const onTileError = () => setTileErrors((count) => count + 1);

  return (
    <>
      {provider === 'osm' && (
        <TileLayer
          key="osm"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          eventHandlers={{ tileerror: onTileError }}
        />
      )}
      {provider === 'carto' && (
        <TileLayer
          key="carto"
          attribution='&copy; OpenStreetMap contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
          eventHandlers={{ tileerror: onTileError }}
        />
      )}
      {provider === 'failed' && (
        <div className="leaflet-bottom leaflet-left" style={{ zIndex: 1000 }}>
          <div className="leaflet-control rounded-md bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow">
            Map tiles are unavailable. Check your connection and refresh.
          </div>
        </div>
      )}
    </>
  );
}
