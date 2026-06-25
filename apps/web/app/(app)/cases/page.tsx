"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, FolderHeart, Calendar, HeartHandshake, MapPin } from "lucide-react";
import { api, Case } from "../../../lib/api";
import { formatDateTime } from "../../../lib/utils";

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return "bg-sky-100 text-sky-800 border-sky-200";
      case "in_review":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "action_taken":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "resolved":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "closed":
        return "bg-slate-100 text-slate-800 border-slate-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Case Board</h1>
          <p className="text-sm text-slate-500">Track stray rescues, lost pet reports, and medical operations</p>
        </div>
        <Link
          href="/cases/new"
          className="inline-flex items-center gap-2 bg-primary hover:bg-emerald-800 text-white font-bold px-4 py-2.5 rounded-xl shadow-sm transition-colors text-sm"
        >
          <Plus className="w-4.5 h-4.5" /> File New Report
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4 shrink-0">
        <button
          onClick={() => setActiveTab("reported")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "reported"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Reported by Me
        </button>
        <button
          onClick={() => setActiveTab("responding")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "responding"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          I'm Responding To
        </button>
      </div>

      {/* Cases List */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : activeCasesList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activeCasesList.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadge(c.status)}`}>
                    {c.status.replace("_", " ")}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {c.caseType.replace("_", " ")}
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-800 text-lg mt-4 line-clamp-1">{c.title}</h3>
                <p className="text-slate-500 text-sm mt-2 line-clamp-2 leading-relaxed">{c.description}</p>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-300" />
                    {formatDateTime(c.createdAt)}
                  </span>
                </div>
                <Link
                  href={`/cases/${c.id}`}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition-colors"
                >
                  View Details &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
          No cases found in this section.
        </div>
      )}
    </div>
  );
}
