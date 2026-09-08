import { createClient } from "@supabase/supabase-js";



function getAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === "your-project-url") {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured. Please set it in your environment variables.");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY === "your-service-role-key") {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured. Please set it in your environment variables.");
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function getServerClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === "your-project-url") {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured. Please set it in your environment variables.");
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "your-anon-key") {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured. Please set it in your environment variables.");
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// SECURITY NOTE: supabaseAdmin() uses the service role key and bypasses RLS.
// All routes using this client MUST enforce authorization via authMiddleware or
// equivalent server-side checks before performing reads/writes. Never expose
// supabaseAdmin() to client-side code.
export function supabaseAdmin() {
  return getAdminClient();
}

// supabaseServer() respects RLS and is intended for user-scoped queries where
// the caller's JWT is forwarded. Prefer this client for public or user-owned data.
export function supabaseServer() {
  return getServerClient();
}
