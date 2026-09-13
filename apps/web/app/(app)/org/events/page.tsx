"use client";

import React, { useEffect, useState } from "react";
import { Plus, Calendar, MapPin, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Event } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateSafe } from "@/lib/utils";

type EventForm = {
  title: string;
  description: string;
  eventType: string;
  date: string;
  locationText: string;
  latitude: string;
  longitude: string;
  capacity: string;
  status: "planned" | "active" | "completed" | "cancelled";
};

const EMPTY_FORM: EventForm = {
  title: "",
  description: "",
  eventType: "",
  date: new Date().toISOString().slice(0, 16),
  locationText: "",
  latitude: "",
  longitude: "",
  capacity: "",
  status: "planned",
};

export default function OrgEventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api.listOrgEvents(filter ? { status: filter } : undefined);
        if (!cancelled) setEvents(data);
      } catch (err) {
        console.error("Failed to load events", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [filter]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (evt: Event) => {
    setEditing(evt);
    const dateObj = new Date(evt.date);
    const local = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setForm({
      title: evt.title,
      description: evt.description || "",
      eventType: evt.eventType || "",
      date: local,
      locationText: evt.locationText || "",
      latitude: evt.location ? String(evt.location.latitude) : "",
      longitude: evt.location ? String(evt.location.longitude) : "",
      capacity: evt.capacity ? String(evt.capacity) : "",
      status: evt.status,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        description: form.description || undefined,
        eventType: form.eventType || undefined,
        date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
        locationText: form.locationText || undefined,
        status: form.status,
      };

      if (form.latitude && form.longitude) {
        payload.location = { latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude) };
      }

      if (form.capacity) payload.capacity = parseInt(form.capacity, 10);

      if (editing) {
        const updated = await api.updateOrgEvent(editing.id, payload);
        setEvents((prev) => prev.map((e) => (e.id === editing.id ? updated : e)));
      } else {
        const created = await api.createOrgEvent(payload);
        setEvents((prev) => [created, ...prev]);
      }
      setShowForm(false);
    } catch (err: any) {
      alert(err?.message || "Failed to save event");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    try {
      await api.deleteOrgEvent(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      alert(err?.message || "Failed to delete event");
    }
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Events & Camps</h1>
          <p className="text-sm text-on-surface-variant">Schedule adoption drives, ABC camps, and awareness programs</p>
        </div>
        <Button variant="primary" onClick={openCreate}><Plus className="w-4 h-4 mr-2" />New Event</Button>
      </div>

      <Card className="p-4">
        <div className="flex gap-2">
          {["", "planned", "active", "completed", "cancelled"].map((s) => (
            <Button key={s || "all"} variant={filter === s ? "primary" : "outline"} size="sm" onClick={() => setFilter(s)}>
              {s || "All"}
            </Button>
          ))}
        </div>
      </Card>

      {events.length === 0 ? (
        <Card className="p-8">
          <EmptyState icon={Calendar} title="No events yet" description="Schedule your first event or camp." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((evt) => (
            <Card key={evt.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-bold text-on-surface">{evt.title}</h3>
                  {evt.description && <p className="text-sm text-on-surface-variant mt-1 line-clamp-2">{evt.description}</p>}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant={evt.status === "active" ? "success" : evt.status === "completed" ? "neutral" : evt.status === "cancelled" ? "danger" : "warning"}>{evt.status}</Badge>
                     {evt.eventType && <Badge variant="neutral">{evt.eventType}</Badge>}
                    <span className="text-xs text-on-surface-variant flex items-center gap-1">
                       <Calendar className="w-3 h-3" /> {formatDateSafe(evt.date, "TBD")}
                    </span>
                    {evt.capacity && (
                      <span className="text-xs text-on-surface-variant flex items-center gap-1">
                        <Users className="w-3 h-3" /> {evt.registrationsCount}/{evt.capacity}
                      </span>
                    )}
                    {evt.locationText && (
                      <span className="text-xs text-on-surface-variant flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {evt.locationText}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => openEdit(evt)}>Edit</Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(evt.id)}>Delete</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? "Edit Event" : "New Event"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Event Type</Label>
              <Input value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })} placeholder="e.g. ABC Camp" />
            </div>
            <div>
              <Label>Date & Time</Label>
              <Input type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
          </div>
          <div>
            <Label>Location Text</Label>
            <Input value={form.locationText} onChange={(e) => setForm({ ...form, locationText: e.target.value })} placeholder="e.g. Marina Beach" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Latitude</Label>
              <Input type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
            </div>
            <div>
              <Label>Longitude</Label>
              <Input type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Capacity</Label>
              <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as EventForm["status"] })}>
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : editing ? "Update" : "Create"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}