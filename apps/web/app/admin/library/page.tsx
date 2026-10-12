"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowLeft, BookOpen, Check, FileText, ImagePlus, LoaderCircle, Plus, Save, Send, UploadCloud } from "lucide-react";

type Book = {
  id: string; title: string; slug: string; subtitle?: string | null; description: string; author_name: string;
  publication_type: "complete_file" | "chapter_based" | "hybrid"; category: string; language: string;
  cover_storage_path?: string | null; primary_file_storage_path?: string | null; primary_file_format?: string | null;
  status: "draft" | "published" | "archived"; is_featured: boolean; rights_confirmed_at?: string | null;
  published_at?: string | null; updated_at?: string | null;
};
type Chapter = { id: string; title: string; summary: string; sort_order: number; content_format: string; status: "draft" | "published" };
type Payload = { success: boolean; data?: any; message?: string; code?: string };

const emptyForm = {
  title: "", slug: "", subtitle: "", description: "", authorName: "Finding Astro Team",
  publicationType: "chapter_based" as Book["publication_type"], category: "Finding Astro Publications", language: "en",
};

async function requestApi(path: string, options: RequestInit = {}): Promise<Payload> {
  const token = typeof window !== "undefined" ? window.localStorage.getItem("fa_token") : null;
  const headers = new Headers(options.headers);
  headers.set("X-Requested-With", "Finding-Astro-App");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`/api/v1${path}`, { ...options, headers, cache: "no-store" });
  const raw = await response.text();
  let payload: Payload;
  try { payload = JSON.parse(raw) as Payload; }
  catch { throw new Error(`The server returned an unreadable response (HTTP ${response.status}). Please retry.`); }
  if (!response.ok || !payload.success) throw new Error(payload.message || payload.code || `Request failed (HTTP ${response.status}).`);
  return payload;
}

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g, "").trim().replace(/[\s-]+/g, "-").replace(/^-|-$/g, "");
}

export default function AdminLibraryPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [statusFilter, setStatusFilter] = useState("all");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterText, setChapterText] = useState("");
  const [chapterSummary, setChapterSummary] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [completeFile, setCompleteFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [authMissing, setAuthMissing] = useState(false);

  const loadBooks = useCallback(async (preferredId?: string) => {
    setLoading(true); setError("");
    try {
      const suffix = statusFilter === "all" ? "" : `?status=${encodeURIComponent(statusFilter)}`;
      const result = await requestApi(`/admin/library/books${suffix}`);
      const items = (result.data?.books ?? []) as Book[];
      setBooks(items);
      const nextId = preferredId && items.some((item) => item.id === preferredId) ? preferredId : selectedId && items.some((item) => item.id === selectedId) ? selectedId : "";
      setSelectedId(nextId);
      if (!nextId) { setForm(emptyForm); setChapters([]); }
      else {
        const book = items.find((item) => item.id === nextId);
        if (book) setForm({ title: book.title, slug: book.slug, subtitle: book.subtitle ?? "", description: book.description ?? "", authorName: book.author_name, publicationType: book.publication_type, category: book.category, language: book.language });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load publications.";
      setError(message);
      setAuthMissing(/authentication|required|unauthorized|administrator/i.test(message));
    } finally { setLoading(false); }
  }, [statusFilter, selectedId]);

  const loadChapters = useCallback(async (bookId: string) => {
    if (!bookId) { setChapters([]); return; }
    try {
      const result = await requestApi(`/admin/library/books/${bookId}/chapters`);
      setChapters((result.data?.chapters ?? []) as Chapter[]);
    } catch (err) {
      setChapters([]);
      setError(err instanceof Error ? err.message : "Unable to load chapters.");
    }
  }, []);

  useEffect(() => { void loadBooks(); }, [loadBooks]);
  useEffect(() => { if (selectedId) void loadChapters(selectedId); else setChapters([]); }, [selectedId, loadChapters]);

  const selectedBook = books.find((book) => book.id === selectedId) ?? null;
  const setField = (field: keyof typeof emptyForm, value: string) => setForm((current) => ({ ...current, [field]: value }));

  async function createBook(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const result = await requestApi("/admin/library/books", { method: "POST", body: JSON.stringify({ ...form, slug: form.slug || slugify(form.title) }) });
      const id = result.data?.book?.id as string | undefined;
      setNotice("Draft publication created. Add its content before publishing.");
      await loadBooks(id);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to create publication."); }
    finally { setSaving(false); }
  }

  async function saveMetadata(event: FormEvent) {
    event.preventDefault();
    if (!selectedBook) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await requestApi(`/admin/library/books/${selectedBook.id}`, { method: "PATCH", body: JSON.stringify({ title: form.title, slug: form.slug, subtitle: form.subtitle, description: form.description, authorName: form.authorName, publicationType: form.publicationType, category: form.category, language: form.language }) });
      setNotice("Publication details saved.");
      await loadBooks(selectedBook.id);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save publication."); }
    finally { setSaving(false); }
  }

  async function uploadMedia(file: File, purpose: "document" | "animal_photo") {
    const data = new FormData();
    data.set("file", file);
    data.set("originalName", file.name);
    data.set("mimeType", file.type);
    data.set("purpose", purpose);
    const result = await requestApi("/media/upload", { method: "POST", body: data });
    if (!result.data?.key) throw new Error("Upload completed without a storage key. Please retry.");
    return result.data as { key: string; publicUrl?: string; mimeType: string };
  }

  async function uploadSelectedFiles() {
    if (!selectedBook || (!completeFile && !coverFile)) return;
    setUploading(true); setError(""); setNotice("");
    try {
      const patch: Record<string, unknown> = {};
      if (completeFile) {
        if (completeFile.type !== "application/pdf") throw new Error("The complete-book upload currently supports PDF only.");
        const uploaded = await uploadMedia(completeFile, "document");
        patch.primaryFileStoragePath = uploaded.key;
        patch.primaryFileFormat = "pdf";
      }
      if (coverFile) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(coverFile.type)) throw new Error("Cover images must be JPEG, PNG, or WebP.");
        const uploaded = await uploadMedia(coverFile, "animal_photo");
        patch.coverStoragePath = uploaded.key;
      }
      await requestApi(`/admin/library/books/${selectedBook.id}`, { method: "PATCH", body: JSON.stringify(patch) });
      setCompleteFile(null); setCoverFile(null);
      setNotice("Selected assets uploaded and connected to the publication.");
      await loadBooks(selectedBook.id);
    } catch (err) { setError(err instanceof Error ? err.message : "Upload failed. Check the file and retry."); }
    finally { setUploading(false); }
  }

  async function addChapter(event: FormEvent) {
    event.preventDefault();
    if (!selectedBook) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await requestApi(`/admin/library/books/${selectedBook.id}/chapters`, {
        method: "POST",
        body: JSON.stringify({
          title: chapterTitle,
          summary: chapterSummary,
          contentFormat: "rich_text",
          contentBody: { blocks: chapterText.split(/\n\s*\n/).map((text) => text.trim()).filter(Boolean).map((text) => ({ type: "paragraph", text })) },
          status: "published",
        }),
      });
      setChapterTitle(""); setChapterSummary(""); setChapterText("");
      setNotice("Chapter added. It remains hidden from readers until its parent book is published.");
      await loadChapters(selectedBook.id);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to add chapter."); }
    finally { setSaving(false); }
  }

  async function publishBook() {
    if (!selectedBook) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await requestApi(`/admin/library/books/${selectedBook.id}`, { method: "PATCH", body: JSON.stringify({ status: "published", rightsConfirmed }) });
      setRightsConfirmed(false);
      setNotice("Publication is live in the reader library.");
      await loadBooks(selectedBook.id);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to publish publication."); }
    finally { setSaving(false); }
  }

  async function changeStatus(status: "draft" | "archived") {
    if (!selectedBook) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await requestApi(`/admin/library/books/${selectedBook.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      setNotice(status === "draft" ? "Publication unpublished." : "Publication archived.");
      await loadBooks(selectedBook.id);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to update status."); }
    finally { setSaving(false); }
  }

  const onFile = (setter: (file: File | null) => void) => (event: ChangeEvent<HTMLInputElement>) => setter(event.target.files?.[0] ?? null);

  return (
    <main className="min-h-screen bg-background text-on-background">
      <header className="border-b border-outline/15 bg-surface"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8"><div className="flex items-center gap-3"><Link href="/dashboard" aria-label="Back to dashboard" className="grid h-9 w-9 place-items-center rounded-lg border border-outline/20 hover:bg-surface-variant"><ArrowLeft size={17} /></Link><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Administration</p><h1 className="text-lg font-extrabold">Finding Astro Library</h1></div></div><Link href="/library" target="_blank" className="text-sm font-bold text-primary hover:underline">Open reader library ↗</Link></div></header>
      <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-10">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Publishing studio</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">Create welfare publications, upload a complete PDF or add chapters, then publish when the content is ready.</p></div><label className="flex items-center gap-2 text-sm"><span className="text-on-surface-variant">Show</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-outline/20 bg-surface px-3 py-2"><option value="all">All publications</option><option value="draft">Drafts</option><option value="published">Published</option><option value="archived">Archived</option></select></label></div>

        {error && <div role="alert" className="mb-5 rounded-xl border border-error/25 bg-error-container/25 p-4 text-sm"><p className="font-bold">{authMissing ? "Administrator sign-in required" : "Something needs attention"}</p><p className="mt-1">{error}</p>{authMissing && <Link href="/login" className="mt-2 inline-block font-bold underline">Go to sign in</Link>}</div>}
        {notice && <div role="status" className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-600/20 bg-emerald-500/10 p-4 text-sm"><Check size={17} className="mt-0.5 shrink-0 text-emerald-700" /><span>{notice}</span></div>}

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="h-fit overflow-hidden rounded-2xl border border-outline/15 bg-surface">
            <div className="flex items-center justify-between border-b border-outline/15 px-4 py-4"><h3 className="font-extrabold">Publications <span className="ml-1 text-xs font-semibold text-on-surface-variant">{books.length}</span></h3><button onClick={() => { setSelectedId(""); setForm(emptyForm); setError(""); setNotice(""); }} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-on-primary"><Plus size={14} /> New</button></div>
            <div className="max-h-[680px] overflow-y-auto p-2">{loading ? <div className="flex items-center gap-2 p-5 text-sm text-on-surface-variant"><LoaderCircle className="animate-spin" size={16} /> Loading publications…</div> : books.length === 0 ? <p className="p-5 text-sm text-on-surface-variant">No publications in this view yet.</p> : books.map((book) => <button key={book.id} onClick={() => { setSelectedId(book.id); setForm({ title: book.title, slug: book.slug, subtitle: book.subtitle ?? "", description: book.description ?? "", authorName: book.author_name, publicationType: book.publication_type, category: book.category, language: book.language }); setRightsConfirmed(false); setError(""); setNotice(""); }} className={`mb-1 w-full rounded-xl p-3 text-left transition ${selectedId === book.id ? "bg-primary/10 ring-1 ring-primary/25" : "hover:bg-surface-variant/60"}`}><div className="flex items-start justify-between gap-2"><span className="line-clamp-2 text-sm font-bold">{book.title}</span><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-extrabold uppercase ${book.status === "published" ? "bg-emerald-500/10 text-emerald-700" : book.status === "archived" ? "bg-surface-variant text-on-surface-variant" : "bg-amber-500/10 text-amber-800"}`}>{book.status}</span></div><p className="mt-1 text-xs text-on-surface-variant">{book.publication_type.replace("_", " ")} · {book.language.toUpperCase()}</p></button>)}</div>
          </aside>

          <section className="min-w-0 space-y-6">
            {!selectedBook ? <form onSubmit={createBook} className="rounded-2xl border border-outline/15 bg-surface p-5 sm:p-7"><div className="mb-6 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Plus size={20} /></span><div><h3 className="text-lg font-extrabold">Create a publication</h3><p className="text-sm text-on-surface-variant">Start as a private draft. You can add content before publishing.</p></div></div><MetadataFields form={form} setField={setField} /><button disabled={saving} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary disabled:opacity-50">{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />} Create draft</button></form>
            : <>
              <form onSubmit={saveMetadata} className="rounded-2xl border border-outline/15 bg-surface p-5 sm:p-7"><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Publication details</p><h3 className="mt-1 text-lg font-extrabold">{selectedBook.title}</h3><p className="mt-1 text-xs text-on-surface-variant">Status: {selectedBook.status}</p></div><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl border border-outline/20 px-4 py-2.5 text-sm font-bold disabled:opacity-50"><Save size={15} /> Save details</button></div><MetadataFields form={form} setField={setField} /></form>

              <section className="rounded-2xl border border-outline/15 bg-surface p-5 sm:p-7"><div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary-container text-on-secondary-container"><UploadCloud size={19} /></span><div><h3 className="font-extrabold">Publication assets</h3><p className="text-sm text-on-surface-variant">PDF files are private until a publication is explicitly published.</p></div></div><div className="grid gap-4 md:grid-cols-2"><label className="rounded-xl border border-dashed border-outline/30 p-4"><span className="flex items-center gap-2 text-sm font-bold"><FileText size={17} /> Complete book (PDF)</span><span className="mt-1 block text-xs leading-5 text-on-surface-variant">PDF only · maximum 10 MB per upload</span><input type="file" accept="application/pdf,.pdf" onChange={onFile(setCompleteFile)} className="mt-4 block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-surface-variant file:px-3 file:py-2 file:text-xs file:font-bold" /></label><label className="rounded-xl border border-dashed border-outline/30 p-4"><span className="flex items-center gap-2 text-sm font-bold"><ImagePlus size={17} /> Cover image</span><span className="mt-1 block text-xs leading-5 text-on-surface-variant">JPEG, PNG, or WebP · maximum 10 MB</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile(setCoverFile)} className="mt-4 block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-surface-variant file:px-3 file:py-2 file:text-xs file:font-bold" /></label></div><button type="button" onClick={() => void uploadSelectedFiles()} disabled={uploading || (!completeFile && !coverFile)} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-outline/20 px-4 py-3 text-sm font-bold disabled:opacity-50">{uploading ? <LoaderCircle className="animate-spin" size={16} /> : <UploadCloud size={16} />} Upload selected assets</button></section>

              {selectedBook.publication_type !== "complete_file" && <section className="rounded-2xl border border-outline/15 bg-surface p-5 sm:p-7"><div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Chapter editor</p><h3 className="mt-1 text-lg font-extrabold">Build the book chapter by chapter</h3><p className="mt-1 text-sm text-on-surface-variant">Separate paragraphs with a blank line. Structured text is stored as safe text blocks, not executable HTML.</p></div><form onSubmit={addChapter} className="space-y-4"><label className="block text-sm font-bold">Chapter title<input required maxLength={240} value={chapterTitle} onChange={(event) => setChapterTitle(event.target.value)} className="mt-2 w-full rounded-xl border border-outline/20 bg-background px-3 py-3 font-normal outline-none focus:border-primary" /></label><label className="block text-sm font-bold">Short summary (optional)<input maxLength={2000} value={chapterSummary} onChange={(event) => setChapterSummary(event.target.value)} className="mt-2 w-full rounded-xl border border-outline/20 bg-background px-3 py-3 font-normal outline-none focus:border-primary" /></label><label className="block text-sm font-bold">Chapter text<textarea required rows={8} value={chapterText} onChange={(event) => setChapterText(event.target.value)} placeholder="Write the chapter here. Separate paragraphs with a blank line." className="mt-2 w-full rounded-xl border border-outline/20 bg-background px-3 py-3 font-normal leading-6 outline-none focus:border-primary" /></label><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-on-primary disabled:opacity-50">{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />} Add chapter</button></form><div className="mt-6 border-t border-outline/15 pt-5"><h4 className="mb-3 font-extrabold">Chapters ({chapters.length})</h4>{chapters.length === 0 ? <p className="text-sm text-on-surface-variant">No chapters yet.</p> : <ol className="space-y-2">{chapters.map((chapter, index) => <li key={chapter.id} className="flex items-start gap-3 rounded-xl bg-background p-3"><span className="mt-0.5 text-xs font-bold text-primary">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0 flex-1"><p className="text-sm font-bold">{chapter.title}</p><p className="mt-1 text-xs text-on-surface-variant">{chapter.summary || "No summary"} · {chapter.status}</p></div></li>)}</ol>}</div></section>}

              <section className="rounded-2xl border border-outline/15 bg-surface p-5 sm:p-7"><h3 className="font-extrabold">Publication controls</h3><p className="mt-1 text-sm leading-6 text-on-surface-variant">Before publishing, confirm that Finding Astro owns the publication or has permission to distribute it. Published books are visible in the reader library.</p>{selectedBook.status !== "published" && selectedBook.status !== "archived" && <label className="mt-4 flex items-start gap-3 rounded-xl bg-background p-4 text-sm"><input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-primary" /><span>I confirm that Finding Astro has the necessary rights or permission to publish this content.</span></label>}<div className="mt-5 flex flex-wrap gap-3">{selectedBook.status !== "published" && selectedBook.status !== "archived" && <button type="button" disabled={saving || !rightsConfirmed} onClick={() => void publishBook()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-on-primary disabled:opacity-45"><Send size={15} /> Publish</button>}{selectedBook.status === "published" && <button type="button" disabled={saving} onClick={() => void changeStatus("draft")} className="rounded-xl border border-outline/20 px-4 py-3 text-sm font-bold disabled:opacity-50">Unpublish</button>}{selectedBook.status !== "archived" && <button type="button" disabled={saving} onClick={() => void changeStatus("archived")} className="rounded-xl border border-outline/20 px-4 py-3 text-sm font-bold text-error disabled:opacity-50">Archive</button>}{selectedBook.status === "published" && <Link href={`/library/${selectedBook.slug}`} target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-outline/20 px-4 py-3 text-sm font-bold">Preview reader ↗</Link>}</div></section>
            </>}
          </section>
        </div>
      </div>
    </main>
  );
}

function MetadataFields({ form, setField }: { form: typeof emptyForm; setField: (field: keyof typeof emptyForm, value: string) => void }) {
  return <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-bold sm:col-span-2">Title<input required maxLength={240} value={form.title} onChange={(event) => { setField("title", event.target.value); if (!form.slug) setField("slug", slugify(event.target.value)); }} className="mt-2 w-full rounded-xl border border-outline/20 bg-background px-3 py-3 font-normal outline-none focus:border-primary" /></label><label className="block text-sm font-bold">URL slug<input required maxLength={240} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.slug} onChange={(event) => setField("slug", slugify(event.target.value))} className="mt-2 w-full rounded-xl border border-outline/20 bg-background px-3 py-3 font-mono text-sm font-normal outline-none focus:border-primary" /></label><label className="block text-sm font-bold">Author / credited team<input required maxLength={240} value={form.authorName} onChange={(event) => setField("authorName", event.target.value)} className="mt-2 w-full rounded-xl border border-outline/20 bg-background px-3 py-3 font-normal outline-none focus:border-primary" /></label><label className="block text-sm font-bold">Publication type<select value={form.publicationType} onChange={(event) => setField("publicationType", event.target.value)} className="mt-2 w-full rounded-xl border border-outline/20 bg-background px-3 py-3 font-normal"><option value="chapter_based">Chapter-based book</option><option value="complete_file">Complete file (PDF)</option><option value="hybrid">Hybrid (file + chapters)</option></select></label><label className="block text-sm font-bold">Category<input required maxLength={100} value={form.category} onChange={(event) => setField("category", event.target.value)} className="mt-2 w-full rounded-xl border border-outline/20 bg-background px-3 py-3 font-normal outline-none focus:border-primary" /></label><label className="block text-sm font-bold">Language code<input required maxLength={20} minLength={2} value={form.language} onChange={(event) => setField("language", event.target.value)} className="mt-2 w-full rounded-xl border border-outline/20 bg-background px-3 py-3 font-normal outline-none focus:border-primary" /></label><label className="block text-sm font-bold">Subtitle<input maxLength={240} value={form.subtitle} onChange={(event) => setField("subtitle", event.target.value)} className="mt-2 w-full rounded-xl border border-outline/20 bg-background px-3 py-3 font-normal outline-none focus:border-primary" /></label><label className="block text-sm font-bold sm:col-span-2">Description<textarea rows={4} maxLength={12000} value={form.description} onChange={(event) => setField("description", event.target.value)} className="mt-2 w-full rounded-xl border border-outline/20 bg-background px-3 py-3 font-normal leading-6 outline-none focus:border-primary" /></label></div>;
}
