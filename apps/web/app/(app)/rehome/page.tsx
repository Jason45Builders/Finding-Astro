"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, ClipboardList, ShieldCheck, ImagePlus, X } from "lucide-react";
import { Photo } from "@/components/ui/Photo";
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
  const [uploadingPhoto,setUploadingPhoto] = useState(false);
  const [photoError,setPhotoError] = useState("");
  const [form,setForm] = useState({animalType:"own_pet",species:"dog",animalName:"",breed:"",ageMonths:"",gender:"",description:"",rehomeReason:"",contactName:user?.fullName??"",contactPhone:user?.phone??"",locationText:"",latitude:"13.0827",longitude:"80.2707",photoUrl:"",ownershipConfirmed:false,helperAcknowledged:false});
  const load = async () => setRows(await api.request<RehomeRequest[]>("/rehome"));
  useEffect(()=>{if(!user)return;load().catch(e=>setError(e instanceof Error?e.message:"Could not load requests")).finally(()=>setLoading(false));},[user]);
  function set<K extends keyof typeof form>(key:K,value:typeof form[K]){setForm(p=>({...p,[key]:value}));}
  async function preparePhotoForUpload(file: File): Promise<File> {
    // Vercel serverless requests have a smaller payload ceiling than the media API's
    // 10 MB file limit. Keep the multipart request below that ceiling by optimizing
    // large photos in the browser before sending them to the upload route.
    if (file.size <= 3 * 1024 * 1024) return file;
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Your browser could not process this photo. Try a smaller image.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.82, 0.72, 0.62, 0.52]) {
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", quality));
        if (blob && blob.size <= 3 * 1024 * 1024) {
          const baseName = file.name.replace(/\.[^.]+$/, "") || "animal-photo";
          return new File([blob], baseName + ".webp", { type: "image/webp", lastModified: Date.now() });
        }
      }
      throw new Error("This photo could not be reduced enough for upload. Please choose a smaller photo.");
    } finally {
      bitmap.close();
    }
  }

  async function uploadAnimalPhoto(file: File | undefined) {
    if (!file) return;
    setPhotoError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setPhotoError("Choose a JPG, PNG or WebP image."); return; }
    if (file.size > 10 * 1024 * 1024) { setPhotoError("Photo must be 10 MB or smaller."); return; }
    setUploadingPhoto(true);
    try {
      const uploadFile = await preparePhotoForUpload(file);
      const body = new FormData();
      body.append("file", uploadFile);
      body.append("originalName", uploadFile.name);
      body.append("mimeType", uploadFile.type);
      body.append("purpose", "animal_photo");
      const result = await api.request<{ publicUrl?: string; cdnUrl?: string }>("/media/upload", {
        method: "POST",
        body,
      });
      const photoUrl = result.publicUrl || result.cdnUrl;
      if (!photoUrl) throw new Error("The upload succeeded but no photo URL was returned. Please try again.");
      set("photoUrl", photoUrl);
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "Photo upload failed. Please try again.");
    } finally { setUploadingPhoto(false); }
  }
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");setSuccess("");try{await api.request("/rehome",{method:"POST",body:JSON.stringify({...form,ageMonths:form.ageMonths?Number(form.ageMonths):undefined,latitude:Number(form.latitude),longitude:Number(form.longitude),ownershipConfirmed:form.animalType==="own_pet"&&form.ownershipConfirmed,helperAcknowledged:form.animalType==="community_animal"&&form.helperAcknowledged})});setSuccess("Submitted. The Finding Astro team will review the details before anything appears in the Adoption Centre.");setForm(p=>({...p,animalName:"",breed:"",ageMonths:"",description:"",rehomeReason:"",photoUrl:"",ownershipConfirmed:false,helperAcknowledged:false}));await load();}catch(e){setError(e instanceof Error?e.message:"Submission failed");}finally{setBusy(false);}}
  if(!user)return <div className="max-w-3xl mx-auto space-y-4"><h1 className="text-2xl font-bold">Rehome an Animal</h1><Card className="p-5">Please <Link className="text-primary underline" href="/login">sign in</Link> to submit and track a rehoming request.</Card></div>;
  if(loading)return <PageSpinner/>;
  return <div className="max-w-4xl mx-auto space-y-6">
    <div><h1 className="text-2xl font-bold flex items-center gap-2"><Heart className="w-6 h-6 text-secondary"/> Rehome an Animal</h1><p className="text-sm text-on-surface-variant mt-2">Submit details for a responsible review. Your phone number and exact coordinates are kept private and are not shown on the public adoption listing.</p>{["admin","govt"].includes(user.role)&&<p className="text-sm mt-2"><Link href="/rehome/review" className="text-primary underline underline-offset-4">Open moderation queue</Link></p>}</div>
    <Card className="p-5"><div className="flex gap-3"><ShieldCheck className="w-6 h-6 text-primary shrink-0"/><p className="text-sm">Every request is reviewed before publication. If you are helping a stray or community animal, this is a report for assessment—not a claim of ownership or permission to remove the animal from its territory.</p></div></Card>
    {error&&<p role="alert" className="text-sm text-error">{error}</p>}{success&&<p role="status" className="text-sm text-primary">{success}</p>}
    <Card className="p-5"><form onSubmit={submit} className="space-y-4">
      <div><Label>Which situation applies?</Label><Select value={form.animalType} onChange={e=>set("animalType",e.target.value)}><option value="own_pet">My pet / animal I am authorised to rehome</option><option value="community_animal">A stray or community animal I am helping</option></Select></div>
      <div className="grid sm:grid-cols-2 gap-4"><div><Label>Species</Label><Select value={form.species} onChange={e=>set("species",e.target.value)}><option value="dog">Dog</option><option value="cat">Cat</option><option value="bird">Bird</option><option value="other">Other</option></Select></div><div><Label>Name (optional)</Label><Input value={form.animalName} onChange={e=>set("animalName",e.target.value)} maxLength={100}/></div><div><Label>Breed (optional)</Label><Input value={form.breed} onChange={e=>set("breed",e.target.value)} maxLength={100}/></div><div><Label>Age in months (optional)</Label><Input type="number" min="0" value={form.ageMonths} onChange={e=>set("ageMonths",e.target.value)}/></div><div><Label>Gender (optional)</Label><Select value={form.gender} onChange={e=>set("gender",e.target.value)}><option value="">Unknown</option><option value="male">Male</option><option value="female">Female</option><option value="unknown">Unknown</option></Select></div></div>
      <div className="space-y-2 sm:col-span-2"><Label>Animal photo (optional)</Label><p className="text-xs text-on-surface-variant">Upload a clear photo so the review team and potential adopters can identify the animal. JPG, PNG or WebP; up to 10 MB. Large photos are optimized before upload.</p>{form.photoUrl ? <div className="flex items-start gap-3 rounded-lg border border-outline-variant p-3"><Photo src={form.photoUrl} alt="Uploaded animal" className="h-28 w-28 rounded-md object-cover" /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-primary">Photo uploaded</p><p className="text-xs text-on-surface-variant">This photo will be included with the request and, if approved, the adoption listing.</p><Button type="button" variant="ghost" size="sm" className="mt-2" onClick={()=>{set("photoUrl","");setPhotoError("");}}><X className="h-4 w-4"/> Remove photo</Button></div></div> : <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-outline-variant bg-surface-container-low px-4 py-5 text-sm font-semibold hover:bg-surface-container-high"><ImagePlus className="h-5 w-5"/>{uploadingPhoto ? "Uploading photo…" : "Choose animal photo"}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploadingPhoto} onChange={e=>{const file=e.currentTarget.files?.[0];void uploadAnimalPhoto(file);e.currentTarget.value="";}} /></label>}{photoError&&<p role="alert" className="text-sm text-error">{photoError}</p>}</div>
      <div><Label>Animal description and care needs</Label><Textarea required minLength={10} maxLength={2000} rows={3} value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Temperament, health, vaccination, special needs…"/></div>
      <div><Label>Why does the animal need rehoming / assessment?</Label><Textarea required minLength={10} maxLength={2000} rows={3} value={form.rehomeReason} onChange={e=>set("rehomeReason",e.target.value)}/></div>
      <div><Label>Area / locality (not shown with your contact details)</Label><Input required value={form.locationText} onChange={e=>set("locationText",e.target.value)} placeholder="Neighbourhood, city"/></div>
      <div className="grid sm:grid-cols-2 gap-4"><div><Label>Latitude</Label><Input required type="number" step="any" value={form.latitude} onChange={e=>set("latitude",e.target.value)}/></div><div><Label>Longitude</Label><Input required type="number" step="any" value={form.longitude} onChange={e=>set("longitude",e.target.value)}/></div></div>
      <div className="grid sm:grid-cols-2 gap-4"><div><Label>Your name</Label><Input required value={form.contactName} onChange={e=>set("contactName",e.target.value)} maxLength={100}/></div><div><Label>Private contact phone</Label><Input required type="tel" value={form.contactPhone} onChange={e=>set("contactPhone",e.target.value)} maxLength={20}/></div></div>
      {form.animalType==="own_pet"?<label className="flex items-start gap-2 text-sm"><input type="checkbox" required checked={form.ownershipConfirmed} onChange={e=>set("ownershipConfirmed",e.target.checked)} className="mt-1"/>I confirm I am the owner or legally authorised caretaker and have authority to seek rehoming.</label>:<label className="flex items-start gap-2 text-sm"><input type="checkbox" required checked={form.helperAcknowledged} onChange={e=>set("helperAcknowledged",e.target.checked)} className="mt-1"/>I am reporting a community animal for review, do not claim ownership, and understand Finding Astro must assess whether adoption is appropriate.</label>}
      <Button type="submit" disabled={busy||uploadingPhoto}>{busy?"Submitting…":uploadingPhoto?"Uploading photo…":"Submit for review"}</Button>
    </form></Card>
    <section className="space-y-3"><h2 className="text-xl font-bold flex items-center gap-2"><ClipboardList className="w-5 h-5"/> My requests</h2>{!rows.length?<EmptyState title="No rehoming requests yet." description="Your submissions and review updates will appear here."/>:rows.map(r=><Card key={r.id} className="p-4 space-y-2"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold">{r.animal_name||"Unnamed"} · {r.species}</h3><span className="text-xs rounded-full bg-surface-container-high px-3 py-1">{statusLabels[r.status]||r.status}</span></div><p className="text-xs text-on-surface-variant">Submitted {new Date(r.created_at).toLocaleDateString()} · {r.animal_type==="own_pet"?"Owner rehoming":"Community animal report"}</p>{r.review_notes&&<p className="text-sm">Review note: {r.review_notes}</p>}{r.linked_animal_id&&<Link className="text-sm text-primary underline" href={"/animals/"+r.linked_animal_id}>View published animal profile</Link>}</Card>)}</section>
  </div>;
}
