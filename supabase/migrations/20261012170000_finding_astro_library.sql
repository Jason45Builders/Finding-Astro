-- Finding Astro Library foundation
-- Additive migration: publication metadata, chapters, and per-user reading progress.
-- Binary assets stay in Supabase Storage; only storage object paths are stored here.
-- App API currently uses the service-role client, so every new API handler MUST
-- enforce the app's JWT/admin authorization before using these tables.

BEGIN;

CREATE TABLE IF NOT EXISTS public.library_books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 240),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  subtitle TEXT,
  description TEXT NOT NULL DEFAULT '',
  author_name TEXT NOT NULL DEFAULT 'Finding Astro Team',
  publication_type TEXT NOT NULL CHECK (publication_type IN ('complete_file', 'chapter_based', 'hybrid')),
  category TEXT NOT NULL DEFAULT 'Finding Astro Publications',
  language TEXT NOT NULL DEFAULT 'en',
  cover_storage_path TEXT,
  primary_file_storage_path TEXT,
  primary_file_format TEXT CHECK (primary_file_format IS NULL OR primary_file_format IN ('pdf', 'epub')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  rights_confirmed_at TIMESTAMPTZ,
  rights_confirmed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT library_books_complete_file_check
    CHECK (publication_type <> 'complete_file' OR primary_file_storage_path IS NOT NULL OR status <> 'published'),
  CONSTRAINT library_books_rights_check
    CHECK (status <> 'published' OR rights_confirmed_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_library_books_status_published
  ON public.library_books(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_library_books_category_language
  ON public.library_books(category, language);
CREATE INDEX IF NOT EXISTS idx_library_books_featured
  ON public.library_books(is_featured) WHERE is_featured = TRUE;

CREATE TABLE IF NOT EXISTS public.library_chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID NOT NULL REFERENCES public.library_books(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 240),
  summary TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
  content_format TEXT NOT NULL CHECK (content_format IN ('rich_text', 'pdf', 'epub')),
  content_body JSONB,
  storage_path TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT library_chapters_content_check CHECK (
    (content_format = 'rich_text' AND content_body IS NOT NULL)
    OR (content_format IN ('pdf', 'epub') AND storage_path IS NOT NULL)
  ),
  CONSTRAINT library_chapters_order_unique UNIQUE (book_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_library_chapters_book_status_order
  ON public.library_chapters(book_id, status, sort_order);

CREATE TABLE IF NOT EXISTS public.library_reading_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.library_books(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.library_chapters(id) ON DELETE SET NULL,
  position JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT library_reading_progress_user_book_unique UNIQUE (user_id, book_id)
);

CREATE INDEX IF NOT EXISTS idx_library_reading_progress_user_updated
  ON public.library_reading_progress(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_library_reading_progress_book
  ON public.library_reading_progress(book_id);

-- RLS is enabled as a fail-closed default. The existing app currently uses a
-- server-side service-role client (which bypasses RLS); new routes must therefore
-- enforce JWT identity and admin/owner checks before querying or mutating these
-- tables. Do not expose a service-role client to browser code.
ALTER TABLE public.library_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_reading_progress ENABLE ROW LEVEL SECURITY;

COMMIT;
