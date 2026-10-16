"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Search, SlidersHorizontal, ArrowUpRight, Languages, Sparkles } from "lucide-react";

type Book = {
  id: string;
  title: string;
  slug: string;
  subtitle?: string | null;
  description: string;
  author_name: string;
  publication_type: "complete_file" | "chapter_based" | "hybrid";
  category: string;
  language: string;
  cover_storage_path?: string | null;
  cover_url?: string | null;
  primary_file_format?: string | null;
  is_featured: boolean;
  published_at?: string | null;
};

type ApiResponse = { success: boolean; data?: { books: Book[]; count: number; limit?: number; offset?: number }; message?: string };
type FacetsResponse = { success: boolean; data?: { categories: string[]; languages: string[] }; message?: string };

async function parseApiResponse<T>(response: Response): Promise<T> {
  try { return await response.json() as T; }
  catch { throw new Error("The server returned an unexpected response. Please try again."); }
}

const COVER_STYLES = [
  "from-amber-100 via-orange-50 to-rose-100 text-stone-900",
  "from-emerald-100 via-teal-50 to-cyan-100 text-slate-900",
  "from-sky-100 via-indigo-50 to-violet-100 text-slate-900",
  "from-rose-100 via-pink-50 to-orange-100 text-stone-900",
];

function BookCover({ book, index }: { book: Book; index: number }) {
  return (
    <div className={`relative flex aspect-[3/4] w-full flex-col justify-between overflow-hidden rounded-xl bg-gradient-to-br p-5 shadow-sm ${COVER_STYLES[index % COVER_STYLES.length]}`}>{book.cover_url && <><img src={book.cover_url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/10" /></>}
      <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">
        <span className={book.cover_url ? "relative z-10 text-white" : "relative z-10"}>Finding Astro</span><BookOpen size={15} className="relative z-10" />
      </div>
      <div className="relative z-10">
        <p className={`relative z-10 mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] opacity-75 ${book.cover_url ? "text-white" : ""}`}>{book.category}</p>
        <h2 className={`relative z-10 line-clamp-4 text-xl font-extrabold leading-tight tracking-tight sm:text-2xl ${book.cover_url ? "text-white" : ""}`}>{book.title}</h2>
        {book.subtitle && <p className={`relative z-10 mt-2 line-clamp-2 text-xs opacity-75 ${book.cover_url ? "text-white" : ""}`}>{book.subtitle}</p>}
      </div>
      <div className="absolute -bottom-10 -right-8 h-36 w-36 rounded-full border-[18px] border-current/10" />
      <div className="absolute -bottom-5 -right-2 h-20 w-20 rounded-full border border-current/20" />
    </div>
  );
}

export default function LibraryPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All topics");
  const [language, setLanguage] = useState("All languages");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");
  const [facets, setFacets] = useState<{ categories: string[]; languages: string[] }>({ categories: [], languages: [] });
  const loadMoreControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setLoadingMore(false);
      setLoadMoreError("");
      setError("");
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        if (category !== "All topics") params.set("category", category);
        if (language !== "All languages") params.set("language", language);
        params.set("limit", "24");
        params.set("offset", "0");
        const response = await fetch(`/api/v1/library/books?${params.toString()}`, { signal: controller.signal, cache: "no-store" });
        const payload = await parseApiResponse<ApiResponse>(response);
        if (!response.ok || !payload.success) throw new Error(payload.message || "The library could not be loaded.");
        setBooks(payload.data?.books ?? []);
        setTotalCount(payload.data?.count ?? 0);
        setLoadMoreError("");
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "The library could not be loaded.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    const timer = setTimeout(load, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
      loadMoreControllerRef.current?.abort();
      loadMoreControllerRef.current = null;
    };
  }, [query, category, language, reloadKey]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/library/facets", { signal: controller.signal, cache: "force-cache" })
      .then(async (response) => {
        const payload = await parseApiResponse<FacetsResponse>(response);
        if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to load filters");
        setFacets({ categories: payload.data?.categories ?? [], languages: payload.data?.languages ?? [] });
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const categories = useMemo(() => {
    const options = facets.categories.length ? facets.categories : Array.from(new Set(books.map((book) => book.category)));
    return ["All topics", ...options].sort((a, b) => a === "All topics" ? -1 : b === "All topics" ? 1 : a.localeCompare(b));
  }, [books, facets.categories]);
  const languages = useMemo(() => {
    const options = facets.languages.length ? facets.languages : Array.from(new Set(books.map((book) => book.language)));
    return ["All languages", ...options].sort((a, b) => a === "All languages" ? -1 : b === "All languages" ? 1 : a.localeCompare(b));
  }, [books, facets.languages]);
  const featuredBook = books.find((book) => book.is_featured);
  const gridBooks = featuredBook ? books.filter((book) => book.id !== featuredBook.id) : books;

  async function loadMore() {
    loadMoreControllerRef.current?.abort();
    const controller = new AbortController();
    loadMoreControllerRef.current = controller;
    setLoadingMore(true);
    setLoadMoreError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (category !== "All topics") params.set("category", category);
      if (language !== "All languages") params.set("language", language);
      params.set("limit", "24");
      params.set("offset", String(books.length));
      const response = await fetch(`/api/v1/library/books?${params.toString()}`, { cache: "no-store", signal: controller.signal });
      const payload = await parseApiResponse<ApiResponse>(response);
      if (!response.ok || !payload.success) throw new Error(payload.message || "More publications could not be loaded.");
      if (controller.signal.aborted) return;
      const nextBooks = payload.data?.books ?? [];
      setBooks((current) => {
        const seen = new Set(current.map((book) => book.id));
        return [...current, ...nextBooks.filter((book) => !seen.has(book.id))];
      });
      setTotalCount(payload.data?.count ?? totalCount);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setLoadMoreError(err instanceof Error ? err.message : "More publications could not be loaded.");
    } finally {
      if (loadMoreControllerRef.current === controller) {
        loadMoreControllerRef.current = null;
        setLoadingMore(false);
      }
    }
  }

  return (
    <main className="min-h-screen bg-background text-on-background">
      <a href="#library-results" className="sr-only z-50 rounded-lg bg-surface px-4 py-3 font-bold text-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:ring-2 focus:ring-primary">Skip to publications</a>
      <header className="border-b border-outline/15 bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3.5 py-3 sm:px-8 sm:py-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-extrabold tracking-tight"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-on-primary"><BookOpen size={19} /></span> FINDING ASTRO <span className="font-medium text-on-surface-variant">/ Library</span></Link>
          <Link href="/" className="text-sm font-semibold text-on-surface-variant transition hover:text-on-background">Back to home</Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-outline/10 bg-surface px-5 py-12 sm:px-8 sm:py-16">
        <div className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-primary"><Sparkles size={14} /> Knowledge for kinder communities</div>
          <div className="grid gap-8 md:grid-cols-[1fr_300px] md:items-end">
            <div className="max-w-3xl">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-primary">Read · Learn · Take action</p>
              <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">Stories and knowledge that help animals thrive.</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-on-surface-variant sm:text-lg">Explore Finding Astro publications on animal care, adoption, community welfare, and the people making a difference. Free to read, built around the welfare mission.</p>
            </div>
            <div className="rounded-2xl border border-outline/15 bg-background/80 p-5">
              <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary-container text-on-secondary-container"><BookOpen size={21} /></span><div><p className="text-2xl font-extrabold tabular-nums">{loading ? "—" : totalCount}</p><p className="text-xs text-on-surface-variant">Publications available</p></div></div>
              <p className="mt-4 text-sm leading-6 text-on-surface-variant">Every publication is intended to turn learning into more informed, compassionate animal care.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="library-results" aria-label="Browse publications" className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="mb-8 grid gap-3 lg:grid-cols-[minmax(240px,1fr)_220px_190px]">
          <label className="flex min-h-12 items-center gap-3 rounded-xl border border-outline/20 bg-surface px-4 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30"><Search size={18} className="shrink-0 text-on-surface-variant" /><input aria-label="Search publications" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search books, authors, or topics" className="w-full bg-transparent text-sm outline-none placeholder:text-on-surface-variant/70" /></label>
          <label className="flex min-h-12 items-center gap-2 rounded-xl border border-outline/20 bg-surface px-4 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30"><SlidersHorizontal size={16} className="text-on-surface-variant" /><select aria-label="Filter by topic" value={category} onChange={(event) => setCategory(event.target.value)} className="w-full bg-transparent text-sm outline-none"><option>All topics</option>{categories.filter((item) => item !== "All topics").map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="flex min-h-12 items-center gap-2 rounded-xl border border-outline/20 bg-surface px-4 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30"><Languages size={16} className="text-on-surface-variant" /><select aria-label="Filter by language" value={language} onChange={(event) => setLanguage(event.target.value)} className="w-full bg-transparent text-sm outline-none"><option>All languages</option>{languages.filter((item) => item !== "All languages").map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>

        {loading ? <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="animate-pulse"><div className="aspect-[3/4] rounded-xl bg-surface-variant/50" /><div className="mt-3 h-4 w-4/5 rounded bg-surface-variant/50" /><div className="mt-2 h-3 w-2/3 rounded bg-surface-variant/40" /></div>)}</div>
          : error ? <div role="alert" className="rounded-2xl border border-error/20 bg-error-container/30 p-6"><h2 className="font-bold">The library is temporarily unavailable</h2><p className="mt-2 text-sm text-on-surface-variant">{error}</p><button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Try again</button></div>
          : books.length === 0 ? <div className="rounded-2xl border border-dashed border-outline/30 px-6 py-16 text-center"><BookOpen className="mx-auto text-on-surface-variant" size={34} /><h2 className="mt-4 text-xl font-bold">No publications found</h2><p className="mt-2 text-sm text-on-surface-variant">Try a different search or filter. New Finding Astro publications will appear here when published.</p><button type="button" onClick={() => { setQuery(""); setCategory("All topics"); setLanguage("All languages"); }} className="mt-5 rounded-lg border border-outline/25 px-4 py-2 text-sm font-semibold">Clear filters</button></div>
          : <>
             {featuredBook && <Link href={`/library/${featuredBook.slug}`} className="group mb-9 block overflow-hidden rounded-3xl border border-outline/15 bg-surface transition hover:border-primary/30 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4">
               <div className="grid md:grid-cols-2">
                 <div className="relative min-h-64 overflow-hidden bg-gradient-to-br from-primary/15 via-secondary-container to-surface-variant sm:min-h-80">
                   {featuredBook.cover_url ? <img src={featuredBook.cover_url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" /> : <div className="absolute inset-0 grid place-items-center"><BookOpen size={76} className="text-primary/35" /></div>}
                   <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
                   <span className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-surface/95 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-primary"><Sparkles size={13} /> Featured reading</span>
                 </div>
                 <div className="flex flex-col justify-center p-4 sm:p-8 md:p-10">
                   <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Editor&apos;s pick · {featuredBook.category}</p>
                   <h2 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{featuredBook.title}</h2>
                   {featuredBook.subtitle && <p className="mt-2 text-sm font-semibold text-on-surface-variant">{featuredBook.subtitle}</p>}
                   <p className="mt-4 line-clamp-3 text-sm leading-6 text-on-surface-variant">{featuredBook.description || "Explore practical knowledge and compassionate ideas that help communities care for animals better."}</p>
                   <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-on-surface-variant"><span className="rounded-full bg-surface-variant/60 px-3 py-1.5 font-semibold">{featuredBook.publication_type === "complete_file" ? (featuredBook.primary_file_format?.toUpperCase() ?? "BOOK") : featuredBook.publication_type === "hybrid" ? "PDF + CHAPTERS" : "CHAPTERS"}</span><span>{featuredBook.author_name}</span><span>·</span><span>{featuredBook.language.toUpperCase()}</span></div>
                   <span className="mt-6 inline-flex min-h-11 w-fit items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-on-primary transition group-hover:gap-3">Start reading <ArrowUpRight size={16} /></span>
                 </div>
               </div>
             </Link>}
             {gridBooks.length > 0 && <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-8 lg:grid-cols-4 xl:grid-cols-5">{gridBooks.map((book, index) => <Link key={book.id} href={`/library/${book.slug}`} className="group min-w-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4"><BookCover book={book} index={index} /><div className="mt-4 flex items-start justify-between gap-2"><div className="min-w-0"><p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">{book.category}</p><h2 className="line-clamp-2 text-base font-extrabold leading-snug group-hover:text-primary sm:text-lg">{book.title}</h2><p className="mt-1 truncate text-sm text-on-surface-variant">{book.author_name}</p></div><ArrowUpRight size={17} className="mt-1 shrink-0 text-on-surface-variant transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" /></div><div className="mt-3 flex items-center gap-2 text-xs text-on-surface-variant"><span className="rounded-full bg-surface-variant/50 px-2 py-1">{book.publication_type === "complete_file" ? (book.primary_file_format?.toUpperCase() ?? "BOOK") : book.publication_type === "hybrid" ? "PDF + CHAPTERS" : "CHAPTERS"}</span><span className="inline-flex items-center gap-1"><Languages size={12} />{book.language.toUpperCase()}</span></div></Link>)}</div>}
           </>}
        {!loading && !error && books.length > 0 && <div className="mt-10 flex flex-col items-center gap-3 border-t border-outline/10 pt-8">
          <p className="text-sm text-on-surface-variant" aria-live="polite">Showing <span className="font-bold text-on-background">{books.length}</span> of <span className="font-bold text-on-background">{totalCount}</span> publications</p>
          {loadMoreError && <p role="alert" className="text-sm text-error">{loadMoreError}</p>}
          {books.length < totalCount && <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-outline/20 bg-surface px-5 py-3 text-sm font-bold transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-wait disabled:opacity-60">{loadingMore ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" /> Loading publications…</> : "Load more publications"}</button>}
        </div>}
      </section>

      <footer className="border-t border-outline/15 bg-surface px-5 py-8 sm:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-2 text-xs text-on-surface-variant sm:flex-row sm:items-center sm:justify-between"><p>Finding Astro Library · Free educational publications for animal welfare</p><Link href="/" className="inline-flex items-center gap-1 font-semibold hover:text-primary">Explore Finding Astro <ArrowUpRight size={13} /></Link></div></footer>
    </main>
  );
}
