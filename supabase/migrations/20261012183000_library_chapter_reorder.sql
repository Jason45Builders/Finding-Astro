-- Atomic chapter reordering for Finding Astro Library.
-- The function is intentionally executable only by service_role; API routes must
-- verify the current app JWT and admin role before calling it.

BEGIN;

CREATE OR REPLACE FUNCTION public.reorder_library_chapters(
  p_book_id UUID,
  p_chapter_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  chapter_count INTEGER;
  current_max INTEGER;
  idx INTEGER;
BEGIN
  PERFORM 1 FROM public.library_books WHERE id = p_book_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOK_NOT_FOUND';
  END IF;

  SELECT COUNT(*), COALESCE(MAX(sort_order), -1)
    INTO chapter_count, current_max
    FROM public.library_chapters
    WHERE book_id = p_book_id;

  IF COALESCE(array_length(p_chapter_ids, 1), 0) <> chapter_count THEN
    RAISE EXCEPTION 'CHAPTER_LIST_MISMATCH';
  END IF;

  IF (SELECT COUNT(DISTINCT submitted.id) FROM unnest(p_chapter_ids) AS submitted(id)) <> chapter_count THEN
    RAISE EXCEPTION 'DUPLICATE_CHAPTER_ID';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_chapter_ids) AS submitted(id)
    LEFT JOIN public.library_chapters AS chapter
      ON chapter.id = submitted.id AND chapter.book_id = p_book_id
    WHERE chapter.id IS NULL
  ) THEN
    RAISE EXCEPTION 'CHAPTER_LIST_MISMATCH';
  END IF;

  IF chapter_count = 0 THEN
    RETURN;
  END IF;

  -- Move every chapter to a unique temporary range before assigning 0..N-1.
  -- This avoids collisions with the UNIQUE(book_id, sort_order) constraint.
  FOR idx IN 1..chapter_count LOOP
    UPDATE public.library_chapters
      SET sort_order = current_max + chapter_count + idx,
          updated_at = NOW()
      WHERE id = p_chapter_ids[idx] AND book_id = p_book_id;
  END LOOP;

  FOR idx IN 1..chapter_count LOOP
    UPDATE public.library_chapters
      SET sort_order = idx - 1,
          updated_at = NOW()
      WHERE id = p_chapter_ids[idx] AND book_id = p_book_id;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_library_chapters(UUID, UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reorder_library_chapters(UUID, UUID[]) FROM anon;
REVOKE ALL ON FUNCTION public.reorder_library_chapters(UUID, UUID[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_library_chapters(UUID, UUID[]) TO service_role;

COMMIT;
