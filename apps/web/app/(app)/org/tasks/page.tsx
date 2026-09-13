"use client";

import React, { useEffect, useState } from "react";
import { Plus, ClipboardList, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Task } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

type TaskForm = {
  title: string;
  description: string;
  assigneeUserId: string;
  caseId: string;
  animalId: string;
  dueDate: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed" | "cancelled";
};

const EMPTY_FORM: TaskForm = {
  title: "",
  description: "",
  assigneeUserId: "",
  caseId: "",
  animalId: "",
  dueDate: "",
  priority: "medium",
  status: "pending",
};

export default function OrgTasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api.listOrgTasks(filter ? { status: filter } : undefined);
        if (!cancelled) setTasks(data);
      } catch (err) {
        console.error("Failed to load tasks", err);
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

  const openEdit = (task: Task) => {
    setEditing(task);
    setForm({
      title: task.title,
      description: task.description || "",
      assigneeUserId: task.assigneeUserId || "",
      caseId: task.caseId || "",
      animalId: task.animalId || "",
      dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
      priority: task.priority,
      status: task.status,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        assigneeUserId: form.assigneeUserId || undefined,
        caseId: form.caseId || undefined,
        animalId: form.animalId || undefined,
        dueDate: form.dueDate || undefined,
        priority: form.priority,
        status: form.status,
      };

      if (editing) {
        const updated = await api.updateOrgTask(editing.id, payload);
        setTasks((prev) => prev.map((t) => (t.id === editing.id ? updated : t)));
      } else {
        const created = await api.createOrgTask(payload);
        setTasks((prev) => [created, ...prev]);
      }
      setShowForm(false);
    } catch (err: any) {
      alert(err?.message || "Failed to save task");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    try {
      await api.deleteOrgTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      alert(err?.message || "Failed to delete task");
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="w-4 h-4 text-success" />;
      case "in_progress": return <Clock className="w-4 h-4 text-primary" />;
      case "cancelled": return <AlertTriangle className="w-4 h-4 text-error" />;
      default: return <ClipboardList className="w-4 h-4 text-warning" />;
    }
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Tasks</h1>
          <p className="text-sm text-on-surface-variant">Track and assign work for your team</p>
        </div>
        <Button variant="primary" onClick={openCreate}><Plus className="w-4 h-4 mr-2" />New Task</Button>
      </div>

      <Card className="p-4">
        <div className="flex gap-2">
          {["", "pending", "in_progress", "completed", "cancelled"].map((s) => (
            <Button key={s || "all"} variant={filter === s ? "primary" : "outline"} size="sm" onClick={() => setFilter(s)}>
              {s || "All"}
            </Button>
          ))}
        </div>
      </Card>

      {tasks.length === 0 ? (
        <Card className="p-8">
          <EmptyState icon={ClipboardList} title="No tasks yet" description="Create tasks to coordinate your team's work." />
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {statusIcon(task.status)}
                  <div>
                    <h3 className="font-bold text-on-surface">{task.title}</h3>
                    {task.description && <p className="text-sm text-on-surface-variant mt-1">{task.description}</p>}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant={task.priority === "urgent" ? "danger" : task.priority === "high" ? "warning" : "neutral"}>{task.priority}</Badge>
                      <Badge variant="neutral">{task.status.replace("_", " ")}</Badge>
                      {task.dueDate && <span className="text-xs text-on-surface-variant">Due {task.dueDate}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => openEdit(task)}>Edit</Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(task.id)}>Delete</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? "Edit Task" : "New Task"}>
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
              <Label>Priority</Label>
              <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskForm["priority"] })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TaskForm["status"] })}>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
          </div>
          <div>
            <Label>Due Date</Label>
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
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