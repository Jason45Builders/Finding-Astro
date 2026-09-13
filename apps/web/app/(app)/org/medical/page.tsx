"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Stethoscope } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Animal, AnimalMedicalRecord } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateSafe } from "@/lib/utils";

export default function OrgMedicalPage() {
  const { user } = useAuth();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<Record<string, AnimalMedicalRecord[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const animalsData = await api.listOrgAnimals();
        if (!cancelled) {
          setAnimals(animalsData);
          const recordsMap: Record<string, AnimalMedicalRecord[]> = {};
          await Promise.all(
            animalsData.slice(0, 20).map(async (animal) => {
              try {
                const records = await api.getAnimalMedicalHistory(animal.id);
                recordsMap[animal.id] = records;
              } catch {
                recordsMap[animal.id] = [];
              }
            })
          );
          if (!cancelled) setMedicalRecords(recordsMap);
        }
      } catch (err) {
        console.error("Failed to load medical data", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <PageSpinner />;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Medical Records</h1>
        <p className="text-sm text-on-surface-variant">Medical history for animals under your care</p>
      </div>

      {animals.length === 0 ? (
        <Card className="p-8">
          <EmptyState icon={Stethoscope} title="No animals found" description="Animals under your organization's care will appear here with their medical records." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {animals.map((animal) => {
            const records = medicalRecords[animal.id] ?? [];
            const latestRecord = records[0];
            return (
              <Card
                key={animal.id}
                className={`p-5 cursor-pointer transition-colors ${selectedAnimal?.id === animal.id ? "ring-2 ring-primary" : ""}`}
                onClick={() => setSelectedAnimal(animal)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-on-surface">{animal.name || "Unnamed"}</h3>
                    <p className="text-sm text-on-surface-variant">{animal.species}{animal.breed ? ` · ${animal.breed}` : ""}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant={animal.isSterilized ? "success" : "neutral"}>{animal.isSterilized ? "Sterilized" : "Not sterilized"}</Badge>
                      {animal.vaccinationStatus && <Badge variant="neutral">{animal.vaccinationStatus}</Badge>}
                    </div>
                  </div>
                </div>

                {selectedAnimal?.id === animal.id && (
                  <div className="mt-4 pt-4 border-t border-outline-variant space-y-3">
                    <h4 className="text-sm font-bold text-on-surface">Medical History ({records.length} records)</h4>
                    {records.length === 0 ? (
                      <p className="text-xs text-on-surface-variant">No medical records yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {records.slice(0, 5).map((record) => (
                          <div key={record.id} className="p-3 bg-surface-container-high rounded-lg">
                            <div className="flex items-center justify-between">
                              <Badge variant="neutral">{record.entryType}</Badge>
                                <span className="text-xs text-on-surface-variant">{formatDateSafe(record.treatmentDate, "No date")}</span>
                            </div>
                            <p className="text-sm font-bold text-on-surface mt-1">{record.title}</p>
                            {record.notes && <p className="text-xs text-on-surface-variant mt-1">{record.notes}</p>}
                            {record.providerName && <p className="text-xs text-on-surface-variant">Provider: {record.providerName}</p>}
                            {record.costAmount && <p className="text-xs text-on-surface-variant">Cost: ₹{record.costAmount}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                    <Link href={`/animals/${animal.id}`}>
                      <Button variant="outline" size="sm" className="w-full">View Full Profile</Button>
                    </Link>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}