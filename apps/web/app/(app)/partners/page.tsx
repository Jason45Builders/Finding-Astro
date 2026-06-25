"use client";

import React, { useEffect, useState } from "react";
import { Search, Phone, MapPin, Clock, Building2, ShoppingBag, HeartHandshake, PhoneCall, Leaf } from "lucide-react";
import { api, Partner } from "../../../lib/api";

type PartnerTab = "clinics" | "stores" | "ngos" | "helplines" | "abcCentres";

const TABS: { key: PartnerTab; label: string; icon: React.ElementType; description: string }[] = [
  { key: "clinics", label: "Vet Clinics", icon: Building2, description: "Partner veterinary clinics accepting strays" },
  { key: "stores", label: "Pet Stores", icon: ShoppingBag, description: "Pet supply stores stocking medical items" },
  { key: "ngos", label: "Welfare Orgs", icon: HeartHandshake, description: "NGOs and animal welfare organisations" },
  { key: "helplines", label: "Helplines", icon: PhoneCall, description: "Emergency helplines and support contacts" },
  { key: "abcCentres", label: "ABC Centres", icon: Leaf, description: "Animal Birth Control surgery centres" },
];

const PARTNER_TYPE_BADGE: Record<PartnerTab, string> = {
  clinics: "bg-sky-100 text-sky-800",
  stores: "bg-amber-100 text-amber-800",
  ngos: "bg-emerald-100 text-emerald-800",
  helplines: "bg-red-100 text-red-800",
  abcCentres: "bg-purple-100 text-purple-800",
};

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
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Partner Network</h1>
        <p className="text-sm text-slate-500 mt-1">
          Verified clinics, NGOs, helplines and ABC centres supporting Chennai's street animals
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-1 flex overflow-x-auto gap-1 shadow-sm">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setSearch("");
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                active
                  ? "bg-primary text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${currentTab.label.toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
          />
        </div>
        <p className="text-sm text-slate-500">{currentTab.description}</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-4"
            >
              <div>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3 ${PARTNER_TYPE_BADGE[activeTab]}`}
                >
                  {currentTab.label.slice(0, -1)}
                </span>
                <h3 className="font-bold text-slate-800 text-base leading-snug">{p.name}</h3>
                {p.address && (
                  <p className="text-xs text-slate-500 mt-2 flex items-start gap-1.5 leading-relaxed">
                    <MapPin className="w-3.5 h-3.5 text-slate-300 mt-0.5 shrink-0" />
                    {p.address}
                  </p>
                )}
                {p.services && p.services.length > 0 && (
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">{p.services.join(", ")}</p>
                )}
              </div>
              <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                {p.phone ? (
                  <a
                    href={`tel:${p.phone}`}
                    className="text-sm font-bold text-primary hover:underline flex items-center gap-1.5"
                  >
                    <Phone className="w-4 h-4" />
                    {p.phone}
                  </a>
                ) : (
                  <span className="text-xs text-slate-400">No phone listed</span>
                )}
                {p.is24hr && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-accent uppercase tracking-wider">
                    <Clock className="w-3 h-3" /> 24 hrs
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center text-slate-400 text-sm">
          {search
            ? `No ${currentTab.label.toLowerCase()} match "${search}"`
            : `No ${currentTab.label.toLowerCase()} found.`}
        </div>
      )}
    </div>
  );
}
