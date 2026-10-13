"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useParams} from "next/navigation";
import {ArrowLeft,Heart,MessageCircle,Bookmark,Share2,Flag,PawPrint,Send,LoaderCircle} from "lucide-react";
type Detail={id:string;title:string;body:string;category:string;author_name:string;author_id:string;published_at:string;animal_name?:string|null;animal_species?:string|null;broad_location?:string|null;media_urls:string[];reactions:{user_id:string;reaction:string}[];comments:{id:string;author_id:string;author_name:string;body:string;created_at:string}[];bookmarked:boolean};
const labels:Record<string,string>={rescue:"Rescue stories",adoption:"Adoption journeys",everyday_kindness:"Everyday kindness",happy_memory:"Happy memories",community_impact:"Community impact",other:"Other stories"};
function token(){return typeof window==="undefined"?"":localStorage.getItem("fa_token")||localStorage.getItem("token")||"";}
async function call(path:string,init:RequestInit={}){const headers=new Headers(init.headers);const t=token();if(t)headers.set("Authorization",`Bearer ${t}`);headers.set("X-Requested-With","Finding-Astro-App");if(init.body)headers.set("Content-Type","application/json");const r=await fetch(path,{...init,headers});const d=await r.json().catch(()=>({message:"Unreadable server response"}));if(!r.ok||d.success===false)throw new Error(d.message||"Request failed");return d.data;}
export default function CommunityStoryDetailPage(){
 const params=useParams<{id:string}>();const id=params.id;
 const [story,setStory]=useState<Detail|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [comment,setComment]=useState("");const [busy,setBusy]=useState(false);
 async function load(){try{setError("");setStory(await call(`/api/v1/community-stories/${id}`));}catch(e){setError(e instanceof Error?e.message:"Unable to load story");}finally{setLoading(false);}}
 useEffect(()=>{if(id)void load();},[id]);
 async function act(payload:Record<string,string>){setBusy(true);try{await call(`/api/v1/community-stories/${id}/interactions`,{method:"POST",body:JSON.stringify(payload)});await load();}catch(e){setError(e instanceof Error?e.message:"Action failed");}finally{setBusy(false);}}
 async function sendComment(){if(!comment.trim())return;setBusy(true);try{await act({action:"comment",body:comment.trim()});setComment("");}finally{setBusy(false);}}
 async function share(){const url=window.location.href;try{if(navigator.share)await navigator.share({title:story?.title,url});else{await navigator.clipboard.writeText(url);setError("Link copied to clipboard.");}}catch{}}
 if(loading)return <main className="flex min-h-screen items-center justify-center gap-2 bg-background"><LoaderCircle className="animate-spin"/> Loading story…</main>;
 if(!story)return <main className="min-h-screen bg-background px-4 py-12"><div className="mx-auto max-w-2xl rounded-2xl border bg-surface p-8"><h1 className="text-2xl font-bold">Story unavailable</h1><p className="mt-2 text-sm text-on-surface-variant">{error||"This story may have been removed or is no longer public."}</p><Link href="/community-stories" className="mt-5 inline-flex items-center gap-2 font-semibold text-primary"><ArrowLeft size={16}/> Back to Pawprints & Memories</Link></div></main>;
 return <main className="min-h-screen bg-background px-4 py-8 md:py-12"><article className="mx-auto max-w-3xl">
 <Link href="/community-stories" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft size={16}/> Pawprints & Memories</Link>
 {error&&<p role="status" className="mt-4 rounded-lg bg-surface-container p-3 text-sm">{error}</p>}
 <div className="mt-5 rounded-3xl border border-outline-variant bg-surface p-5 md:p-10">
 <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{labels[story.category]||"Community story"}</span>
 <h1 className="mt-4 text-3xl font-extrabold leading-tight md:text-4xl">{story.title}</h1>
 <p className="mt-3 text-sm text-on-surface-variant">Shared by <strong>{story.author_name}</strong> · {new Date(story.published_at).toLocaleDateString()}</p>
 {(story.animal_name||story.animal_species||story.broad_location)&&<p className="mt-4 text-sm text-on-surface-variant">{[story.animal_name,story.animal_species,story.broad_location].filter(Boolean).join(" · ")}</p>}
 {story.media_urls?.length>0&&<div className="mt-6 grid gap-3 sm:grid-cols-2">{story.media_urls.map((url,i)=><img key={url+i} src={url} alt={`Story photo ${i+1}`} className="max-h-[440px] w-full rounded-2xl object-cover" loading="lazy"/>)}</div>}
 <div className="mt-7 whitespace-pre-wrap text-base leading-8">{story.body}</div>
 <div className="mt-8 flex flex-wrap gap-2 border-t border-outline-variant pt-5">
 <button disabled={busy} onClick={()=>void act({action:"react",reaction:"heart"})} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-surface-container"><Heart size={16}/> Appreciate ({story.reactions?.length||0})</button>
 <button disabled={busy} onClick={()=>void act({action:story.bookmarked?"unbookmark":"bookmark"})} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-surface-container"><Bookmark size={16}/> {story.bookmarked?"Saved":"Save story"}</button>
 <button onClick={()=>void share()} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-surface-container"><Share2 size={16}/> Share</button>
 <button onClick={()=>{const reason=window.prompt("Report reason: harassment, privacy, animal_welfare, spam, misinformation, or other");if(reason)void act({action:"report",reason:reason.trim().toLowerCase()});}} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-surface-container"><Flag size={16}/> Report</button>
 </div>
 </div>
 <section className="mt-6 rounded-3xl border border-outline-variant bg-surface p-5 md:p-8"><h2 className="flex items-center gap-2 text-xl font-extrabold"><MessageCircle size={19}/> Kind words ({story.comments?.length||0})</h2>
 <div className="mt-4 grid gap-3">{(story.comments||[]).map(c=><div key={c.id} className="rounded-xl bg-surface-container/60 p-4"><p className="text-xs font-bold">{c.author_name} <span className="font-normal text-on-surface-variant">· {new Date(c.created_at).toLocaleDateString()}</span></p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{c.body}</p></div>)}{!story.comments?.length&&<p className="text-sm text-on-surface-variant">Be the first to leave a supportive comment.</p>}</div>
 <div className="mt-4 flex gap-2"><input value={comment} onChange={e=>setComment(e.target.value)} maxLength={2000} placeholder="Leave a kind word…" className="min-w-0 flex-1 rounded-full border border-outline-variant bg-background px-4 py-3 text-sm"/><button disabled={busy||!comment.trim()} onClick={()=>void sendComment()} className="rounded-full bg-primary px-4 text-white disabled:opacity-50" aria-label="Send comment"><Send size={16}/></button></div>
 </section><p className="mt-6 text-center text-xs text-on-surface-variant"><PawPrint className="mr-1 inline" size={13}/> Every act of kindness leaves a pawprint.</p>
 </article></main>;
}
