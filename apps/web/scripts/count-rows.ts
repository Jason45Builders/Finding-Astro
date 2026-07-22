const SUPABASE_URL = "https://opfiqgcxodjwgwndmjpl.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wZmlxZ2N4b2Rqd2d3bmRtanBsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjM5NjUxNCwiZXhwIjoyMDk3OTcyNTE0fQ.Oqo1md47ELv2SnlXGPFzlJJOvQIpvAa6cabraniO81c";

const TABLES = [
  "users", "animals", "cases", "abc_events", "notifications", "funding_cases",
  "funding_transactions", "transport_requests", "partner_clinics", "partner_stores",
  "welfare_orgs", "helplines", "abc_centres", "wildlife_centers",
  "wildlife_species_categories", "behaviour_guidance_cards", "safety_reports",
  "safe_awareness_zones", "qr_codes", "public_outcomes", "case_events",
  "adoption_applications", "csr_sponsors", "recovery_funding", "feeding_points",
  "legal_aid_providers", "audit_logs", "education_content"
];

async function count(table: string): Promise<number> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?select=count`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: "count=exact",
      },
    }
  );
  const countHeader = res.headers.get("content-range") || res.headers.get("x-total-count");
  if (countHeader) {
    const match = countHeader.match(/\/(\d+)$/);
    if (match) return parseInt(match[1]);
  }
  return -1;
}

(async () => {
  console.log("=== Table row counts ===");
  for (const t of TABLES) {
    try {
      const c = await count(t);
      console.log(`${t}: ${c} rows`);
    } catch (e) {
      console.log(`${t}: ERROR - ${(e as Error).message}`);
    }
  }
})().catch(console.error);
