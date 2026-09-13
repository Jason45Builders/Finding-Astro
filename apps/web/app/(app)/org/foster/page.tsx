"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Heart, MapPin, Users, Home as HomeIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { FosterHome, FosterAssignment, Animal } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateSafe } from "@/lib/utils";

type Tab = "homes" | "assignments";

export default function OrgFosterPage() {
  const { user } = useAuth();
  const [homes, setHomes] = useState<FosterHome[]>([]);
  const [assignments, setAssignments] = useState<FosterAssignment[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("homes");
  const [showHomeForm, setShowHomeForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [editingHome, setEditingHome] = useState<FosterHome | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [homeForm, setHomeForm] = useState({
    name: "", address: "", capacity: "1", currentAnimalsCount: "0",
    speciesAccepted: [] as string[], acceptsSpecialNeeds: false, hasOtherAnimals: false,
    hasChildren: false, experienceYears: "0", notes: "", fosterUserId: "",
    latitude: "", longitude: "", isActive: true,
  });

  const [assignForm, setAssignForm] = useState({
    fosterHomeId: "", animalId: "", caseId: "", startDate: new Date().toISOString().split("T")[0],
    endDate: "", status: "pending", notes: "",
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [homesData, assignmentsData, animalsData] = await Promise.all([
          api.listOrgFosterHomes(),
          api.listOrgFosterAssignments(),
          api.listOrgAnimals(),
        ]);
        if (!cancelled) {
          setHomes(homesData);
          setAssignments(assignmentsData);
          setAnimals(animalsData);
        }
      } catch (err) {
        console.error("Failed to load foster data", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const openCreateHome = () => {
    setEditingHome(null);
    setHomeForm({ name: "", address: "", capacity: "1", currentAnimalsCount: "0", speciesAccepted: [], acceptsSpecialNeeds: false, hasOtherAnimals: false, hasChildren: false, experienceYears: "0", notes: "", fosterUserId: "", latitude: "", longitude: "", isActive: true });
    setShowHomeForm(true);
  };

  const openEditHome = (home: FosterHome) => {
    setEditingHome(home);
    setHomeForm({
      name: home.name, address: home.address || "", capacity: String(home.capacity),
      currentAnimalsCount: String(home.currentAnimalsCount),
      speciesAccepted: home.speciesAccepted, acceptsSpecialNeeds: home.acceptsSpecialNeeds,
      hasOtherAnimals: home.hasOtherAnimals, hasChildren: home.hasChildren,
      experienceYears: String(home.experienceYears), notes: home.notes || "",
      fosterUserId: home.fosterUserId || "", latitude: home.location ? String(home.location.latitude) : "",
      longitude: home.location ? String(home.location.longitude) : "", isActive: home.isActive,
    });
    setShowHomeForm(true);
  };

  const handleHomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: homeForm.name,
        address: homeForm.address || undefined,
        capacity: parseInt(homeForm.capacity, 10) || 1,
        currentAnimalsCount: parseInt(homeForm.currentAnimalsCount, 10) || 0,
        speciesAccepted: homeForm.speciesAccepted,
        acceptsSpecialNeeds: homeForm.acceptsSpecialNeeds,
        hasOtherAnimals: homeForm.hasOtherAnimals,
        hasChildren: homeForm.hasChildren,
        experienceYears: parseInt(homeForm.experienceYears, 10) || 0,
        notes: homeForm.notes || undefined,
        fosterUserId: homeForm.fosterUserId || undefined,
        isActive: homeForm.isActive,
      };
      if (homeForm.latitude && homeForm.longitude) {
        payload.location = { latitude: parseFloat(homeForm.latitude), longitude: parseFloat(homeForm.longitude) };
      }

      if (editingHome) {
        const updated = await api.updateOrgFosterHome(editingHome.id, payload);
        setHomes((prev) => prev.map((h) => (h.id === editingHome.id ? updated : h)));
      } else {
        const created = await api.createOrgFosterHome(payload);
        setHomes((prev) => [created, ...prev]);
      }
      setShowHomeForm(false);
    } catch (err: any) {
      alert(err?.message || "Failed to save foster home");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        fosterHomeId: assignForm.fosterHomeId,
        animalId: assignForm.animalId,
        caseId: assignForm.caseId || undefined,
        startDate: assignForm.startDate ? new Date(assignForm.startDate).toISOString() : new Date().toISOString(),
        endDate: assignForm.endDate ? new Date(assignForm.endDate).toISOString() : undefined,
        status: assignForm.status,
        notes: assignForm.notes || undefined,
      };
      const created = await api.createOrgFosterAssignment(payload);
      setAssignments((prev) => [created, ...prev]);
      setShowAssignForm(false);
      setAssignForm({ fosterHomeId: "", animalId: "", caseId: "", startDate: new Date().toISOString().split("T")[0], endDate: "", status: "pending", notes: "" });
    } catch (err: any) {
      alert(err?.message || "Failed to create assignment");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Foster</h1>
          <p className="text-sm text-on-surface-variant">Manage foster homes and animal assignments</p>
        </div>
        <div className="flex gap-2">
          {tab === "homes" ? (
            <Button variant="primary" onClick={openCreateHome}><Plus className="w-4 h-4 mr-2" />New Foster Home</Button>
          ) : (
            <Button variant="primary" onClick={() => setShowAssignForm(true)}><Plus className="w-4 h-4 mr-2" />New Assignment</Button>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b border-outline-variant">
        <button onClick={() => setTab("homes")} className={`px-4 py-2 text-sm font-bold border-b-2 ${tab === "homes" ? "border-primary text-primary" : "border-transparent text-on-surface-variant"}`}>Foster Homes</button>
        <button onClick={() => setTab("assignments")} className={`px-4 py-2 text-sm font-bold border-b-2 ${tab === "assignments" ? "border-primary text-primary" : "border-transparent text-on-surface-variant"}`}>Assignments</button>
      </div>

      {tab === "homes" ? (
        homes.length === 0 ? (
          <Card className="p-8"><EmptyState icon={HomeIcon} title="No foster homes" description="Register your first foster home." /></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {homes.map((home) => (
              <Card key={home.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-on-surface">{home.name}</h3>
                    {home.address && <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {home.address}</p>}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant={home.isActive ? "success" : "danger"}>{home.isActive ? "Active" : "Inactive"}</Badge>
                      <Badge variant="neutral">Cap: {home.capacity}</Badge>
                      <Badge variant="neutral">Current: {home.currentAnimalsCount}</Badge>
                      {home.acceptsSpecialNeeds && <Badge variant="warning">Special Needs</Badge>}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openEditHome(home)}>Edit</Button>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : assignments.length === 0 ? (
        <Card className="p-8"><EmptyState icon={Users} title="No assignments" description="Create your first foster assignment." /></Card>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-on-surface">Animal: {a.animalId}</p>
                  <p className="text-xs text-on-surface-variant">Foster Home: {a.fosterHomeId}</p>
                  {a.caseId && <p className="text-xs text-on-surface-variant">Case: {a.caseId}</p>}
                  <div className="flex gap-2 mt-2">
                    <Badge variant={a.status === "active" ? "success" : a.status === "completed" ? "neutral" : "warning"}>{a.status}</Badge>
                     <span className="text-xs text-on-surface-variant">Started: {formatDateSafe(a.startDate, "TBD")}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showHomeForm} onClose={() => setShowHomeForm(false)} title={editingHome ? "Edit Foster Home" : "New Foster Home"}>
        <form onSubmit={handleHomeSubmit} className="space-y-4">
          <div>
            <Label>Home Name</Label>
            <Input value={homeForm.name} onChange={(e) => setHomeForm({ ...homeForm, name: e.target.value })} required />
          </div>
          <div>
            <Label>Address</Label>
            <Input value={homeForm.address} onChange={(e) => setHomeForm({ ...homeForm, address: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Capacity</Label>
              <Input type="number" value={homeForm.capacity} onChange={(e) => setHomeForm({ ...homeForm, capacity: e.target.value })} />
            </div>
            <div>
              <Label>Current Animals</Label>
              <Input type="number" value={homeForm.currentAnimalsCount} onChange={(e) => setHomeForm({ ...homeForm, currentAnimalsCount: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Latitude</Label>
              <Input type="number" step="any" value={homeForm.latitude} onChange={(e) => setHomeForm({ ...homeForm, latitude: e.target.value })} />
            </div>
            <div>
              <Label>Longitude</Label>
              <Input type="number" step="any" value={homeForm.longitude} onChange={(e) => setHomeForm({ ...homeForm, longitude: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowHomeForm(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : editingHome ? "Update" : "Create"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showAssignForm} onClose={() => setShowAssignForm(false)} title="New Foster Assignment">
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <div>
            <Label>Foster Home</Label>
            <Select value={assignForm.fosterHomeId} onChange={(e) => setAssignForm({ ...assignForm, fosterHomeId: e.target.value })} required>
              <option value="">Select a foster home</option>
              {homes.map((home) => (
                <option key={home.id} value={home.id}>{home.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Animal</Label>
            <Select value={assignForm.animalId} onChange={(e) => setAssignForm({ ...assignForm, animalId: e.target.value })} required>
              <option value="">Select an animal</option>
              {animals.map((animal) => (
                <option key={animal.id} value={animal.id}>{animal.name || animal.species} ({animal.id})</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Case ID (optional)</Label>
            <Input value={assignForm.caseId} onChange={(e) => setAssignForm({ ...assignForm, caseId: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={assignForm.startDate} onChange={(e) => setAssignForm({ ...assignForm, startDate: e.target.value })} required />
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" value={assignForm.endDate} onChange={(e) => setAssignForm({ ...assignForm, endDate: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowAssignForm(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}