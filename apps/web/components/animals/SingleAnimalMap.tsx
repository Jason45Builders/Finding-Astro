"use client";

import React from "react";
import { MapContainer, TileLayer, CircleMarker } from "react-leaflet";

interface SingleAnimalMapProps {
  latitude: number;
  longitude: number;
  color?: string;
}

export default function SingleAnimalMap({ latitude, longitude, color = "#16a34a" }: SingleAnimalMapProps) {
  const center: [number, number] = [latitude, longitude];

  return (
    <div className="w-full h-full min-h-[250px] relative">
      <MapContainer center={center} zoom={14} className="w-full h-full rounded-2xl">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CircleMarker
          center={center}
          radius={10}
          fillColor={color}
          color="#ffffff"
          weight={3}
          fillOpacity={0.8}
        />
      </MapContainer>
    </div>
  );
}
