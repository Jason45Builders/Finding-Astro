"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard, Cat, ClipboardList, Calendar, DollarSign,
  Users, PawPrint, Heart, Activity, Syringe, CheckCircle2
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { OrgDashboardStats } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

const ORG_NAV_ITEMS = [
  { label: "Dashboard", href: "/org/dashboard", icon: LayoutDashboard },
  { label: "Animals", href: "/org/animals", icon: Cat },
  { label: "Tasks", href: "/org/tasks", icon: ClipboardList },
  { label: "Events", href: "/org/events", icon: Calendar },
  { label: "Expenses", href: "/org/expenses", icon: DollarSign },
  { label: "Team", href: "/org/members", icon: Users },
  { label: "Settings", href: "/org/settings", icon: Activity },
];

const STAT_CARDS: { label: string; key: keyof OrgDashboardStats; icon: React.ElementType; color: string }[] = [
  { label: "Animals in Care", key: "totalAnimals", icon: PawPrint, color: "text-primary" },
  { label: "Active Rescues", key: "activeRescues", icon: Activity, color: "text-error" },
  { label: "Adoption Ready", key: "adoptionReady", icon: Heart, color: "text-success" },
  { label: "Medical Cases", key: "medicalCases", icon: Syringe, color: "text-warning" },
  { label: "Vaccinations Due", key: "vaccinationsDue", icon: CheckCircle2, color: "text-primary" },
  { label: "Pending Adoptions", key: "pendingAdoptions", icon: Heart, color: "text-warning" },
  { label: "Donations (Month)", key: "donationsThisMonth", icon: DollarSign, color: "text-success" },
  { label: "Expenses (Month)", key: "expensesThisMonth", icon: DollarSign, color: "text-error" },
  { label: "Active Volunteers", key: "activeVolunteers", icon: Users, color: "text-primary" },
  { label: "Open Tasks", key: "openTasks", icon: ClipboardList, color: "text-warning" },
  { label: "Upcoming Events", key: "upcomingEvents", icon: Calendar, color: "text-primary" },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export default function OrgDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<OrgDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api.getOrgDashboard();
        if (!cancelled) setStats(data);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <PageSpinner />;

  if (error || !stats) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="p-8 text-center">
          <p className="text-error">{error || "Unable to load dashboard"}</p>
          <p className="text-sm text-on-surface-variant mt-2">Make sure your organization is verified and you are a member.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Organization Dashboard</h1>
          <p className="text-sm text-on-surface-variant">Good morning, {user?.fullName || "Team"}</p>
        </div>
        <Link href="/org/animals"><Button variant="primary"><PawPrint className="w-4 h-4 mr-2" />New Animal</Button></Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          const value = stats[card.key];
          const display = card.key === "donationsThisMonth" || card.key === "expensesThisMonth"
            ? formatCurrency(value as number)
            : value;
          return (
            <Card key={card.key as React.Key} className="p-4 space-y-1">
              <div className="flex items-center gap-2 text-xs text-on-surface-variant font-bold uppercase tracking-wide">
                <Icon className={cn("w-4 h-4", card.color)} />
                {card.label}
              </div>
              <p className={cn("text-2xl font-bold font-headline-md", card.color)}>{display}</p>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {ORG_NAV_ITEMS.filter(item => item.href !== "/org/dashboard").map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-outline-variant hover:bg-surface-container-high transition-colors">
                    <Icon className="w-5 h-5 text-primary" />
                    <span className="text-sm font-bold text-on-surface">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <p className="text-sm text-on-surface-variant">Dashboard is live. Use the sidebar to manage animals, tasks, events, expenses, and team members.</p>
            <div className="p-3 bg-surface-container-high rounded-lg text-sm text-on-surface-variant">
              <p className="font-bold text-on-surface">Getting Started</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Add animals under your care</li>
                <li>Create tasks for your team</li>
                <li>Schedule an ABC camp or adoption drive</li>
                <li>Record your first expense</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}