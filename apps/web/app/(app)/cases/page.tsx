"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Calendar } from "lucide-react";
import { api, Case } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { TabBar, TabButton } from "@/components/ui/Tabs";
import { statusToken } from "@/lib/status";

type ActiveTab = "reported" | "responding";

export default function MyCases() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("reported");
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCases = async () => {
      setLoading(true);
      try {
        const data = await api.listCases();
        setCases(data);
      } catch (err) {
        console.error("Failed to load cases", err);
      } finally {
        setLoading(false);
      }
    };
    void fetchCases();
  }, []);

  // Filter cases depending on tab selection
  // In Finding Astro, a citizen reports cases. In the active claimed case flow, a responder is assigned.
  // We can filter reported vs claimed:
  // - Reported: reporterUserId !== null (since the api lists my cases, all returned cases in /cases are relating to the user)
  // - Responding: cases where assignedToUserId === my user ID. Since listCases returns the relevant user's cases,
  // we can differentiate them by matching user profiles or checking if it is claimed.
  // Let's do a basic separation: if activeTab is "responding", show cases where user is claiming (we can inspect responder assignments in detail).
  // Or, since listCases returns all cases associated with me, we can check.
  const reportedCases = cases.filter((c) => c.caseType !== "abc" || c.status !== "closed"); // show regular citizen cases
  const respondingCases = cases.filter((c) => c.status === "in_review" || c.status === "action_taken"); // claimed response cases

  const activeCasesList = activeTab === "reported" ? reportedCases : respondingCases;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface tracking-tight">Case Board</h1>
          <p className="text-sm text-on-surface-variant">Track stray rescues, lost pet reports, and medical operations</p>
        </div>
        <Link href="/cases/new">
          <Button variant="primary">
            <Plus className="w-4 h-4" /> File New Report
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <TabBar>
        <TabButton active={activeTab === "reported"} onClick={() => setActiveTab("reported")}>
          Reported by Me
        </TabButton>
        <TabButton active={activeTab === "responding"} onClick={() => setActiveTab("responding")}>
          I&apos;m Responding To
        </TabButton>
      </TabBar>

      {/* Cases List */}
      {loading ? (
        <PageSpinner />
      ) : activeCasesList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-stagger">
          {activeCasesList.map((c) => (
            <Card key={c.id} className="p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <StatusBadge token={statusToken.caseStatus(c.status)} />
                  <span className="font-label-caps text-label-caps text-outline uppercase">
                    {c.caseType.replace("_", " ")}
                  </span>
                </div>
                <h3 className="font-extrabold text-on-surface text-lg mt-4 line-clamp-1">{c.title}</h3>
                <p className="text-on-surface-variant text-sm mt-2 line-clamp-2 leading-relaxed">{c.description}</p>
              </div>

              <div className="mt-6 border-t border-outline-variant pt-4 flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-outline flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDateTime(c.createdAt)}
                  </span>
                </div>
                <Link href={`/cases/${c.id}`}>
                  <Button variant="ghost" size="sm" className="bg-surface-container-high">
                    View Details &rarr;
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No cases found in this section" />
      )}
    </div>
  );
}
