"use client";

import React, { useEffect, useState } from "react";
import { Shield, Search, UserCheck, UserX, Loader2, Users as UsersIcon } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Input";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

type AdminUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  identityTier: number;
  isBanned: boolean;
  createdAt: string;
};

const ROLES = ["citizen", "ngo", "govt", "admin", "hospital"];

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.listAdminUsers(200);
      setUsers(data as AdminUser[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  if (!user || !["admin", "govt", "ngo"].includes(user.role)) {
    return (
      <EmptyState icon={Shield} title="Admin Access Required" className="max-w-xl mx-auto mt-20" />
    );
  }

  const handleBan = async (u: AdminUser) => {
    if (!confirm(`${u.isBanned ? "Unban" : "Ban"} user ${u.email}?`)) return;
    setSubmitting(u.id);
    try {
      await api.updateAdminUser(u.id, { isBanned: !u.isBanned });
      await load();
    } catch (e) {
      alert("Failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSubmitting(null);
    }
  };

  const handleRoleChange = async (u: AdminUser, newRole: string) => {
    if (!confirm(`Change ${u.email} role to ${newRole}?`)) return;
    setSubmitting(u.id);
    try {
      await api.updateAdminUser(u.id, { role: newRole });
      await load();
    } catch (e) {
      alert("Failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSubmitting(null);
    }
  };

  const handleTierChange = async (u: AdminUser, newTier: number) => {
    setSubmitting(u.id);
    try {
      await api.updateAdminUser(u.id, { identityTier: newTier });
      await load();
    } catch (e) {
      alert("Failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSubmitting(null);
    }
  };

  const filtered = users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()) || u.fullName?.toLowerCase().includes(search.toLowerCase()) || u.id.includes(search));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">User Management</h1>
        <p className="text-sm text-on-surface-variant mt-1">Ban/unban, change roles, view identity tiers.</p>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-outline" />
          <Input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by email, name, or ID..." className="pl-9 rounded-md" />
        </div>
      </Card>

      {loading ? (
        <PageSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState icon={UsersIcon} title="No users found" />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="text-left px-4 py-3 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">Role</th>
                  <th className="text-left px-4 py-3 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">Tier</th>
                  <th className="text-left px-4 py-3 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50">
                {filtered.map(u => (
                  <tr key={u.id} className={cn("hover:bg-surface-container transition-colors duration-150 ease-out", u.isBanned && "bg-error-container/20")}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-on-surface text-xs">{u.fullName || "No name"}</p>
                      <p className="text-[10px] text-on-surface-variant">{u.email}</p>
                      <p className="text-[10px] text-outline font-mono">{u.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Select value={u.role} onChange={e => handleRoleChange(u, e.target.value)} disabled={submitting === u.id} className="w-auto text-xs py-1.5 px-2">
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Select value={u.identityTier} onChange={e => handleTierChange(u, parseInt(e.target.value))} disabled={submitting === u.id} className="w-20 text-xs py-1.5 px-2">
                        {[0, 1, 2, 3, 4, 5].map(t => <option key={t} value={t}>Tier {t}</option>)}
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      {u.isBanned ? <Badge variant="danger">Banned</Badge> : <Badge variant="success">Active</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className={cn("p-1.5", u.isBanned ? "text-primary hover:bg-primary-container/40" : "text-error hover:bg-error-container/40")}
                        onClick={() => handleBan(u)}
                        disabled={submitting === u.id}
                      >
                        {submitting === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : u.isBanned ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
