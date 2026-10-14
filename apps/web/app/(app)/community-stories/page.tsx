"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Bookmark, Share2, PawPrint, ImagePlus, Send, LoaderCircle, Sparkles, Flag } from "lucide-react";

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


 return (
  <main className="min-h-screen bg-[#fbf7f1] text-[#30322d]">
   <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
    <div className="mb-5 flex items-center justify-between gap-3">
     <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[#66685f] transition hover:text-[#b75e43]"><PawPrint size={17} className="text-[#b75e43]"/> Finding Astro <span className="text-[#b8b0a5]">/</span> Community</Link>
     <Link href="/community-stories/saved" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#e6ddd1] bg-white/80 px-4 py-2 text-sm font-semibold transition hover:border-[#c87b60] hover:bg-white"><Bookmark size={15}/> Saved memories</Link>
    </div>

    <section className="relative isolate overflow-hidden rounded-[2rem] border border-[#eadbca] bg-[#f0e4d5]">
     <div className="pointer-events-none absolute -right-16 -top-20 -z-10 h-72 w-72 rounded-full border-[38px] border-white/25 sm:h-96 sm:w-96 sm:border-[52px]"/>
     <div className="pointer-events-none absolute bottom-[-4rem] left-[38%] -z-10 h-48 w-48 rounded-full bg-[#e3c4a6]/35 blur-2xl"/>
     <div className="grid items-center gap-8 px-5 py-8 sm:px-8 sm:py-10 md:grid-cols-[1.05fr_0.95fr] md:gap-10 md:px-12 md:py-12 lg:px-16 lg:py-14">
      <div className="max-w-2xl">
       <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#ddc4ad] bg-white/55 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#85533e]"><PawPrint size={14}/> Pawprints & Memories</div>
       <h1 className="max-w-xl font-serif text-[2.55rem] font-semibold leading-[1.06] tracking-[-0.04em] text-[#35362f] sm:text-5xl lg:text-6xl">Some little lives leave <span className="italic text-[#ad6248]">the biggest</span> pawprints.</h1>
       <p className="mt-5 max-w-xl text-base leading-7 text-[#666257] sm:text-lg sm:leading-8">Rescue journeys, second chances, everyday kindness, and the companions we carry in our hearts. Every story deserves a place to stay.</p>
       <div className="mt-7 flex flex-col gap-3 min-[420px]:flex-row">
        <button onClick={()=>setComposerOpen(true)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#ad6248] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#934e38] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ad6248]"><PawPrint size={17}/> Share your story</button>
        <a href="#community-stories" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#d9c4b0] bg-white/60 px-6 py-3 text-sm font-bold text-[#514d43] transition hover:bg-white"><Heart size={16}/> Read their stories</a>
       </div>
       <p className="mt-4 text-xs leading-5 text-[#7a7164]">A gentle corner of the Finding Astro community. Made for remembering, celebrating, and showing up for one another.</p>
      </div>
      <div className="relative mx-auto w-full max-w-md md:max-w-none">
       <div className="absolute -left-3 top-8 z-10 hidden rounded-2xl border border-[#eadbc9] bg-white/95 px-4 py-3 shadow-lg sm:block">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#a56a4c]">Remember</p><p className="mt-1 font-serif text-lg text-[#49453d]">the love they left</p>
       </div>
       <div className="relative overflow-hidden rounded-[1.7rem] border-[6px] border-white/70 bg-[#e5d2bd] shadow-[0_24px_60px_-30px_rgba(83,57,36,0.4)]">
        {stories.find(story=>story.media_urls?.[0])?.media_urls?.[0] ? <img src={stories.find(story=>story.media_urls?.[0])!.media_urls[0]} alt="A beloved animal from a community story" className="h-64 w-full object-cover sm:h-80 md:h-[25rem]" /> : <div className="flex h-64 flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_30%,#fff7eb_0%,#e7cfb5_70%)] px-6 text-center sm:h-80 md:h-[25rem]"><div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/80 bg-white/65 text-[#ad6248] shadow-sm"><PawPrint size={58} strokeWidth={1.3}/></div><p className="mt-5 font-serif text-2xl italic text-[#6f5847]">Every life is a story.</p><p className="mt-2 text-sm text-[#786858]">Every kindness leaves something behind.</p></div>}
       </div>
       <div className="absolute -bottom-4 right-2 rounded-2xl border border-[#eadbc9] bg-white px-4 py-3 shadow-lg sm:right-5">
        <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f7e8df] text-[#ad6248]"><Heart size={16} fill="currentColor"/></span><div><p className="text-xs font-bold text-[#514d43]">Love lives on</p><p className="text-[11px] text-[#8b8174]">In every story we share</p></div></div>
       </div>
      </div>
     </div>
    </section>

    <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
     {[{icon:Heart,label:"Rescue & recovery",tone:"bg-[#f8e8df] text-[#a85e43]"},{icon:Sparkles,label:"Second chances",tone:"bg-[#f5edcf] text-[#8d7131]"},{icon:PawPrint,label:"Everyday kindness",tone:"bg-[#e5eee2] text-[#55734f]"},{icon:Heart,label:"Forever memories",tone:"bg-[#e9e6f2] text-[#6d618f]"}].map(item=><div key={item.label} className="flex items-center gap-2.5 rounded-2xl border border-[#ece3d8] bg-white/75 px-3 py-3 sm:gap-3 sm:px-4"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.tone}`}><item.icon size={17}/></span><span className="text-xs font-bold leading-4 text-[#625e54] sm:text-sm">{item.label}</span></div>)}
    </div>

    {notice&&<div role="status" className="mt-6 flex items-start justify-between gap-3 rounded-2xl border border-[#c8dec5] bg-[#eff7ed] p-4 text-sm text-[#355b36]"><span>{notice}</span><button className="shrink-0 font-bold underline" onClick={()=>setNotice("")}>Dismiss</button></div>}
    {error&&<div role="alert" className="mt-6 flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>{error}</span><button className="shrink-0 font-bold underline" onClick={()=>setError("")}>Dismiss</button></div>}

    {composerOpen&&<section className="mt-8 overflow-hidden rounded-[1.75rem] border border-[#e9ddd0] bg-white shadow-sm">
     <div className="flex items-start justify-between gap-4 bg-[#f7eee4] px-5 py-5 sm:px-8"><div><p className="text-xs font-extrabold uppercase tracking-[0.15em] text-[#a15c43]">Your story belongs here</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[#39382f] sm:text-3xl">Share a memory</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#71695e]">A small moment can mean everything. Write it in your own words; you can include a photo if you have one.</p></div><button onClick={()=>setComposerOpen(false)} className="rounded-full border border-[#dfcdbb] bg-white px-3 py-2 text-sm font-semibold text-[#66594d] hover:bg-[#fffaf4]">Close</button></div>
     <form onSubmit={submitStory} className="grid gap-4 p-5 sm:grid-cols-2 sm:p-8">
      <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">Give your story a title<input required minLength={3} maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} placeholder="The day Chutney chose us…" className="min-h-12 w-full rounded-xl border border-[#e5dacf] bg-[#fffdfa] px-4 font-normal outline-none transition focus:border-[#bc8067] focus:ring-2 focus:ring-[#bc8067]/20"/></label>
      <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">Tell us what happened<textarea required minLength={20} maxLength={12000} rows={6} value={body} onChange={e=>setBody(e.target.value)} placeholder="A little detail, a favorite habit, a rescue that changed everything… What would you want others to remember?" className="w-full rounded-xl border border-[#e5dacf] bg-[#fffdfa] px-4 py-3 font-normal leading-6 outline-none transition focus:border-[#bc8067] focus:ring-2 focus:ring-[#bc8067]/20"/></label>
      <label className="grid gap-1.5 text-sm font-bold">Story type<select value={storyCategory} onChange={e=>setStoryCategory(e.target.value)} className="min-h-12 rounded-xl border border-[#e5dacf] bg-[#fffdfa] px-3 font-normal">{CATEGORIES.filter(c=>c.value!=="all").map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
      <label className="grid gap-1.5 text-sm font-bold">Animal's name <span className="font-normal text-[#8b8174]">(optional)</span><input maxLength={100} value={animalName} onChange={e=>setAnimalName(e.target.value)} placeholder="e.g. Chutney" className="min-h-12 rounded-xl border border-[#e5dacf] bg-[#fffdfa] px-3 font-normal"/></label>
      <label className="grid gap-1.5 text-sm font-bold">Animal <span className="font-normal text-[#8b8174]">(optional)</span><select value={animalSpecies} onChange={e=>setAnimalSpecies(e.target.value)} className="min-h-12 rounded-xl border border-[#e5dacf] bg-[#fffdfa] px-3 font-normal"><option value="">Not specified</option><option value="dog">Dog</option><option value="cat">Cat</option><option value="wildlife">Wildlife</option><option value="other">Other</option></select></label>
      <label className="grid gap-1.5 text-sm font-bold">Broad location <span className="font-normal text-[#8b8174]">(optional)</span><input maxLength={120} value={location} onChange={e=>setLocation(e.target.value)} placeholder="e.g. Adyar, Chennai" className="min-h-12 rounded-xl border border-[#e5dacf] bg-[#fffdfa] px-3 font-normal"/></label>
      <label className="grid gap-2 text-sm font-bold sm:col-span-2"><span className="inline-flex items-center gap-2"><ImagePlus size={17} className="text-[#ad6248]"/> Add photos <span className="font-normal text-[#8b8174]">(up to 6)</span></span><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple onChange={e=>setFiles(Array.from(e.target.files||[]).slice(0,6))} className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-[#f5e8df] file:px-4 file:py-2.5 file:font-bold file:text-[#9e563d]"/><span className="text-xs font-normal leading-5 text-[#81776a]">Only share photos you have permission to publish. Avoid exact locations or identifying details that could put people or animals at risk.</span>{files.length>0&&<span className="text-xs font-semibold text-[#6b665b]">{files.length} photo(s) selected · {(files.reduce((sum,f)=>sum+f.size,0)/1024/1024).toFixed(1)} MB total</span>}</label>
      <div className="flex flex-col justify-between gap-3 border-t border-[#eee5dc] pt-4 sm:col-span-2 sm:flex-row sm:items-center"><p className="max-w-xl text-xs leading-5 text-[#81776a]">Your story will be published immediately. By publishing, you confirm you have permission to share its words and media.</p><button disabled={posting} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#ad6248] px-6 py-3 font-bold text-white transition hover:bg-[#934e38] disabled:opacity-60">{posting?<><LoaderCircle size={17} className="animate-spin"/> Publishing…</>:<><Send size={16}/> Publish story</>}</button></div>
     </form>
    </section>}

    <section id="community-stories" className="mt-12 scroll-mt-6 sm:mt-16">
     <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#a15c43]">From the heart of our community</p><h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-[#38382f] sm:text-4xl">Stories to hold onto.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#777064] sm:text-base">Meet the animals behind the moments. Stay for the kindness. Leave with a little more hope.</p></div>
      <button onClick={()=>setComposerOpen(v=>!v)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-full border border-[#dfcfc0] bg-white px-4 py-2.5 text-sm font-bold text-[#8f5039] transition hover:bg-[#fff8f0] sm:self-auto"><Sparkles size={16}/> Add your memory</button>
     </div>

     <div className="mt-6 flex gap-2 overflow-x-auto pb-2" aria-label="Filter stories">{CATEGORIES.map(c=><button key={c.value} onClick={()=>setCategory(c.value)} aria-pressed={category===c.value} className={`shrink-0 rounded-full border px-4 py-2.5 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ad6248] ${category===c.value?"border-[#ad6248] bg-[#ad6248] text-white shadow-sm":"border-[#e5dacf] bg-white text-[#6c655b] hover:border-[#cba48d] hover:bg-[#fffaf4]"}`}>{c.label}</button>)}</div>
     <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[#81776a]"><span>{loading?"Gathering stories…":`${stories.length} ${stories.length===1?"story":"stories"} in this collection`}</span><span className="hidden sm:inline">Take a moment. Read a story. Pass the kindness on.</span></div>

     {loading?<div className="flex items-center justify-center gap-3 rounded-3xl border border-[#ece3d8] bg-white py-20 text-sm text-[#81776a]"><LoaderCircle className="animate-spin text-[#ad6248]"/> Gathering a little kindness…</div>:stories.length===0?<div className="mt-5 rounded-[1.75rem] border border-dashed border-[#dfcfc0] bg-white px-5 py-14 text-center sm:px-10"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f8e8df] text-[#ad6248]"><PawPrint size={30}/></div><h3 className="mt-5 font-serif text-2xl font-semibold text-[#3b3a32]">Every collection starts with one story.</h3><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#777064]">There aren't any stories in this collection just yet. If a moment with an animal has stayed with you, this is a lovely place to share it.</p><button onClick={()=>setComposerOpen(true)} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#ad6248] px-5 py-3 text-sm font-bold text-white hover:bg-[#934e38]"><PawPrint size={16}/> Share the first story</button></div>:
      <div className="mt-5 grid gap-4 sm:gap-5 md:grid-cols-2">
       {stories.map((story,index)=>{const featured=index===0;return <article key={story.id} className={`group min-w-0 overflow-hidden rounded-[1.65rem] border border-[#ece3d8] bg-white shadow-[0_8px_30px_-24px_rgba(60,45,30,0.35)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_-28px_rgba(60,45,30,0.4)] ${featured?"md:col-span-2 md:grid md:grid-cols-[1.05fr_0.95fr]":""}`}>
        <div className={`relative overflow-hidden bg-[#f0e4d5] ${featured?"min-h-64 sm:min-h-80":"h-56 sm:h-60"}`}>
         {story.media_urls?.[0]?<img src={story.media_urls[0]} alt={`Photo for ${story.title}`} loading="lazy" className="h-full min-h-56 w-full object-cover transition duration-700 group-hover:scale-[1.025]"/>:<div className="flex h-full min-h-56 flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_35%,#fff9f0_0%,#ead8c4_75%)] px-6 text-center"><span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/80 bg-white/70 text-[#ad6248]"><PawPrint size={30} strokeWidth={1.4}/></span><p className="mt-3 font-serif text-xl italic text-[#795e4b]">A life worth remembering</p></div>}
         <div className="absolute left-4 top-4 flex flex-wrap gap-2"><span className="rounded-full border border-white/60 bg-white/95 px-3 py-1.5 text-[11px] font-extrabold text-[#92533d] shadow-sm">{CATEGORY_LABELS[story.category]||"Community story"}</span>{story.is_featured&&<span className="inline-flex items-center gap-1 rounded-full bg-[#fff0cb] px-3 py-1.5 text-[11px] font-extrabold text-[#815d20] shadow-sm"><Sparkles size={12}/> Community highlight</span>}</div>
        </div>
        <div className={`flex min-w-0 flex-col p-5 sm:p-6 ${featured?"md:justify-center md:p-8 lg:p-10":""}`}>
         <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#9a8c7b]"><span>{dateLabel(story.published_at)}</span>{story.broad_location&&<><span>·</span><span className="truncate normal-case tracking-normal">{story.broad_location}</span></>}</div>
         <h3 className={`mt-3 font-serif font-semibold leading-tight tracking-[-0.02em] text-[#38382f] ${featured?"text-2xl sm:text-3xl lg:text-4xl":"text-xl sm:text-2xl"}`}>{story.title}</h3>
         <p className={`mt-3 whitespace-pre-line text-sm leading-6 text-[#716b60] ${featured?"sm:text-base sm:leading-7":""}`}>{story.body.length>(featured?440:220)?story.body.slice(0,featured?440:220)+"…":story.body}</p>
         {(story.animal_name||story.animal_species)&&<p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#987258]"><PawPrint size={14}/>{[story.animal_name,story.animal_species].filter(Boolean).join(" · ")}</p>}
         <div className="mt-5 flex items-center gap-3 border-t border-[#f0e8df] pt-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f4e6db] font-serif text-sm font-bold text-[#98583f]">{(story.author_name||"A").trim().charAt(0).toUpperCase()}</span><div className="min-w-0 flex-1"><Link href={`/community-stories/people/${story.author_id}`} className="block truncate text-sm font-bold text-[#514b41] hover:text-[#ad6248] hover:underline">{story.author_name||"Community member"}</Link><p className="text-[11px] text-[#9a8f82]">Shared with the community</p></div></div>
         <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">{REACTIONS.map(r=><button key={r.value} disabled={busyStory===story.id} onClick={()=>void reactTo(story.id,r.value)} aria-label={r.label} aria-pressed={reactions[story.id]===r.value} className={`flex h-9 min-w-9 items-center justify-center rounded-full border px-2.5 text-sm transition disabled:opacity-50 ${reactions[story.id]===r.value?"border-[#d7a28c] bg-[#f9e8df]":"border-[#eee5dc] bg-[#fffdfa] hover:border-[#d7a28c] hover:bg-[#fff5ee]"}`} title={r.label}>{r.emoji}</button>)}</div>
          <span className="text-[11px] text-[#958a7d]">{story.reaction_count} {story.reaction_count===1?"kind response":"kind responses"}</span>
          <button onClick={()=>void toggleComments(story.id)} className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-[#777064] transition hover:bg-[#f7eee4]"><MessageCircle size={15}/>{story.comment_count}</button>
          <button onClick={()=>void toggleBookmark(story.id)} aria-label={bookmarks[story.id]?"Remove saved story":"Save story"} aria-pressed={!!bookmarks[story.id]} className={`flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-[#f7eee4] ${bookmarks[story.id]?"text-[#ad6248]":"text-[#898073]"}`}><Bookmark size={16} fill={bookmarks[story.id]?"currentColor":"none"}/></button>
          <button onClick={()=>void shareStory(story)} aria-label="Share story" className="flex h-9 w-9 items-center justify-center rounded-full text-[#898073] transition hover:bg-[#f7eee4] hover:text-[#ad6248]"><Share2 size={16}/></button>
          <button onClick={()=>void reportStory(story.id)} aria-label="Report story" className="flex h-9 w-9 items-center justify-center rounded-full text-[#aaa094] transition hover:bg-red-50 hover:text-red-700"><Flag size={15}/></button>
         </div>
         {commentsOpen[story.id]&&<div className="mt-4 border-t border-[#f0e8df] pt-4">
          <div className="grid gap-3">{(comments[story.id]||[]).map((c:any)=><div key={c.id} className="rounded-xl bg-[#faf5ef] p-3"><p className="text-xs font-bold text-[#514b41]">{c.author_name||"Community member"} <span className="font-normal text-[#958a7d]">· {dateLabel(c.created_at)}</span></p><p className="mt-1 whitespace-pre-line text-sm leading-5 text-[#5f594f]">{c.body}</p></div>)}{comments[story.id]?.length===0&&<p className="text-xs text-[#958a7d]">Be the first to leave a kind word.</p>}</div>
          <div className="mt-3 flex gap-2"><input value={commentInputs[story.id]||""} maxLength={2000} onChange={e=>setCommentInputs(p=>({...p,[story.id]:e.target.value}))} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void sendComment(story.id);}}} placeholder="Leave a supportive comment…" className="min-h-11 min-w-0 flex-1 rounded-full border border-[#e5dacf] bg-white px-4 py-2 text-sm outline-none focus:border-[#bc8067] focus:ring-2 focus:ring-[#bc8067]/20"/><button disabled={!commentInputs[story.id]?.trim()||busyStory===story.id} onClick={()=>void sendComment(story.id)} aria-label="Post comment" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ad6248] text-white disabled:opacity-50"><Send size={15}/></button></div>
         </div>}
        </div>
       </article>})}
      </div>}
    </section>
    <footer className="mt-12 border-t border-[#e8ddd1] py-6 text-center"><div className="inline-flex items-center gap-2 text-sm font-semibold text-[#9b634c]"><Heart size={15} fill="currentColor"/> Every animal matters. Every story can help.</div><p className="mx-auto mt-2 max-w-2xl text-xs leading-5 text-[#898073]">Please respect privacy, get permission before sharing others' photos, and report content that may put people or animals at risk.</p></footer>
   </div>
  </main>
 );
}
