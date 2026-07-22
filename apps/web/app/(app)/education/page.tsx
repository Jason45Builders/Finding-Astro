"use client";

import React, { useEffect, useState } from "react";
import { BookOpen, Filter, Search } from "lucide-react";
import { api, EducationContent } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Input";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

const AUDIENCES = ["community", "student", "responder", "ngo", "admin"];

export default function EducationHubPage() {
  const [items, setItems] = useState<EducationContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [audience, setAudience] = useState("community");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    api.listEducationContent(audience)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [audience]);

  const filtered = items.filter(item =>
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    item.summary.toLowerCase().includes(search.toLowerCase()) ||
    item.topicKey.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile sm:font-headline-lg sm:text-headline-lg text-on-surface tracking-tight flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" /> Education Hub
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Guidance for handling animal encounters, welfare, and community safety.
        </p>
      </div>

      <Card className="p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-outline pointer-events-none" />
          <Input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search topics..."
            className="pl-9 rounded-md"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-outline shrink-0" />
          <Select value={audience} onChange={e => setAudience(e.target.value)} className="rounded-md">
            {AUDIENCES.map(a => (
              <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>
            ))}
          </Select>
        </div>
      </Card>

      {loading ? (
        <PageSpinner />
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-stagger">
          {filtered.map(item => (
            <Card key={item.id} interactive className="p-6">
              <Badge variant="primary" className="mb-3">{item.audience}</Badge>
              <h3 className="font-bold text-on-surface text-sm mb-2">{item.title}</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed mb-4">{item.summary}</p>
              {item.actionPoints && item.actionPoints.length > 0 && (
                <div className="space-y-1.5">
                  {item.actionPoints.slice(0, 3).map((point, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-on-surface-variant">
                      <span className="w-4 h-4 rounded-full bg-primary text-on-primary text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      {point}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={BookOpen} title="No education content" description="No education content found for this audience." />
      )}
    </div>
  );
}
