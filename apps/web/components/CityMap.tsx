"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { Animal, Case, Partner } from "../lib/api";

interface CityMapProps {
  animals: Animal[];
  cases: Case[];
  clinics: Partner[];
  abcCentres: Partner[];
  showAnimals: boolean;
  showCases: boolean;
  showClinics: boolean;
  showAbcCentres: boolean;
}

const ANIMAL_STATUS_COLOR: Record<string, string> = {
  community: "#16a34a",
  lost: "#dc2626",
  found: "#2563eb",
  adopted: "#9333ea",
};

const CASE_PRIORITY_COLOR: Record<string, string> = {
  high: "#E85D26",
  medium: "#d97706",
  low: "#64748b",
};

function RecenterMap() {
  const map = useMap();
  useEffect(() => {
    map.setView([13.0827, 80.2707], 12);
  }, [map]);
  return null;
}

export default function CityMap({
  animals,
  cases,
  clinics,
  abcCentres,
  showAnimals,
  showCases,
  showClinics,
  showAbcCentres,
}: CityMapProps) {
  return (
    <MapContainer
      center={[13.0827, 80.2707]}
      zoom={12}
      style={{ width: "100%", height: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterMap />

      {showAnimals &&
        animals.map((a) =>
          a.location?.latitude && a.location?.longitude ? (
            <CircleMarker
              key={`animal-${a.id}`}
              center={[a.location.latitude, a.location.longitude]}
              radius={7}
              pathOptions={{
                color: ANIMAL_STATUS_COLOR[a.status] ?? "#64748b",
                fillColor: ANIMAL_STATUS_COLOR[a.status] ?? "#64748b",
                fillOpacity: 0.85,
                weight: 1.5,
              }}
            >
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <strong style={{ fontSize: 13 }}>{a.name || "Unnamed Stray"}</strong>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    {a.species} {a.breed ? `· ${a.breed}` : ""}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      padding: "2px 8px",
                      borderRadius: 12,
                      background: "#E8F5EE",
                      color: "#1A6B4A",
                      fontSize: 11,
                      fontWeight: 700,
                      display: "inline-block",
                      textTransform: "uppercase",
                    }}
                  >
                    {a.status}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <a
                      href={`/animals/${a.id}`}
                      style={{ fontSize: 12, color: "#1A6B4A", fontWeight: 700 }}
                    >
                      View Profile →
                    </a>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ) : null
        )}

      {showCases &&
        cases.map((c) =>
          c.location?.latitude && c.location?.longitude ? (
            <CircleMarker
              key={`case-${c.id}`}
              center={[c.location.latitude, c.location.longitude]}
              radius={9}
              pathOptions={{
                color: CASE_PRIORITY_COLOR[c.priority] ?? "#64748b",
                fillColor: CASE_PRIORITY_COLOR[c.priority] ?? "#64748b",
                fillOpacity: 0.9,
                weight: 2,
              }}
            >
              <Popup>
                <div style={{ minWidth: 170 }}>
                  <strong style={{ fontSize: 13 }}>{c.title}</strong>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2, textTransform: "uppercase" }}>
                    {c.caseType.replace("_", " ")} · {c.priority} priority
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <a
                      href={`/cases/${c.id}`}
                      style={{ fontSize: 12, color: "#E85D26", fontWeight: 700 }}
                    >
                      View Case →
                    </a>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ) : null
        )}

      {showClinics &&
        clinics.map((p) =>
          p.latitude && p.longitude ? (
            <CircleMarker
              key={`clinic-${p.id}`}
              center={[p.latitude, p.longitude]}
              radius={8}
              pathOptions={{
                color: "#0284c7",
                fillColor: "#0284c7",
                fillOpacity: 0.8,
                weight: 1.5,
              }}
            >
              <Popup>
                <div style={{ minWidth: 150 }}>
                  <strong style={{ fontSize: 13 }}>{p.name}</strong>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Veterinary Clinic</div>
                  {p.phone && (
                    <div style={{ fontSize: 12, marginTop: 4, color: "#1e40af" }}>{p.phone}</div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          ) : null
        )}

      {showAbcCentres &&
        abcCentres.map((p) =>
          p.latitude && p.longitude ? (
            <CircleMarker
              key={`abc-${p.id}`}
              center={[p.latitude, p.longitude]}
              radius={8}
              pathOptions={{
                color: "#7c3aed",
                fillColor: "#7c3aed",
                fillOpacity: 0.8,
                weight: 1.5,
              }}
            >
              <Popup>
                <div style={{ minWidth: 150 }}>
                  <strong style={{ fontSize: 13 }}>{p.name}</strong>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>ABC Centre</div>
                  {p.phone && (
                    <div style={{ fontSize: 12, marginTop: 4, color: "#7c3aed" }}>{p.phone}</div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          ) : null
        )}
    </MapContainer>
  );
}
