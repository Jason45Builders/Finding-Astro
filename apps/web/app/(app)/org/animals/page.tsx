"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, PawPrint } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Animal } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

export default function OrgAnimalsPage() {
  const { user } = useAuth();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api.listOrgAnimals(statusFilter ? { status: statusFilter } : undefined);
        if (!cancelled) setAnimals(data);
      } catch (err: any) {
        console.error("Failed to load org animals", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [statusFilter]);

  const filtered = animals.filter((a) => {
    const matchSearch = !search || (a.name?.toLowerCase().includes(search.toLowerCase())) || (a.species ?? "").toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  if (loading) return <PageSpinner />;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Animals</h1>
          <p className="text-sm text-on-surface-variant">Animals under your organization&apos;s care</p>
        </div>
        <Link href="/animals/new"><Button variant="primary"><Plus className="w-4 h-4 mr-2" />Add Animal</Button></Link>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <Input
              type="text"
              placeholder="Search by name or species..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            {["", "community", "lost", "found", "reunited", "adopted"].map((status) => (
              <Button
                key={status || "all"}
                variant={statusFilter === status ? "primary" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(status)}
              >
                {status || "All"}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-8">
          <EmptyState icon={PawPrint} title="No animals found" description="Animals assigned to your organization will appear here." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((animal) => (
            <Link key={animal.id} href={`/animals/${animal.id}`}>
              <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-on-surface">{animal.name || "Unnamed"}</h3>
                     <p className="text-sm text-on-surface-variant">{animal.species ?? "Unknown"}{animal.breed ? ` · ${animal.breed}` : ""}</p>
                  </div>
                  <Badge variant={animal.status === "adopted" ? "success" : animal.status === "lost" ? "danger" : "neutral"}>
                    {animal.status ?? "unknown"}
                  </Badge>
                </div>
                {animal.primaryPhotoUrl && (
                  <img src={animal.primaryPhotoUrl} alt="" className="mt-3 w-full h-40 object-cover rounded-lg" />
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}