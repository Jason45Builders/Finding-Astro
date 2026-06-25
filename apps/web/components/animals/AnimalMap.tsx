"use client";

import React from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import Link from "next/link";
import { Animal } from "../../lib/api";

interface AnimalMapProps {
  animals: Animal[];
}

export default function AnimalMap({ animals }: AnimalMapProps) {
  const getMarkerColor = (status: string) => {
    switch (status) {
      case "community":
        return "#16a34a"; // green
      case "lost":
        return "#dc2626"; // red
      case "found":
        return "#2563eb"; // blue
      case "adopted":
        return "#7c3aed"; // purple
      default:
        return "#64748b"; // slate
    }
  };

  const center: [number, number] = [13.0827, 80.2707]; // Chennai default

  return (
    <div className="w-full h-full relative min-h-[400px]">
      <MapContainer center={center} zoom={12} className="w-full h-full rounded-2xl">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {animals.map((animal) => {
          if (!animal.location?.latitude || !animal.location?.longitude) return null;
          return (
            <CircleMarker
              key={animal.id}
              center={[animal.location.latitude, animal.location.longitude]}
              radius={8}
              fillColor={getMarkerColor(animal.status)}
              color="#ffffff"
              weight={2}
              fillOpacity={0.8}
            >
              <Popup>
                <div className="p-1">
                  <h4 className="font-extrabold text-slate-800 text-sm">{animal.name || "Unnamed Animal"}</h4>
                  <p className="text-xs text-slate-500 capitalize">{animal.species} • {animal.status}</p>
                  <Link
                    href={`/animals/${animal.id}`}
                    className="text-xs text-primary font-bold hover:underline mt-2 block"
                  >
                    View Profile &rarr;
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
