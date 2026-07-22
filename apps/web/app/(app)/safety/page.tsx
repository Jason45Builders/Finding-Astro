"use client";

import React, { useEffect, useState } from "react";
import { Shield, AlertTriangle, BookOpen, CheckCircle, MapPin, ChevronDown, ChevronUp, X as XIcon } from "lucide-react";
import { api, BehaviourGuidanceCard } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, Label } from "@/components/ui/Input";
import { TabBar, TabButton } from "@/components/ui/Tabs";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

const SITUATION_TYPES = [
  { value: "feel_unsafe",        label: "I Feel Unsafe",    icon: "🚶", desc: "Dogs nearby are making you feel threatened" },
  { value: "aggression_concern", label: "Aggression",       icon: "⚠️", desc: "A dog is showing aggressive signs" },
  { value: "bite_incident",      label: "Bite Incident",    icon: "🩹", desc: "A person or animal was bitten" },
  { value: "pack_concern",       label: "Pack Behaviour",   icon: "🐕", desc: "A large group of dogs acting together" },
  { value: "child_safety",       label: "Child Safety",     icon: "👶", desc: "Children near dogs in a concerning situation" },
];

type Tab = "guidance" | "report" | "education";

export default function SafetyPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("guidance");
  const [allGuidance, setAllGuidance] = useState<BehaviourGuidanceCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [situationType, setSituationType] = useState("");
  const [contextualGuidance, setContextualGuidance] = useState<BehaviourGuidanceCard[]>([]);
  const [loadingGuidance, setLoadingGuidance] = useState(false);
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ humaneResponse: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listBehaviourGuidance().then(setAllGuidance).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSituationSelect = async (st: string) => {
    setSituationType(st);
    setLoadingGuidance(true);
    try {
      const cards = await api.listBehaviourGuidance(st);
      setContextualGuidance(cards);
    } catch { setContextualGuidance([]); }
    finally { setLoadingGuidance(false); }
  };

  const detectLocation = () => {
    setDetectingLocation(true);
    navigator.geolocation?.getCurrentPosition(
      pos => { setLatitude(pos.coords.latitude); setLongitude(pos.coords.longitude); setDetectingLocation(false); },
      () => setDetectingLocation(false)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { router.push("/login"); return; }
    if (!latitude || !longitude) { setError("Please detect your location"); return; }
    setSubmitting(true); setError(null);
    try {
      const result = await api.reportSafetyConcern({ situationType, description, latitude, longitude, severity });
      setSuccess({ humaneResponse: result.humaneResponse });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit report");
    } finally { setSubmitting(false); }
  };

  const grouped = allGuidance.reduce<Record<string, BehaviourGuidanceCard[]>>((acc, card) => {
    if (!acc[card.situationType]) acc[card.situationType] = [];
    acc[card.situationType].push(card);
    return acc;
  }, {});

  const SITUATION_LABEL: Record<string, string> = {
    feel_unsafe: "Feeling Unsafe Near Dogs", aggression_concern: "Handling Aggression",
    bite_incident: "After a Bite", pack_concern: "Pack Behaviour",
    child_safety: "Child Safety", general: "General Guidance",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface tracking-tight flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" /> Safety & Coexistence
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">Education, guidance, and reporting for peaceful human–animal coexistence</p>
      </div>

      <TabBar>
        <TabButton active={tab === "guidance"} onClick={() => setTab("guidance")}>Get Guidance</TabButton>
        <TabButton active={tab === "report"} onClick={() => setTab("report")}>Report Concern</TabButton>
        <TabButton active={tab === "education"} onClick={() => setTab("education")}>Education Hub</TabButton>
      </TabBar>

      {tab === "guidance" && (
        <div className="space-y-5 max-w-xl">
          <p className="text-sm font-bold text-on-surface-variant">What is your situation?</p>
          <div className="space-y-2 animate-stagger">
            {SITUATION_TYPES.map(st => (
              <button key={st.value} onClick={() => handleSituationSelect(st.value)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-150 ease-out active:scale-[0.98]",
                  situationType === st.value
                    ? "border-primary bg-primary-container text-on-primary-container"
                    : "border-outline-variant bg-surface-container-lowest hover:bg-surface-container"
                )}>
                <span className="text-2xl">{st.icon}</span>
                <div>
                  <p className={cn("font-bold text-sm", situationType === st.value ? "text-on-primary-container" : "text-on-surface")}>{st.label}</p>
                  <p className={cn("text-xs mt-0.5", situationType === st.value ? "text-on-primary-container/80" : "text-on-surface-variant")}>{st.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {loadingGuidance && <div className="flex justify-center py-6"><Spinner size="sm" /></div>}

          {!loadingGuidance && contextualGuidance.length > 0 && (
            <div className="space-y-4">
              {contextualGuidance.map(card => (
                <Card key={card.id} className="p-5 space-y-3">
                  <h3 className="font-bold text-on-surface">{card.title}</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{card.content}</p>
                  {card.doItems.length > 0 && (
                    <div>
                      <p className="font-label-caps text-label-caps text-green-700 uppercase mb-2">Do</p>
                      <ul className="space-y-1">
                        {card.doItems.map((item, i) => (
                          <li key={i} className="text-sm text-on-surface-variant flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />{item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {card.dontItems.length > 0 && (
                    <div>
                      <p className="font-label-caps text-label-caps text-error uppercase mb-2">Don&apos;t</p>
                      <ul className="space-y-1">
                        {card.dontItems.map((item, i) => (
                          <li key={i} className="text-sm text-on-error-container flex items-start gap-2">
                            <XIcon className="w-4 h-4 text-error shrink-0 mt-0.5" />{item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              ))}
              <Button variant="coral" size="lg" className="w-full" onClick={() => setTab("report")}>
                <AlertTriangle className="w-4 h-4" /> Report This Concern
              </Button>
            </div>
          )}

          {!loadingGuidance && !situationType && (
            <EmptyState icon={Shield} title="Select a situation above" description="Choose a situation to get instant guidance" />
          )}
        </div>
      )}

      {tab === "report" && (
        <div className="max-w-xl space-y-5">
          {success ? (
            <Card className="p-10 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle className="w-9 h-9 text-green-600" />
              </div>
              <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Concern Recorded</h3>
              <div className="bg-green-100 rounded-md p-4 text-left">
                <p className="text-sm text-green-800 leading-relaxed">{success.humaneResponse}</p>
              </div>
              <Button variant="primary" onClick={() => { setSuccess(null); setSituationType(""); setDescription(""); }}>Done</Button>
            </Card>
          ) : (
            <Card className="p-6 space-y-5">
              <h2 className="font-title-md text-title-md text-on-surface">Report a Safety Concern</h2>
              <p className="text-sm text-on-surface-variant">This is not &quot;report the dog&quot; — it is &quot;report the situation.&quot; Welfare volunteers will follow up.</p>
              {!user && (
                <div className="bg-secondary-container text-on-secondary-container rounded-md p-4 text-sm font-bold">
                  Sign in required. <a href="/login" className="underline">Sign in here</a>
                </div>
              )}
              {error && <div className="bg-error-container text-on-error-container p-4 rounded-md text-sm font-medium">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Situation Type</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SITUATION_TYPES.map(st => (
                      <button key={st.value} type="button" onClick={() => setSituationType(st.value)}
                        className={cn(
                          "p-3 rounded-md border-2 text-left transition-all duration-150 ease-out active:scale-95",
                          situationType === st.value
                            ? "border-primary bg-primary-container text-on-primary-container"
                            : "border-outline-variant bg-surface-container-low hover:bg-surface-container"
                        )}>
                        <span className="text-base mr-1">{st.icon}</span>
                        <span className={cn("text-xs font-bold", situationType === st.value ? "text-on-primary-container" : "text-on-surface")}>{st.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Severity</Label>
                  <Select value={severity} onChange={e => setSeverity(e.target.value)}>
                    <option value="low">Low — observation only</option>
                    <option value="medium">Medium — needs attention</option>
                    <option value="high">High — urgent response needed</option>
                  </Select>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea rows={4} required value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Describe what you observed. Where exactly? How many animals? What were they doing?" />
                </div>
                <div className="space-y-2">
                  <Label className="mb-0">Your GPS Location</Label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Input type="text" placeholder="Latitude" readOnly value={latitude !== null ? latitude.toFixed(6) : ""} className="rounded-md" />
                      <Input type="text" placeholder="Longitude" readOnly value={longitude !== null ? longitude.toFixed(6) : ""} className="rounded-md" />
                    </div>
                    <Button type="button" variant="ghost" onClick={detectLocation} disabled={detectingLocation} className="bg-surface-container-high shrink-0">
                      <MapPin className="w-4 h-4" />{detectingLocation ? "Detecting..." : "Detect Location"}
                    </Button>
                  </div>
                </div>
                <Button type="submit" variant="coral" size="lg" className="w-full" disabled={submitting || !situationType || !user}>
                  {submitting ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                  {submitting ? "Submitting..." : "Submit Safety Concern"}
                </Button>
              </form>
            </Card>
          )}
        </div>
      )}

      {tab === "education" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-stagger">
            {[
              { icon: "🐕", title: "Dog Body Language", desc: "Learn to read signs of fear, stress, and aggression before they escalate" },
              { icon: "🍽️", title: "Responsible Feeding", desc: "How and where to feed community animals safely without causing conflict" },
              { icon: "⚖️", title: "Animal Welfare Law", desc: "Your rights and responsibilities under the Prevention of Cruelty to Animals Act" },
            ].map(item => (
              <Card key={item.title} className="p-5">
                <span className="text-3xl">{item.icon}</span>
                <h3 className="font-bold text-on-surface mt-3 mb-2">{item.title}</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">{item.desc}</p>
              </Card>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : Object.keys(grouped).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(grouped).map(([type, cards]) => (
                <Card key={type} className="overflow-hidden">
                  <div className="px-5 py-4 border-b border-outline-variant bg-surface-container-low">
                    <h3 className="font-bold text-on-surface">{SITUATION_LABEL[type] ?? type}</h3>
                  </div>
                  <div className="divide-y divide-outline-variant/50">
                    {cards.map(card => {
                      const expanded = expandedCard === card.id;
                      return (
                        <div key={card.id} className="px-5 py-4">
                          <button onClick={() => setExpandedCard(expanded ? null : card.id)}
                            className="w-full flex items-center justify-between text-left">
                            <span className="font-bold text-on-surface text-sm">{card.title}</span>
                            {expanded
                              ? <ChevronUp className="w-4 h-4 text-outline shrink-0" />
                              : <ChevronDown className="w-4 h-4 text-outline shrink-0" />}
                          </button>
                          <div
                            className={cn(
                              "grid transition-all duration-200 ease-out overflow-hidden",
                              expanded ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0"
                            )}
                          >
                            <div className="min-h-0 space-y-3">
                              <p className="text-sm text-on-surface-variant leading-relaxed">{card.content}</p>
                              {card.doItems.length > 0 && (
                                <div>
                                  <p className="font-label-caps text-label-caps text-green-700 uppercase mb-1.5">Do</p>
                                  <ul className="space-y-1">
                                    {card.doItems.map((item, i) => (
                                      <li key={i} className="text-sm text-on-surface-variant flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />{item}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {card.dontItems.length > 0 && (
                                <div>
                                  <p className="font-label-caps text-label-caps text-error uppercase mb-1.5">Don&apos;t</p>
                                  <ul className="space-y-1">
                                    {card.dontItems.map((item, i) => (
                                      <li key={i} className="text-sm text-on-error-container flex items-start gap-2">
                                        <XIcon className="w-4 h-4 text-error shrink-0 mt-0.5" />{item}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon={BookOpen} title="No education content yet" description="Education content will appear here once loaded from the platform." />
          )}
        </div>
      )}
    </div>
  );
}
