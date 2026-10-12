"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, BookText, Check, ChevronDown, ChevronUp, Languages, List, LoaderCircle } from "lucide-react";

type Chapter = { id: string; title: string; summary: string; sort_order: number; content_format: "rich_text" | "pdf" | "epub" };
type Book = { id: string; title: string; slug: string; subtitle?: string | null; description: string; author_name: string; publication_type: string; category: string; language: string; cover_storage_path?: string | null; cover_url?: string | null; primary_file_format?: string | null; has_complete_file?: boolean; published_at?: string | null };
type Block = { type?: string; text?: string; level?: number };
type ChapterContent = { id: string; title: string; summary: string; sort_order: number; content_format: string; content_body?: { blocks?: Block[]; text?: string } | null };
type ApiResponse = { success: boolean; data?: { book: Book; chapters: Chapter[]; chapter?: ChapterContent }; message?: string };

async function parseApiResponse<T>(response: Response): Promise<T> {
  try { return await response.json() as T; }
  catch { throw new Error("The server returned an unexpected response. Please try again."); }
}

function formatDate(value?: string | null) {
  if (!value) return "Finding Astro publication";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Finding Astro publication" : new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(date);
}

function ChapterBody({ content }: { content?: ChapterContent }) {
  const blocks = content?.content_body?.blocks;
  if (Array.isArray(blocks) && blocks.length) {
    return <div className="space-y-5 leading-8 text-on-surface">{blocks.map((block, index) => {
      const text = typeof block.text === "string" ? block.text : "";
      if (!text) return null;
      if (block.type === "heading") return <h3 key={index} className={`font-extrabold leading-tight tracking-tight ${block.level === 3 ? "text-[1.3em]" : "text-[1.5em]"}`}>{text}</h3>;
      if (block.type === "quote") return <blockquote key={index} className="border-l-4 border-primary/50 pl-5 italic text-on-surface-variant">{text}</blockquote>;
      return <p key={index}>{text}</p>;
    })}</div>;
  }
  if (typeof content?.content_body?.text === "string") return <div className="whitespace-pre-wrap leading-8 text-on-surface">{content.content_body.text}</div>;
  return <p className="text-sm text-on-surface-variant">This chapter does not contain readable structured text yet.</p>;
}

export default function LibraryBookPage() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeChapter, setActiveChapter] = useState<ChapterContent | undefined>();
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [error, setError] = useState("");
  const [chapterError, setChapterError] = useState("");
  const [showContents, setShowContents] = useState(true);
  const [fontScale, setFontScale] = useState(1);
  const [hasChosenChapter, setHasChosenChapter] = useState(false);
  const chapterRequestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/v1/library/books/${encodeURIComponent(slug)}`, { signal: controller.signal, cache: "no-store" });
        const payload = await parseApiResponse<ApiResponse>(response);
        if (!response.ok || !payload.success || !payload.data?.book) throw new Error(payload.message || "This publication could not be found.");
        setBook(payload.data.book);
        setChapters(payload.data.chapters ?? []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "This publication could not be loaded.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => {
      controller.abort();
      chapterRequestRef.current?.abort();
      chapterRequestRef.current = null;
    };
  }, [slug]);

  const openChapter = useCallback(async (chapter: Chapter, index: number) => {
    if (!slug) return;
    chapterRequestRef.current?.abort();
    const chapterController = new AbortController();
    chapterRequestRef.current = chapterController;
    setHasChosenChapter(true);
    setActiveIndex(index);
    setChapterLoading(true);
    setChapterError("");
    try {
      const response = await fetch(`/api/v1/library/books/${encodeURIComponent(slug)}/chapters/${encodeURIComponent(chapter.id)}`, { cache: "no-store", signal: chapterController.signal });
      const payload = await parseApiResponse<ApiResponse>(response);
      if (!response.ok || !payload.success || !payload.data?.chapter) throw new Error(payload.message || "This chapter could not be loaded.");
      if (chapterController.signal.aborted) return;
      setActiveChapter(payload.data.chapter);
      const token = window.localStorage.getItem("fa_token");
      if (token && payload.data.book?.id) {
        void fetch("/api/v1/library/progress", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "X-Requested-With": "Finding-Astro-App",
          },
          body: JSON.stringify({ bookId: payload.data.book.id, chapterId: chapter.id, position: { kind: "chapter", offset: 0 } }),
        }).catch(() => undefined);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setChapterError(err instanceof Error ? err.message : "This chapter could not be loaded.");
      setActiveChapter(undefined);
    } finally {
      if (chapterRequestRef.current === chapterController) {
        chapterRequestRef.current = null;
        setChapterLoading(false);
      }
    }
  }, [slug]);

  useEffect(() => {
    if (!chapters.length || activeChapter || hasChosenChapter || book?.publication_type === "complete_file") return;
    let cancelled = false;
    async function resumeReading() {
      const token = window.localStorage.getItem("fa_token");
      if (token && book?.id) {
        try {
          const response = await fetch(`/api/v1/library/progress?bookId=${encodeURIComponent(book.id)}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
          if (response.ok) {
            const payload = await parseApiResponse<{ success?: boolean; data?: { progress?: Array<{ chapter_id: string | null }> } }>(response);
            const savedChapterId = payload.data?.progress?.[0]?.chapter_id;
            const savedIndex = savedChapterId ? chapters.findIndex((chapter) => chapter.id === savedChapterId) : -1;
            if (!cancelled && savedIndex >= 0) {
              await openChapter(chapters[savedIndex], savedIndex);
              return;
            }
          }
        } catch {
          // Progress is an enhancement; reading must still work if it cannot be loaded.
        }
      }
      if (!cancelled) await openChapter(chapters[0], 0);
    }
    void resumeReading();
    return () => { cancelled = true; };
  }, [chapters, activeChapter, hasChosenChapter, book?.id, book?.publication_type, openChapter]);

  if (loading) return <main className="grid min-h-screen place-items-center bg-background"><div className="flex items-center gap-3 text-sm text-on-surface-variant"><LoaderCircle className="animate-spin" size={20} /> Opening publication…</div></main>;
  if (error || !book) return <main className="min-h-screen bg-background px-5 py-16"><div className="mx-auto max-w-xl rounded-2xl border border-outline/20 bg-surface p-8 text-center"><BookOpen className="mx-auto text-on-surface-variant" size={34} /><h1 className="mt-4 text-2xl font-extrabold">Publication unavailable</h1><p role="alert" className="mt-2 text-sm text-on-surface-variant">{error || "This publication may have been unpublished."}</p><Link href="/library" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-on-primary"><ArrowLeft size={16} /> Back to library</Link></div></main>;

  const moveChapter = (direction: -1 | 1) => {
    const next = activeIndex + direction;
    if (next >= 0 && next < chapters.length) void openChapter(chapters[next], next);
  };

  return (
    <main className="min-h-screen bg-background text-on-background">
      <a href="#reading-content" className="sr-only z-50 rounded-lg bg-surface px-4 py-3 font-bold text-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:ring-2 focus:ring-primary">Skip to reading content</a>
      <header className="border-b border-outline/15 bg-surface"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8"><Link href="/library" className="inline-flex items-center gap-2 text-sm font-bold"><ArrowLeft size={17} /> Library</Link><span className="hidden text-xs font-semibold text-on-surface-variant sm:inline">FINDING ASTRO PUBLICATIONS</span><Link href="/" className="text-sm font-semibold text-on-surface-variant hover:text-primary">Home</Link></div></header>
      <section className="border-b border-outline/15 bg-surface px-5 py-8 sm:px-8 sm:py-12"><div className="mx-auto grid max-w-7xl gap-7 md:grid-cols-[minmax(0,1fr)_240px] md:items-center"><div><div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-primary"><span>{book.category}</span><span className="text-outline">•</span><span className="inline-flex items-center gap-1"><Languages size={13} />{book.language.toUpperCase()}</span></div><h1 className="max-w-4xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">{book.title}</h1>{book.subtitle && <p className="mt-3 text-lg font-semibold text-on-surface-variant">{book.subtitle}</p>}<p className="mt-4 text-sm text-on-surface-variant">By <span className="font-bold text-on-background">{book.author_name}</span> · {formatDate(book.published_at)}</p><p className="mt-5 max-w-3xl whitespace-pre-line text-base leading-7 text-on-surface-variant">{book.description || "A Finding Astro publication created to support more informed, compassionate animal welfare."}</p><div className="mt-6 flex flex-wrap items-center gap-3"><span className="inline-flex items-center gap-2 rounded-full bg-secondary-container px-3 py-1.5 text-xs font-bold text-on-secondary-container"><BookText size={14} />{book.publication_type === "complete_file" ? (book.primary_file_format?.toUpperCase() ?? "COMPLETE BOOK") : book.publication_type === "hybrid" ? `${chapters.length} CHAPTER${chapters.length === 1 ? "" : "S"} + PDF` : `${chapters.length} CHAPTER${chapters.length === 1 ? "" : "S"}`}</span><span className="text-xs text-on-surface-variant">Free to read</span>{book.publication_type === "hybrid" && book.has_complete_file && book.primary_file_format === "pdf" && <a href={`/api/v1/library/books/${encodeURIComponent(slug)}/content`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-on-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Read complete PDF ↗</a>}</div></div><div className="mx-auto w-44 md:w-full"><div className="relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100 p-6 text-stone-900 shadow-lg">{book.cover_url && <><img src={book.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/10" /></>}<div className={`relative z-10 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[0.18em] ${book.cover_url ? "text-white" : ""}`}><span>Finding Astro</span><BookOpen size={17} /></div><h2 className={`relative z-10 text-2xl font-extrabold leading-tight ${book.cover_url ? "text-white" : ""}`}>{book.title}</h2><span className={`relative z-10 text-xs font-semibold ${book.cover_url ? "text-white" : ""}`}>{book.author_name}</span><div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full border-[20px] border-stone-900/10" /></div></div></div></section>

      <section id="reading-content" aria-label="Book contents and reader" className={`mx-auto grid max-w-7xl gap-8 px-5 py-8 sm:px-8 lg:py-12 ${book.publication_type === "complete_file" ? "lg:grid-cols-1" : "lg:grid-cols-[280px_minmax(0,1fr)]"}`}>
        {book.publication_type !== "complete_file" && <aside className="h-fit rounded-2xl border border-outline/15 bg-surface p-4"><button onClick={() => setShowContents((value) => !value)} aria-expanded={showContents} className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span className="flex items-center gap-2 font-extrabold"><List size={17} /> Contents <span className="text-xs font-medium text-on-surface-variant">({chapters.length})</span></span>{showContents ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</button>{showContents && <div className="mt-3 space-y-1">{chapters.length === 0 ? <p className="px-2 py-4 text-sm text-on-surface-variant">No published chapters are available.</p> : chapters.map((chapter, index) => <button key={chapter.id} onClick={() => void openChapter(chapter, index)} className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${activeIndex === index ? "bg-primary/10 text-primary" : "text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-background"}`}><span className="mt-0.5 text-xs font-bold tabular-nums">{String(index + 1).padStart(2, "0")}</span><span className="text-sm font-semibold leading-5">{chapter.title}</span>{activeIndex === index && <Check size={15} className="ml-auto mt-0.5 shrink-0" />}</button>)}</div>}</aside>}

        <article className="min-w-0 rounded-2xl border border-outline/15 bg-surface p-5 sm:p-8 lg:p-10">
          {book.publication_type === "complete_file" ? book.has_complete_file && book.primary_file_format === "pdf" ? <div><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-extrabold">Read the complete book</h2><a href={`/api/v1/library/books/${encodeURIComponent(slug)}/content`} target="_blank" rel="noreferrer" className="rounded-lg border border-outline/20 px-3 py-2 text-sm font-bold hover:bg-surface-variant">Open PDF in new tab</a></div><iframe title={`Read ${book.title}`} src={`/api/v1/library/books/${encodeURIComponent(slug)}/content`} className="h-[72vh] min-h-[560px] w-full rounded-xl border border-outline/15 bg-white" /></div> : <div className="rounded-xl border border-dashed border-outline/30 px-5 py-12 text-center"><BookOpen className="mx-auto text-on-surface-variant" size={34} /><h2 className="mt-4 text-xl font-extrabold">Book file not available yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-on-surface-variant">The team has not connected a supported PDF edition to this publication yet. Please check back later.</p></div>
            : chapterLoading ? <div role="status" aria-live="polite" className="flex min-h-72 items-center justify-center gap-3 text-sm text-on-surface-variant"><LoaderCircle className="animate-spin" size={20} /> Loading chapter…</div>
            : chapterError ? <div role="alert" className="rounded-xl border border-error/20 bg-error-container/20 p-5"><h2 className="font-bold">Chapter unavailable</h2><p className="mt-2 text-sm text-on-surface-variant">{chapterError}</p></div>
            : activeChapter ? <><div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-outline/15 pb-5"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Chapter {activeIndex + 1} of {chapters.length}</p><h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{activeChapter.title}</h2>{activeChapter.summary && <p className="mt-2 text-sm text-on-surface-variant">{activeChapter.summary}</p>}</div><div className="flex items-center gap-2"><button aria-label="Decrease text size" onClick={() => setFontScale((value) => Math.max(0.85, +(value - 0.1).toFixed(2)))} className="grid h-9 w-9 place-items-center rounded-lg border border-outline/20 text-sm font-bold hover:bg-surface-variant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">A−</button><button aria-label="Increase text size" onClick={() => setFontScale((value) => Math.min(1.4, +(value + 0.1).toFixed(2)))} className="grid h-9 w-9 place-items-center rounded-lg border border-outline/20 text-sm font-bold hover:bg-surface-variant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">A+</button></div></div><div style={{ fontSize: `${fontScale}em` }}><ChapterBody content={activeChapter} /></div><div className="mt-12 flex items-center justify-between gap-3 border-t border-outline/15 pt-6"><button onClick={() => moveChapter(-1)} disabled={activeIndex === 0 || chapterLoading} className="inline-flex items-center gap-2 rounded-xl border border-outline/20 px-4 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"> <ArrowLeft size={16} /> Previous</button><span className="text-xs text-on-surface-variant">{activeIndex + 1} / {chapters.length}</span><button onClick={() => moveChapter(1)} disabled={activeIndex >= chapters.length - 1 || chapterLoading} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-on-primary disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Next <ArrowRight size={16} /></button></div></>
            : <div className="py-16 text-center"><BookOpen className="mx-auto text-on-surface-variant" size={34} /><h2 className="mt-4 text-xl font-extrabold">Choose a chapter</h2><p className="mt-2 text-sm text-on-surface-variant">Select a chapter from the contents to start reading.</p></div>}
        </article>
      </section>
      <footer className="border-t border-outline/15 bg-surface px-5 py-7 text-center text-xs text-on-surface-variant">Finding Astro Library · Knowledge for kinder communities</footer>
    </main>
  );
}
