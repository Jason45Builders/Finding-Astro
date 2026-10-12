-- Rehoming submissions are accessed through authenticated server routes that
-- perform application-role checks. Do not expose the custom-user records through
-- Supabase Data API policies that depend on auth.uid().
REVOKE ALL ON TABLE public.rehome_requests FROM anon, authenticated;
DROP POLICY IF EXISTS "Applicants can read own rehome requests" ON public.rehome_requests;
DROP POLICY IF EXISTS "Applicants can submit own rehome requests" ON public.rehome_requests;
GRANT ALL ON TABLE public.rehome_requests TO service_role;
ALTER TABLE public.rehome_requests ENABLE ROW LEVEL SECURITY;
