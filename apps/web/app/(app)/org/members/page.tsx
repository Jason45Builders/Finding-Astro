"use client";

import React, { useEffect, useState } from "react";
import { Plus, Users, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { OrganizationMember } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

const ORG_ROLES: { value: OrganizationMember["orgRole"]; label: string }[] = [
  { value: "org_admin", label: "Org Admin" },
  { value: "rescue_coordinator", label: "Rescue Coordinator" },
  { value: "medical_coordinator", label: "Medical Coordinator" },
  { value: "adoption_coordinator", label: "Adoption Coordinator" },
  { value: "finance", label: "Finance" },
  { value: "volunteer", label: "Volunteer" },
  { value: "vet", label: "Vet" },
  { value: "foster", label: "Foster" },
];

export default function OrgMembersPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [userId, setUserId] = useState("");
  const [orgRole, setOrgRole] = useState<OrganizationMember["orgRole"]>("volunteer");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api.listOrgMembers();
        if (!cancelled) setMembers(data);
      } catch (err) {
        console.error("Failed to load members", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const member = await api.addOrgMember({ userId, orgRole });
      setMembers((prev) => [member, ...prev]);
      setUserId("");
      setOrgRole("volunteer");
      setShowForm(false);
    } catch (err: any) {
      alert(err?.message || "Failed to add member");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Remove this member?")) return;
    try {
      await api.removeOrgMember(id);
      setMembers((prev) => prev.filter((m) => m.id !== id));
    } catch (err: any) {
      alert(err?.message || "Failed to remove member");
    }
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Team Members</h1>
          <p className="text-sm text-on-surface-variant">Manage organization roles and permissions</p>
        </div>
        <Button variant="primary" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" />Add Member</Button>
      </div>

      {members.length === 0 ? (
        <Card className="p-8">
          <EmptyState icon={Users} title="No team members yet" description="Add members by their user ID." />
        </Card>
      ) : (
        <div className="space-y-3">
          {members.map((member) => (
            <Card key={member.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-on-surface">User ID: {member.userId}</p>
                  <Badge variant="neutral" className="mt-1">{member.orgRole.replace("_", " ")}</Badge>
                  <p className="text-xs text-on-surface-variant mt-1">Permissions: {Object.keys(member.permissions).length > 0 ? JSON.stringify(member.permissions) : "default"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={member.isActive ? "success" : "danger"}>{member.isActive ? "Active" : "Inactive"}</Badge>
                  <Button size="sm" variant="danger" onClick={() => handleRemove(member.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Team Member">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <Label>User ID</Label>
            <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="UUID of the user to add" required />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={orgRole} onChange={(e) => setOrgRole(e.target.value as OrganizationMember["orgRole"])}>
              {ORG_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
            </Select>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Adding..." : "Add Member"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}