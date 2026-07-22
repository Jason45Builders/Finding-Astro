"use client";

import React, { useEffect, useState } from "react";
import { Search, Phone, MapPin, Clock, Building2, ShoppingBag, HeartHandshake, PhoneCall, Leaf } from "lucide-react";
import { api, Partner } from "@/lib/api";
import { statusToken } from "@/lib/status";
import { Card } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { TabBar, TabButton } from "@/components/ui/Tabs";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

type PartnerTab = "clinics" | "stores" | "ngos" | "helplines" | "abcCentres";

const TABS: { key: PartnerTab; label: string; icon: React.ElementType; description: string }[] = [
  { key: "clinics", label: "Vet Clinics", icon: Building2, description: "Partner veterinary clinics accepting strays" },
  { key: "stores", label: "Pet Stores", icon: ShoppingBag, description: "Pet supply stores stocking medical items" },
  { key: "ngos", label: "Welfare Orgs", icon: HeartHandshake, description: "NGOs and animal welfare organisations" },
  { key: "helplines", label: "Helplines", icon: PhoneCall, description: "Emergency helplines and support contacts" },
  { key: "abcCentres", label: "ABC Centres", icon: Leaf, description: "Animal Birth Control surgery centres" },
];

export default function PartnersPage() {
  const [activeTab, setActiveTab] = useState<PartnerTab>("clinics");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchPartners = async () => {
      setLoading(true);
      setPartners([]);
      try {
        let data: Partner[] = [];
        switch (activeTab) {
          case "clinics":
            data = await api.listClinics(13.0827, 80.2707, 50);
            break;
          case "stores":
            data = await api.listStores(13.0827, 80.2707, 20);
            break;
          case "ngos":
            data = await api.listWelfareOrgs();
            break;
          case "helplines":
            data = await api.listHelplines();
            break;
          case "abcCentres":
            data = await api.listAbcCentres();
            break;
        }
        setPartners(data);
      } catch (err) {
        console.error(`Failed to load ${activeTab}`, err);
      } finally {
        setLoading(false);
      }
    };
    void fetchPartners();
  }, [activeTab]);

  const filtered = partners.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.address && p.address.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q))
    );
  });

  const currentTab = TABS.find((t) => t.key === activeTab)!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile sm:font-headline-lg sm:text-headline-lg text-on-surface tracking-tight">
          Partner Network
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Verified clinics, NGOs, helplines and ABC centres supporting Chennai&apos;s street animals
        </p>
      </div>

      <TabBar>
        {TABS.map((tab) => (
          <TabButton
            key={tab.key}
            active={activeTab === tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setSearch("");
            }}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </TabButton>
        ))}
      </TabBar>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-outline pointer-events-none" />
          <Input
            type="text"
            placeholder={`Search ${currentTab.label.toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-md"
          />
        </div>
        <p className="text-sm text-on-surface-variant">{currentTab.description}</p>
      </div>

      {loading ? (
        <PageSpinner />
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-stagger">
          {filtered.map((p) => (
            <Card key={p.id} interactive className="p-6 flex flex-col justify-between gap-4">
              <div>
                <StatusBadge token={statusToken.partnerType(p.type)} className="mb-3" />
                <h3 className="font-bold text-on-surface text-base leading-snug">{p.name}</h3>
                {p.address && (
                  <p className="text-xs text-on-surface-variant mt-2 flex items-start gap-1.5 leading-relaxed">
                    <MapPin className="w-3.5 h-3.5 text-outline mt-0.5 shrink-0" />
                    {p.address}
                  </p>
                )}
                {p.services && p.services.length > 0 && (
                  <p className="text-xs text-on-surface-variant mt-2 line-clamp-2">{p.services.join(", ")}</p>
                )}
              </div>
              <div className="border-t border-outline-variant pt-4 flex items-center justify-between">
                {p.phone ? (
                  <a
                    href={`tel:${p.phone}`}
                    className="text-sm font-bold text-primary hover:underline flex items-center gap-1.5 transition-colors duration-150 ease-out"
                  >
                    <Phone className="w-4 h-4" />
                    {p.phone}
                  </a>
                ) : (
                  <span className="text-xs text-outline">No phone listed</span>
                )}
                {p.is24hr && (
                  <Badge variant="success" className="gap-1">
                    <Clock className="w-3 h-3" /> 24 hrs
                  </Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Search}
          title="No partners found"
          description={
            search
              ? `No ${currentTab.label.toLowerCase()} match "${search}"`
              : `No ${currentTab.label.toLowerCase()} found.`
          }
        />
      )}
    </div>
  );
}
