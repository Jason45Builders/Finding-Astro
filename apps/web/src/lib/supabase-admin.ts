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

export function supabaseAdmin() {
  return getAdminClient();
}

export function supabaseServer() {
  return getServerClient();
}
