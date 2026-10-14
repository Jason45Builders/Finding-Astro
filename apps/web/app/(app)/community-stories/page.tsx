"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Bookmark, Share2, PawPrint, ImagePlus, Send, LoaderCircle, Sparkles, Flag, ChevronDown, ChevronUp } from "lucide-react";
import { Photo } from "@/components/ui/Photo";

type Story = {
  id:string; author_id:string; author_name:string; title:string; body:string; category:string;
  animal_name?:string|null; animal_species?:string|null; broad_location?:string|null;
  media_urls:string[]; is_featured:boolean; published_at:string; reaction_count:number; comment_count:number;
};
const CATEGORIES = [
  {value:"all",label:"All stories"},{value:"rescue",label:"Rescue stories"},{value:"adoption",label:"Adoption journeys"},
  {value:"everyday_kindness",label:"Everyday kindness"},{value:"happy_memory",label:"Happy memories"},
  {value:"community_impact",label:"Community impact"},{value:"other",label:"Other stories"},
];
const CATEGORY_LABELS:Record<string,string> = Object.fromEntries(CATEGORIES.map(c=>[c.value,c.label]));
const REACTIONS=[{value:"heart",label:"Love",emoji:"❤️"},{value:"inspiring",label:"Inspiring",emoji:"✨"},{value:"pawprint",label:"Paws",emoji:"🐾"},{value:"thank_you",label:"Thank you",emoji:"🙏"}];

function token(){if(typeof window==="undefined")return "";return localStorage.getItem("fa_token")||localStorage.getItem("token")||"";}
async function api(path:string, init:RequestInit={}) {
 const t=token();
 const headers=new Headers(init.headers);
 if(t)headers.set("Authorization",`Bearer ${t}`);
 headers.set("X-Requested-With","Finding-Astro-App");
 if(init.body && !(init.body instanceof FormData))headers.set("Content-Type","application/json");
 const res=await fetch(path,{...init,headers});
 const payload=await res.json().catch(()=>({message:"The server returned an unreadable response"}));
 if(!res.ok||payload.success===false)throw new Error(payload.message||"Request failed");
 return payload.data;
}
function dateLabel(value:string){return new Date(value).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"});}

export default function PawprintsMemoriesPage(){
 const [stories,setStories]=useState<Story[]>([]);
 const [expandedStories,setExpandedStories]=useState<Record<string,boolean>>({});
 const [category,setCategory]=useState("all");
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [composerOpen,setComposerOpen]=useState(false);
 const [posting,setPosting]=useState(false);
 const [title,setTitle]=useState("");
 const [body,setBody]=useState("");
 const [storyCategory,setStoryCategory]=useState("everyday_kindness");
 const [animalName,setAnimalName]=useState("");
 const [animalSpecies,setAnimalSpecies]=useState("");
 const [location,setLocation]=useState("");
 const [files,setFiles]=useState<File[]>([]);
 const [busyStory,setBusyStory]=useState("");
 const [commentInputs,setCommentInputs]=useState<Record<string,string>>({});
 const [commentsOpen,setCommentsOpen]=useState<Record<string,boolean>>({});
 const [comments,setComments]=useState<Record<string,any[]>>({});
 const [bookmarks,setBookmarks]=useState<Record<string,boolean>>({});
 const [reactions,setReactions]=useState<Record<string,string>>({});

 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{const qs=new URLSearchParams({limit:"20",offset:"0"});if(category!=="all")qs.set("category",category);
   const data=await api(`/api/v1/community-stories?${qs.toString()}`);setStories(Array.isArray(data)?data:[]);
  }catch(e){setError(e instanceof Error?e.message:"Unable to load stories");}
  finally{setLoading(false);}
 },[category]);
 useEffect(()=>{void load();},[load]);

 async function submitStory(e:FormEvent){
  e.preventDefault();setPosting(true);setError("");setNotice("");
  try{
   const mediaUrls:string[]=[];
   for(const file of files){
    const form=new FormData();form.set("file",file);form.set("originalName",file.name);form.set("mimeType",file.type);form.set("purpose","community_story");
    const uploaded=await api("/api/v1/media/upload",{method:"POST",body:form});
    mediaUrls.push(uploaded.publicUrl||uploaded.cdnUrl||uploaded.uploadUrl);
   }
   await api("/api/v1/community-stories",{method:"POST",body:JSON.stringify({
    title,body,category:storyCategory,animalName:animalName||null,animalSpecies:animalSpecies||null,
    broadLocation:location||null,mediaUrls
   })});
   setTitle("");setBody("");setAnimalName("");setAnimalSpecies("");setLocation("");setFiles([]);setComposerOpen(false);
   setNotice("Your story is published. Thank you for sharing a little kindness.");await load();
  }catch(e){setError(e instanceof Error?e.message:"Unable to publish your story");}
  finally{setPosting(false);}
 }
 async function reactTo(storyId:string,reaction:string){
  setBusyStory(storyId);setError("");
  try{await api(`/api/v1/community-stories/${storyId}/interactions`,{method:"POST",body:JSON.stringify({action:reactions[storyId]===reaction?"unreact":"react",reaction})});setReactions(p=>({...p,[storyId]:p[storyId]===reaction?"":reaction}));await load();}
  catch(e){setError(e instanceof Error?e.message:"Unable to save reaction");}finally{setBusyStory("");}
 }
 async function toggleBookmark(storyId:string){
  setBusyStory(storyId);setError("");
  try{const next=!bookmarks[storyId];await api(`/api/v1/community-stories/${storyId}/interactions`,{method:"POST",body:JSON.stringify({action:next?"bookmark":"unbookmark"})});setBookmarks(p=>({...p,[storyId]:next}));}
  catch(e){setError(e instanceof Error?e.message:"Unable to save bookmark");}finally{setBusyStory("");}
 }
 async function toggleComments(storyId:string){
  const next=!commentsOpen[storyId];setCommentsOpen(p=>({...p,[storyId]:next}));
  if(next&&!comments[storyId]){try{const data=await api(`/api/v1/community-stories/${storyId}/comments`);setComments(p=>({...p,[storyId]:data||[]}));}catch(e){setError(e instanceof Error?e.message:"Unable to load comments");}}
 }
 async function sendComment(storyId:string){
  const text=commentInputs[storyId]?.trim();if(!text)return;setBusyStory(storyId);setError("");
  try{const data=await api(`/api/v1/community-stories/${storyId}/interactions`,{method:"POST",body:JSON.stringify({action:"comment",body:text})});setComments(p=>({...p,[storyId]:[...(p[storyId]||[]),data]}));setCommentInputs(p=>({...p,[storyId]:""}));await load();}
  catch(e){setError(e instanceof Error?e.message:"Unable to post comment");}finally{setBusyStory("");}
 }
 async function reportStory(storyId:string){
  const reason=window.prompt("Why are you reporting this story? Enter: harassment, privacy, animal_welfare, spam, misinformation, or other");
  if(!reason)return;const normalized=reason.trim().toLowerCase();
  if(!["harassment","privacy","animal_welfare","spam","misinformation","other"].includes(normalized)){setError("Please enter one of the listed report reasons.");return;}
  try{await api(`/api/v1/community-stories/${storyId}/interactions`,{method:"POST",body:JSON.stringify({action:"report",reason:normalized})});setNotice("Thanks. Your report has been sent for review.");}
  catch(e){setError(e instanceof Error?e.message:"Unable to submit report");}
 }
 async function shareStory(story:Story){
  const url=`${window.location.origin}/community-stories/${story.id}`;
  try{if(navigator.share)await navigator.share({title:story.title,text:story.body.slice(0,160),url});else{await navigator.clipboard.writeText(url);setNotice("Story link copied.");}}
  catch{/* Share sheet was dismissed. */}
 }

 return <div className="space-y-3 text-sm text-on-surface sm:space-y-4">
  <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6 md:px-8 md:py-10">
   <section className="relative overflow-hidden rounded-2xl bg-primary px-4 py-5 text-white sm:rounded-3xl sm:px-7 sm:py-8 md:px-10 md:py-10">
    <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full border-[22px] sm:-right-12 sm:-top-20 sm:h-64 sm:w-64 sm:border-[32px] border-white/10"/>
    <div className="relative max-w-3xl">
     <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] sm:mb-3 sm:gap-2 sm:px-3 sm:text-xs font-semibold"><PawPrint size={12}/> PAWPRINTS & MEMORIES</div>
     <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl md:text-5xl">Every act of kindness leaves a pawprint.</h1>
     <p className="mt-2 max-w-2xl text-sm leading-6 text-white/85 sm:mt-4 sm:text-base sm:leading-7 md:text-lg">A place for rescue journeys, adoption milestones, small acts of kindness, and the animal memories you want to keep and share.</p>
     <button onClick={()=>setComposerOpen(true)} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold sm:mt-6 sm:min-h-11 sm:px-5 sm:py-3 sm:text-base text-primary hover:bg-white/90"><PawPrint size={15}/> Tell your story</button>
    </div>
   </section>
   <div className="mt-4 flex flex-wrap items-center justify-between gap-2 sm:mt-6 sm:gap-3">
    <p className="text-sm text-on-surface-variant">Stories of rescue, adoption, and everyday kindness.</p>
    <div className="flex items-center gap-2">
     <Link href="/community-stories/saved" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-outline-variant px-4 py-2 text-sm font-semibold hover:bg-surface-container"><Bookmark size={16}/> Saved stories</Link>
     <button onClick={()=>setComposerOpen(v=>!v)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-bold sm:min-h-10 sm:gap-2 sm:px-4 sm:text-sm text-white hover:opacity-90"><Sparkles size={16}/> Share a story</button>
    </div>
   </div>

   {notice&&<div role="status" className="mt-5 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}<button className="ml-3 font-bold underline" onClick={()=>setNotice("")}>Dismiss</button></div>}
   {error&&<div role="alert" className="mt-5 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900">{error}<button className="ml-3 font-bold underline" onClick={()=>setError("")}>Dismiss</button></div>}

   {composerOpen&&<section className="mt-6 rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm md:p-7">
    <div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold">Share a memory</h2><p className="mt-1 text-sm text-on-surface-variant">Your story will be published immediately. Please share only content and photos you have permission to publish.</p></div><button onClick={()=>setComposerOpen(false)} className="rounded-lg px-3 py-2 text-sm hover:bg-surface-container">Close</button></div>
    <form onSubmit={submitStory} className="grid gap-3 sm:gap-4 md:grid-cols-2">
     <label className="grid gap-1.5 text-sm font-semibold md:col-span-2">Story title<input required minLength={3} maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} placeholder="The day we found Chutney..." className="min-h-11 rounded-xl border border-outline-variant bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-primary"/></label>
     <label className="grid gap-1.5 text-sm font-semibold md:col-span-2">Your story<textarea required minLength={20} maxLength={12000} rows={6} value={body} onChange={e=>setBody(e.target.value)} placeholder="What happened? Why does this moment stay with you?" className="rounded-xl border border-outline-variant bg-background px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-primary"/></label>
     <label className="grid gap-1.5 text-sm font-semibold">Category<select value={storyCategory} onChange={e=>setStoryCategory(e.target.value)} className="min-h-11 rounded-xl border border-outline-variant bg-background px-3 font-normal">{CATEGORIES.filter(c=>c.value!=="all").map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
     <label className="grid gap-1.5 text-sm font-semibold">Animal&apos;s name (optional)<input maxLength={100} value={animalName} onChange={e=>setAnimalName(e.target.value)} placeholder="e.g. Chutney" className="min-h-11 rounded-xl border border-outline-variant bg-background px-3 font-normal"/></label>
     <label className="grid gap-1.5 text-sm font-semibold">Animal (optional)<select value={animalSpecies} onChange={e=>setAnimalSpecies(e.target.value)} className="min-h-11 rounded-xl border border-outline-variant bg-background px-3 font-normal"><option value="">Not specified</option><option value="dog">Dog</option><option value="cat">Cat</option><option value="wildlife">Wildlife</option><option value="other">Other</option></select></label>
     <label className="grid gap-1.5 text-sm font-semibold">Broad location (optional)<input maxLength={120} value={location} onChange={e=>setLocation(e.target.value)} placeholder="e.g. Adyar, Chennai" className="min-h-11 rounded-xl border border-outline-variant bg-background px-3 font-normal"/></label>
     <label className="grid gap-2 text-sm font-semibold md:col-span-2"><span className="inline-flex items-center gap-2"><ImagePlus size={17}/> Photos (up to 6)</span><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple onChange={e=>setFiles(Array.from(e.target.files||[]).slice(0,6))} className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:font-semibold file:text-primary"/><span className="text-xs font-normal text-on-surface-variant">Images are scanned and metadata is cleaned by the existing upload pipeline. Keep identifying details and exact locations private.</span>{files.length>0&&<span className="text-xs font-normal">{files.length} photo(s) selected · {(files.reduce((sum,f)=>sum+f.size,0)/1024/1024).toFixed(1)} MB total</span>}</label>
     <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2"><p className="max-w-xl text-xs leading-5 text-on-surface-variant">By publishing, you confirm you have permission to share this story and its media. Public stories may be viewed and shared by others.</p><button disabled={posting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-white disabled:opacity-60">{posting?<><LoaderCircle size={17} className="animate-spin"/> Publishing…</>:<><Send size={17}/> Publish story</>}</button></div>
    </form>
   </section>}

   <div className="mt-5 flex gap-1.5 overflow-x-auto pb-2 sm:mt-8 sm:gap-2" aria-label="Filter stories">{CATEGORIES.map(c=><button key={c.value} onClick={()=>setCategory(c.value)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition sm:px-4 sm:py-2 sm:text-sm ${category===c.value?"border-primary bg-primary text-white":"border-outline-variant bg-surface hover:bg-surface-container"}`}>{c.label}</button>)}</div>
   <div className="mt-4 flex items-end justify-between gap-2 sm:mt-6 sm:gap-3"><div><h2 className="text-xl font-extrabold sm:text-2xl">Stories from our community</h2><p className="mt-1 text-sm text-on-surface-variant">Real moments. Everyday heroes. Lives changed.</p></div><span className="text-sm text-on-surface-variant">{stories.length} shown</span></div>
   {loading?<div className="flex items-center justify-center gap-2 py-16 text-on-surface-variant"><LoaderCircle className="animate-spin"/> Loading stories…</div>:stories.length===0?<div className="mt-6 rounded-2xl border border-dashed border-outline-variant bg-surface p-10 text-center"><PawPrint size={32} className="mx-auto text-primary"/><h3 className="mt-3 text-lg font-bold">A story starts with you</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-on-surface-variant">No stories in this collection yet. Share a moment that deserves to be remembered.</p><button onClick={()=>setComposerOpen(true)} className="mt-4 rounded-full bg-primary px-5 py-2.5 font-bold text-white">Share the first story</button></div>:
    <div className="mt-3 grid gap-3 sm:mt-6 sm:gap-4 md:grid-cols-2">
     {stories.map(story=><article key={story.id} className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm sm:rounded-2xl">
      {story.media_urls?.[0]&&<Photo src={story.media_urls[0]} alt={`Photo for ${story.title}`} loading="lazy" className="h-40 w-full object-cover sm:h-48 md:h-56" /> }
      <div className="p-3 sm:p-4 md:p-6">
       <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{CATEGORY_LABELS[story.category]||"Community story"}</span>{story.is_featured&&<span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900"><Sparkles size={12}/> Community highlight</span>}</div>
       <button type="button" onClick={()=>setExpandedStories(p=>({...p,[story.id]:!p[story.id]}))} aria-expanded={!!expandedStories[story.id]} className="mt-3 block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"><h3 className="text-base font-extrabold leading-snug sm:text-lg md:text-xl">{story.title}</h3><p className="mt-1.5 whitespace-pre-line break-words text-xs leading-5 text-on-surface-variant sm:mt-2 sm:text-sm sm:leading-6">{expandedStories[story.id]?story.body:(story.body.length>280?story.body.slice(0,280)+"…":story.body)}</p><span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary">{expandedStories[story.id]?"Show less":"Read full story"} {expandedStories[story.id]?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</span></button>
       {(story.animal_name||story.animal_species||story.broad_location)&&<p className="mt-3 text-xs text-on-surface-variant">{[story.animal_name,story.animal_species,story.broad_location].filter(Boolean).join(" · ")}</p>}
       <div className="mt-3 flex items-center justify-between gap-2 border-t border-outline-variant/60 pt-3 text-[11px] sm:mt-4 sm:pt-4 sm:text-xs text-on-surface-variant"><Link href={`/community-stories/people/${story.author_id}`} className="font-semibold hover:text-primary hover:underline">{story.author_name||"Community member"}</Link><span>{dateLabel(story.published_at)}</span></div>
       <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:mt-4 sm:gap-2">
        <div className="flex flex-wrap gap-1">{REACTIONS.map(r=><button key={r.value} disabled={busyStory===story.id} onClick={()=>void reactTo(story.id,r.value)} aria-pressed={reactions[story.id]===r.value} className={`rounded-full border px-2 py-1.5 text-[11px] font-semibold sm:px-2.5 sm:py-2 sm:text-xs ${reactions[story.id]===r.value?"border-primary bg-primary/10":"border-outline-variant hover:bg-surface-container"}`} title={r.label}>{r.emoji}</button>)}</div>
        <span className="text-xs text-on-surface-variant">{story.reaction_count} reactions</span>
        <button onClick={()=>void toggleComments(story.id)} className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-2 text-xs font-semibold hover:bg-surface-container"><MessageCircle size={15}/>{story.comment_count}</button>
        <button onClick={()=>void toggleBookmark(story.id)} aria-label="Save story" className={`rounded-full p-2 hover:bg-surface-container ${bookmarks[story.id]?"text-primary":"text-on-surface-variant"}`}><Bookmark size={16} fill={bookmarks[story.id]?"currentColor":"none"}/></button>
        <button onClick={()=>void shareStory(story)} aria-label="Share story" className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container"><Share2 size={16}/></button>
        <button onClick={()=>void reportStory(story.id)} aria-label="Report story" className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container"><Flag size={15}/></button>
       </div>
       {commentsOpen[story.id]&&<div className="mt-4 border-t border-outline-variant/60 pt-4">
        <div className="grid gap-3">{(comments[story.id]||[]).map((c:any)=><div key={c.id} className="rounded-xl bg-surface-container/60 p-3"><p className="text-xs font-bold">{c.author_name||"Community member"} <span className="font-normal text-on-surface-variant">· {dateLabel(c.created_at)}</span></p><p className="mt-1 whitespace-pre-line text-sm">{c.body}</p></div>)}{comments[story.id]?.length===0&&<p className="text-xs text-on-surface-variant">Be the first to leave a kind word.</p>}</div>
        <div className="mt-3 flex gap-2"><input value={commentInputs[story.id]||""} maxLength={2000} onChange={e=>setCommentInputs(p=>({...p,[story.id]:e.target.value}))} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void sendComment(story.id);}}} placeholder="Leave a supportive comment…" className="min-w-0 flex-1 rounded-full border border-outline-variant bg-background px-4 py-2 text-sm"/><button disabled={!commentInputs[story.id]?.trim()||busyStory===story.id} onClick={()=>void sendComment(story.id)} aria-label="Post comment" className="rounded-full bg-primary p-3 text-white disabled:opacity-50"><Send size={15}/></button></div>
       </div>}
      </div>
     </article>)}
    </div>}
   <p className="mt-7 text-center text-[11px] leading-5 sm:mt-10 sm:text-xs text-on-surface-variant">Pawprints & Memories is a community space. Please respect privacy, obtain permission before sharing others&apos; photos, and report content that may put people or animals at risk.</p>
  </div>
 </div>;
}
