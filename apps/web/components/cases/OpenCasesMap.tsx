"use client";

import React from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import Link from "next/link";
import { Case } from "../../lib/api";

interface OpenCasesMapProps {
  cases: Case[];
}

export default function OpenCasesMap({ cases }: OpenCasesMapProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "#dc2626"; // red
      case "medium":
        return "#d97706"; // amber
      default:
        return "#475569"; // slate
    }
  };

  const center: [number, number] = [13.0827, 80.2707]; // Chennai center

  return (
    <div className="w-full h-full relative min-h-[400px]">
      <MapContainer center={center} zoom={12} className="w-full h-full rounded-2xl">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {cases.map((c) => {
          if (!c.location?.latitude || !c.location?.longitude) return null;
          return (
            <CircleMarker
              key={c.id}
              center={[c.location.latitude, c.location.longitude]}
              radius={9}
              fillColor={getPriorityColor(c.priority)}
              color="#ffffff"
              weight={2}
              fillOpacity={0.8}
            >
              <Popup>
                <div className="p-1">
                  <h4 className="font-extrabold text-slate-800 text-sm">{c.title}</h4>
                  <p className="text-xs text-slate-500 capitalize">{c.caseType} • Priority: {c.priority}</p>
                  <Link
                    href={`/cases/${c.id}`}
                    className="text-xs text-primary font-bold hover:underline mt-2 block"
                  >
                    View Details &rarr;
                  </Link>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
