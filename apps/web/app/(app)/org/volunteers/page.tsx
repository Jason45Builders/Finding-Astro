"use client";

import React, { useEffect, useState } from "react";
import { Plus, Users, Phone, Car, Heart, Stethoscope, Search } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { VolunteerProfile } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

const SKILLS = ["rescue", "transport", "foster", "medical", "abc", "adoption", "photography", "legal", "other"];

export default function OrgVolunteersPage() {
  const { user } = useAuth();
  const [volunteers, setVolunteers] = useState<VolunteerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<VolunteerProfile | null>(null);
  const [form, setForm] = useState({
    email: "",
    skills: [] as string[],
    isAvailable: true,
    availabilityNotes: "",
    hasVehicle: false,
    vehicleType: "",
    vehicleCapacity: "",
    canFoster: false,
    fosterCapacity: "0",
    fosterSpeciesAccepted: [] as string[],
    canRescue: false,
    canTransport: false,
    hasMedicalKnowledge: false,
    emergencyContactName: "",
    emergencyContactPhone: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<{ email: string; tempPassword: string; message?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api.listOrgVolunteers();
        if (!cancelled) setVolunteers(data);
      } catch (err) {
        console.error("Failed to load volunteers", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      email: "", skills: [], isAvailable: true, availabilityNotes: "", hasVehicle: false,
      vehicleType: "", vehicleCapacity: "", canFoster: false, fosterCapacity: "0",
      fosterSpeciesAccepted: [], canRescue: false, canTransport: false, hasMedicalKnowledge: false,
      emergencyContactName: "", emergencyContactPhone: "", notes: "",
    });
    setShowForm(true);
  };

  const openEdit = (v: VolunteerProfile) => {
    setEditing(v);
    setForm({
      email: v.userId,
      skills: v.skills,
      isAvailable: v.isAvailable,
      availabilityNotes: v.availabilityNotes || "",
      hasVehicle: v.hasVehicle,
      vehicleType: v.vehicleType || "",
      vehicleCapacity: v.vehicleCapacity ? String(v.vehicleCapacity) : "",
      canFoster: v.canFoster,
      fosterCapacity: String(v.fosterCapacity),
      fosterSpeciesAccepted: v.fosterSpeciesAccepted,
      canRescue: v.canRescue,
      canTransport: v.canTransport,
      hasMedicalKnowledge: v.hasMedicalKnowledge,
      emergencyContactName: v.emergencyContactName || "",
      emergencyContactPhone: v.emergencyContactPhone || "",
      notes: v.notes || "",
    });
    setShowForm(true);
  };

  const toggleSkill = (skill: string) => {
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill) ? prev.skills.filter((s) => s !== skill) : [...prev.skills, skill],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setInviteInfo(null);
    try {
      const payload = {
        email: form.email,
        skills: form.skills,
        isAvailable: form.isAvailable,
        availabilityNotes: form.availabilityNotes || undefined,
        hasVehicle: form.hasVehicle,
        vehicleType: form.vehicleType || undefined,
        vehicleCapacity: form.vehicleCapacity ? parseInt(form.vehicleCapacity, 10) : undefined,
        canFoster: form.canFoster,
        fosterCapacity: parseInt(form.fosterCapacity, 10) || 0,
        fosterSpeciesAccepted: form.fosterSpeciesAccepted,
        canRescue: form.canRescue,
        canTransport: form.canTransport,
        hasMedicalKnowledge: form.hasMedicalKnowledge,
        emergencyContactName: form.emergencyContactName || undefined,
        emergencyContactPhone: form.emergencyContactPhone || undefined,
        notes: form.notes || undefined,
      };

      if (editing) {
        const updated = await api.updateOrgVolunteer(editing.id, payload);
        setVolunteers((prev) => prev.map((v) => (v.id === editing.id ? updated : v)));
        setShowForm(false);
      } else {
        const result = await api.createOrgVolunteer(payload) as any;
        const volunteer = result.volunteer ?? result;
        setVolunteers((prev) => [volunteer, ...prev]);
        if (result.tempPassword) {
          setInviteInfo({ email: form.email, tempPassword: result.tempPassword, message: result.message });
        } else {
          setShowForm(false);
        }
      }
    } catch (err: any) {
      alert(err?.message || "Failed to save volunteer");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Volunteers</h1>
          <p className="text-sm text-on-surface-variant">Manage volunteer profiles, skills, and availability</p>
        </div>
        <Button variant="primary" onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Volunteer</Button>
      </div>

      {volunteers.length === 0 ? (
        <Card className="p-8">
          <EmptyState icon={Users} title="No volunteers yet" description="Add volunteer profiles to coordinate your team." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {volunteers.map((v) => (
            <Card key={v.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                 <div className="flex items-center gap-2">
                   <p className="font-bold text-on-surface">{v.userName || v.userEmail || "Unknown User"}</p>
                   {v.userEmail && <span className="text-xs text-on-surface-variant">{v.userEmail}</span>}
                   <Badge variant={v.isAvailable ? "success" : "danger"}>{v.isAvailable ? "Available" : "Unavailable"}</Badge>
                 </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {v.skills.map((skill) => (
                      <Badge key={skill} variant="neutral">{skill}</Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-3 text-xs text-on-surface-variant">
                    {v.hasVehicle && <span className="flex items-center gap-1"><Car className="w-3 h-3" /> {v.vehicleType || "Vehicle"}{v.vehicleCapacity ? ` (${v.vehicleCapacity})` : ""}</span>}
                    {v.canFoster && <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> Foster (cap: {v.fosterCapacity})</span>}
                    {v.hasMedicalKnowledge && <span className="flex items-center gap-1"><Stethoscope className="w-3 h-3" /> Medical</span>}
                  </div>
                  {v.emergencyContactPhone && (
                    <p className="text-xs text-on-surface-variant mt-2 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {v.emergencyContactName}: {v.emergencyContactPhone}
                    </p>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => openEdit(v)}>Edit</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? "Edit Volunteer" : "Add Volunteer"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="user@example.com" required />
          </div>
          <div>
            <Label>Skills</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {SKILLS.map((skill: string) => (
                <button key={skill} type="button" onClick={() => toggleSkill(skill)} className={`px-3 py-1 rounded-full text-xs font-bold border ${form.skills.includes(skill) ? "bg-primary text-white border-primary" : "border-outline text-on-surface-variant"}`}>
                  {skill}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { id: "canRescue", label: "Can Rescue", checked: form.canRescue, onChange: (v: boolean) => setForm({ ...form, canRescue: v }) },
              { id: "canTransport", label: "Can Transport", checked: form.canTransport, onChange: (v: boolean) => setForm({ ...form, canTransport: v }) },
              { id: "hasVehicle", label: "Has Vehicle", checked: form.hasVehicle, onChange: (v: boolean) => setForm({ ...form, hasVehicle: v }) },
              { id: "canFoster", label: "Can Foster", checked: form.canFoster, onChange: (v: boolean) => setForm({ ...form, canFoster: v }) },
              { id: "hasMedicalKnowledge", label: "Medical Knowledge", checked: form.hasMedicalKnowledge, onChange: (v: boolean) => setForm({ ...form, hasMedicalKnowledge: v }) },
              { id: "isAvailable", label: "Available", checked: form.isAvailable, onChange: (v: boolean) => setForm({ ...form, isAvailable: v }) },
            ].map((item) => (
              <label key={item.id} htmlFor={item.id} className="flex items-center gap-2 cursor-pointer">
                <input id={item.id} type="checkbox" checked={item.checked} onChange={(e) => item.onChange(e.target.checked)} className="w-4 h-4 rounded border-outline text-primary focus:ring-primary" />
                <span className="text-sm text-on-surface">{item.label}</span>
              </label>
            ))}
          </div>
          {form.hasVehicle && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vehicle Type</Label>
                <Input value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} />
              </div>
              <div>
                <Label>Capacity</Label>
                <Input type="number" value={form.vehicleCapacity} onChange={(e) => setForm({ ...form, vehicleCapacity: e.target.value })} />
              </div>
            </div>
          )}
          {form.canFoster && (
            <div>
              <Label>Foster Capacity</Label>
              <Input type="number" value={form.fosterCapacity} onChange={(e) => setForm({ ...form, fosterCapacity: e.target.value })} />
            </div>
          )}
          <div>
            <Label>Availability Notes</Label>
            <Textarea value={form.availabilityNotes} onChange={(e) => setForm({ ...form, availabilityNotes: e.target.value })} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Emergency Contact Name</Label>
              <Input value={form.emergencyContactName} onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })} />
            </div>
            <div>
              <Label>Emergency Contact Phone</Label>
              <Input value={form.emergencyContactPhone} onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : editing ? "Update" : "Add"}</Button>
          </div>
        </form>
      </Modal>

      {inviteInfo && (
        <Modal open={!!inviteInfo} onClose={() => setInviteInfo(null)} title="Account Created">
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant">{inviteInfo.message}</p>
            <div className="bg-surface-container-low rounded-lg p-4 space-y-2">
              <div>
                <p className="text-xs text-on-surface-variant">Email</p>
                <p className="font-mono text-sm text-on-surface">{inviteInfo.email}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Temporary Password</p>
                <p className="font-mono text-sm text-on-surface">{inviteInfo.tempPassword}</p>
              </div>
            </div>
            <p className="text-xs text-on-surface-variant">Share these credentials with the volunteer. They can change the password after logging in.</p>
            <div className="flex justify-end">
              <Button onClick={() => setInviteInfo(null)}>Done</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}