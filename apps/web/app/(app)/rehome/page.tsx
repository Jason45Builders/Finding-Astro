"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, ClipboardList, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

type RehomeRequest = { id:string; animal_type:string; species:string; animal_name:string|null; status:string; review_notes:string|null; linked_animal_id:string|null; created_at:string; location_text?:string };
const statusLabels: Record<string,string> = { pending_review:"Awaiting review", needs_info:"More information requested", approved:"Approved and published", rejected:"Not approved", withdrawn:"Withdrawn" };

export default function RehomePage() {
  const { user } = useAuth();
  const [rows,setRows] = useState<RehomeRequest[]>([]);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [success,setSuccess] = useState("");
  const [form,setForm] = useState({animalType:"own_pet",species:"dog",animalName:"",breed:"",ageMonths:"",gender:"",description:"",rehomeReason:"",contactName:user?.fullName??"",contactPhone:user?.phone??"",locationText:"",latitude:"13.0827",longitude:"80.2707",photoUrl:"",ownershipConfirmed:false,helperAcknowledged:false});
  const load = async () => setRows(await api.request<RehomeRequest[]>("/rehome"));
  useEffect(()=>{if(!user)return;load().catch(e=>setError(e instanceof Error?e.message:"Could not load requests")).finally(()=>setLoading(false));},[user]);
  function set<K extends keyof typeof form>(key:K,value:typeof form[K]){setForm(p=>({...p,[key]:value}));}
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");setSuccess("");try{await api.request("/rehome",{method:"POST",body:JSON.stringify({...form,ageMonths:form.ageMonths?Number(form.ageMonths):undefined,latitude:Number(form.latitude),longitude:Number(form.longitude),ownershipConfirmed:form.animalType==="own_pet"&&form.ownershipConfirmed,helperAcknowledged:form.animalType==="community_animal"&&form.helperAcknowledged})});setSuccess("Submitted. The Finding Astro team will review the details before anything appears in the Adoption Centre.");setForm(p=>({...p,animalName:"",breed:"",ageMonths:"",description:"",rehomeReason:"",photoUrl:"",ownershipConfirmed:false,helperAcknowledged:false}));await load();}catch(e){setError(e instanceof Error?e.message:"Submission failed");}finally{setBusy(false);}}
  if(!user)return <div className="max-w-3xl mx-auto space-y-4"><h1 className="text-2xl font-bold">Rehome an Animal</h1><Card className="p-5">Please <Link className="text-primary underline" href="/login">sign in</Link> to submit and track a rehoming request.</Card></div>;
  if(loading)return <PageSpinner/>;
  return <div className="max-w-4xl mx-auto space-y-6">
    <div><h1 className="text-2xl font-bold flex items-center gap-2"><Heart className="w-6 h-6 text-secondary"/> Rehome an Animal</h1><p className="text-sm text-on-surface-variant mt-2">Submit details for a responsible review. Your phone number and exact coordinates are kept private and are not shown on the public adoption listing.</p></div>
    <Card className="p-5"><div className="flex gap-3"><ShieldCheck className="w-6 h-6 text-primary shrink-0"/><p className="text-sm">Every request is reviewed before publication. If you are helping a stray or community animal, this is a report for assessment—not a claim of ownership or permission to remove the animal from its territory.</p></div></Card>
    {error&&<p role="alert" className="text-sm text-error">{error}</p>}{success&&<p role="status" className="text-sm text-primary">{success}</p>}
    <Card className="p-5"><form onSubmit={submit} className="space-y-4">
      <div><Label>Which situation applies?</Label><Select value={form.animalType} onChange={e=>set("animalType",e.target.value)}><option value="own_pet">My pet / animal I am authorised to rehome</option><option value="community_animal">A stray or community animal I am helping</option></Select></div>
      <div className="grid sm:grid-cols-2 gap-4"><div><Label>Species</Label><Select value={form.species} onChange={e=>set("species",e.target.value)}><option value="dog">Dog</option><option value="cat">Cat</option><option value="bird">Bird</option><option value="other">Other</option></Select></div><div><Label>Name (optional)</Label><Input value={form.animalName} onChange={e=>set("animalName",e.target.value)} maxLength={100}/></div><div><Label>Breed (optional)</Label><Input value={form.breed} onChange={e=>set("breed",e.target.value)} maxLength={100}/></div><div><Label>Age in months (optional)</Label><Input type="number" min="0" value={form.ageMonths} onChange={e=>set("ageMonths",e.target.value)}/></div><div><Label>Gender (optional)</Label><Select value={form.gender} onChange={e=>set("gender",e.target.value)}><option value="">Unknown</option><option value="male">Male</option><option value="female">Female</option><option value="unknown">Unknown</option></Select></div><div><Label>Photo URL (optional)</Label><Input type="url" value={form.photoUrl} onChange={e=>set("photoUrl",e.target.value)} placeholder="https://…"/></div></div>
      <div><Label>Animal description and care needs</Label><Textarea required minLength={10} maxLength={2000} rows={3} value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Temperament, health, vaccination, special needs…"/></div>
      <div><Label>Why does the animal need rehoming / assessment?</Label><Textarea required minLength={10} maxLength={2000} rows={3} value={form.rehomeReason} onChange={e=>set("rehomeReason",e.target.value)}/></div>
      <div><Label>Area / locality (not shown with your contact details)</Label><Input required value={form.locationText} onChange={e=>set("locationText",e.target.value)} placeholder="Neighbourhood, city"/></div>
      <div className="grid sm:grid-cols-2 gap-4"><div><Label>Latitude</Label><Input required type="number" step="any" value={form.latitude} onChange={e=>set("latitude",e.target.value)}/></div><div><Label>Longitude</Label><Input required type="number" step="any" value={form.longitude} onChange={e=>set("longitude",e.target.value)}/></div></div>
      <div className="grid sm:grid-cols-2 gap-4"><div><Label>Your name</Label><Input required value={form.contactName} onChange={e=>set("contactName",e.target.value)} maxLength={100}/></div><div><Label>Private contact phone</Label><Input required type="tel" value={form.contactPhone} onChange={e=>set("contactPhone",e.target.value)} maxLength={20}/></div></div>
      {form.animalType==="own_pet"?<label className="flex items-start gap-2 text-sm"><input type="checkbox" required checked={form.ownershipConfirmed} onChange={e=>set("ownershipConfirmed",e.target.checked)} className="mt-1"/>I confirm I am the owner or legally authorised caretaker and have authority to seek rehoming.</label>:<label className="flex items-start gap-2 text-sm"><input type="checkbox" required checked={form.helperAcknowledged} onChange={e=>set("helperAcknowledged",e.target.checked)} className="mt-1"/>I am reporting a community animal for review, do not claim ownership, and understand Finding Astro must assess whether adoption is appropriate.</label>}
      <Button type="submit" disabled={busy}>{busy?"Submitting…":"Submit for review"}</Button>
    </form></Card>
    <section className="space-y-3"><h2 className="text-xl font-bold flex items-center gap-2"><ClipboardList className="w-5 h-5"/> My requests</h2>{!rows.length?<EmptyState title="No rehoming requests yet." description="Your submissions and review updates will appear here."/>:rows.map(r=><Card key={r.id} className="p-4 space-y-2"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold">{r.animal_name||"Unnamed"} · {r.species}</h3><span className="text-xs rounded-full bg-surface-container-high px-3 py-1">{statusLabels[r.status]||r.status}</span></div><p className="text-xs text-on-surface-variant">Submitted {new Date(r.created_at).toLocaleDateString()} · {r.animal_type==="own_pet"?"Owner rehoming":"Community animal report"}</p>{r.review_notes&&<p className="text-sm">Review note: {r.review_notes}</p>}{r.linked_animal_id&&<Link className="text-sm text-primary underline" href={"/animals/"+r.linked_animal_id}>View published animal profile</Link>}</Card>)}</section>
  </div>;
}
