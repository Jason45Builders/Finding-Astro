"use client";

import React, { useEffect, useState } from "react";
import { Shield, AlertTriangle, BookOpen, CheckCircle, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { api, BehaviourGuidanceCard } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { useRouter } from "next/navigation";

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
        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" /> Safety & Coexistence
        </h1>
        <p className="text-sm text-slate-500 mt-1">Education, guidance, and reporting for peaceful human–animal coexistence</p>
      </div>

      <div className="flex border-b border-slate-200 gap-6">
        {([["guidance","Get Guidance"],["report","Report Concern"],["education","Education Hub"]] as [Tab,string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-3 text-sm font-bold border-b-2 transition-all ${tab === t ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "guidance" && (
        <div className="space-y-5 max-w-xl">
          <p className="text-sm font-semibold text-slate-600">What is your situation?</p>
          <div className="space-y-2">
            {SITUATION_TYPES.map(st => (
              <button key={st.value} onClick={() => handleSituationSelect(st.value)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all ${situationType === st.value ? "border-primary bg-primary-light" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}>
                <span className="text-2xl">{st.icon}</span>
                <div>
                  <p className={`font-bold text-sm ${situationType === st.value ? "text-primary" : "text-slate-800"}`}>{st.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{st.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {loadingGuidance && <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>}

          {!loadingGuidance && contextualGuidance.length > 0 && (
            <div className="space-y-4">
              {contextualGuidance.map(card => (
                <div key={card.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                  <h3 className="font-bold text-slate-800">{card.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{card.content}</p>
                  {card.doItems.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">Do</p>
                      <ul className="space-y-1">
                        {card.doItems.map((item, i) => (
                          <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />{item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {card.dontItems.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-2">Don't</p>
                      <ul className="space-y-1">
                        {card.dontItems.map((item, i) => (
                          <li key={i} className="text-sm text-red-600 flex items-start gap-2">
                            <span className="text-red-400 font-bold shrink-0">✕</span>{item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
              <button onClick={() => setTab("report")}
                className="w-full bg-accent hover:bg-orange-700 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Report This Concern
              </button>
            </div>
          )}

          {!loadingGuidance && !situationType && (
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 text-center">
              <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Select a situation above to get instant guidance</p>
            </div>
          )}
        </div>
      )}

      {tab === "report" && (
        <div className="max-w-xl space-y-5">
          {success ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
              <h3 className="text-xl font-black text-slate-800">Concern Recorded</h3>
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-left">
                <p className="text-sm text-emerald-800 leading-relaxed">{success.humaneResponse}</p>
              </div>
              <button onClick={() => { setSuccess(null); setSituationType(""); setDescription(""); }}
                className="bg-primary text-white font-bold px-6 py-3 rounded-xl text-sm">Done</button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
              <h2 className="font-black text-slate-800 text-lg">Report a Safety Concern</h2>
              <p className="text-sm text-slate-500">This is not &quot;report the dog&quot; — it is &quot;report the situation.&quot; Welfare volunteers will follow up.</p>
              {!user && <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 font-semibold">Sign in required. <a href="/login" className="underline">Sign in here</a></div>}
              {error && <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-xl text-sm">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Situation Type</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SITUATION_TYPES.map(st => (
                      <button key={st.value} type="button" onClick={() => setSituationType(st.value)}
                        className={`p-3 rounded-xl border text-left ${situationType === st.value ? "border-primary bg-primary-light" : "border-slate-200 hover:border-slate-300"}`}>
                        <span className="text-base mr-1">{st.icon}</span>
                        <span className={`text-xs font-bold ${situationType === st.value ? "text-primary" : "text-slate-700"}`}>{st.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Severity</label>
                  <select value={severity} onChange={e => setSeverity(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm">
                    <option value="low">Low — observation only</option>
                    <option value="medium">Medium — needs attention</option>
                    <option value="high">High — urgent response needed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
                  <textarea rows={4} required value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Describe what you observed. Where exactly? How many animals? What were they doing?"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Your GPS Location</label>
                  <div className="flex gap-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <input readOnly value={latitude?.toFixed(5) ?? ""} placeholder="Latitude" className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600" />
                      <input readOnly value={longitude?.toFixed(5) ?? ""} placeholder="Longitude" className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600" />
                    </div>
                    <button type="button" onClick={detectLocation} disabled={detectingLocation}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-1.5 shrink-0">
                      <MapPin className="w-4 h-4" />{detectingLocation ? "..." : "Detect"}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={submitting || !situationType || !user}
                  className="w-full bg-accent hover:bg-orange-700 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                  {submitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                  {submitting ? "Submitting..." : "Submit Safety Concern"}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {tab === "education" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: "🐕", title: "Dog Body Language", desc: "Learn to read signs of fear, stress, and aggression before they escalate" },
              { icon: "🍽️", title: "Responsible Feeding", desc: "How and where to feed community animals safely without causing conflict" },
              { icon: "⚖️", title: "Animal Welfare Law", desc: "Your rights and responsibilities under the Prevention of Cruelty to Animals Act" },
            ].map(item => (
              <div key={item.title} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                <span className="text-3xl">{item.icon}</span>
                <h3 className="font-bold text-slate-800 mt-3 mb-2">{item.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
          ) : Object.keys(grouped).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(grouped).map(([type, cards]) => (
                <div key={type} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-slate-800">{SITUATION_LABEL[type] ?? type}</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {cards.map(card => (
                      <div key={card.id} className="px-5 py-4">
                        <button onClick={() => setExpandedCard(expandedCard === card.id ? null : card.id)}
                          className="w-full flex items-center justify-between text-left">
                          <span className="font-semibold text-slate-800 text-sm">{card.title}</span>
                          {expandedCard === card.id
                            ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                            : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                        </button>
                        {expandedCard === card.id && (
                          <div className="mt-3 space-y-3">
                            <p className="text-sm text-slate-600 leading-relaxed">{card.content}</p>
                            {card.doItems.length > 0 && (
                              <div>
                                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1.5">Do</p>
                                <ul className="space-y-1">
                                  {card.doItems.map((item, i) => (
                                    <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />{item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {card.dontItems.length > 0 && (
                              <div>
                                <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-1.5">Don&apos;t</p>
                                <ul className="space-y-1">
                                  {card.dontItems.map((item, i) => (
                                    <li key={i} className="text-sm text-red-600 flex items-start gap-2">
                                      <span className="text-red-400 font-bold shrink-0">✕</span>{item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
              <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              Education content will appear here once loaded from the platform.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
