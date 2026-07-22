const SUPABASE_URL = "https://opfiqgcxodjwgwndmjpl.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wZmlxZ2N4b2Rqd2d3bmRtanBsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjM5NjUxNCwiZXhwIjoyMDk3OTcyNTE0fQ.Oqo1md47ELv2SnlXGPFzlJJOvQIpvAa6cabraniO81c";

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
  const text = await res.text();
  console.log(`${table}: ${res.status} ${text.slice(0, 100)}`);
  return -1;
}

async function list(table: string, limit = 2) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?select=*&limit=${limit}`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );
  const text = await res.text();
  console.log(`\n${table} (${res.status}):`);
  console.log(text.slice(0, 500));
}

(async () => {
  console.log("=== Checking existing data ===");
  const tables = ["wards", "partner_clinics", "partner_stores", "welfare_orgs", "wildlife_centers", "abc_centres", "legal_aid_providers", "helplines", "animals", "cases"];

  for (const t of tables) {
    const c = await count(t);
    console.log(`${t}: ${c} rows`);
  }

  console.log("\n=== Sample data ===");
  await list("legal_aid_providers", 2);
  await list("wards", 2);
  await list("animals", 2);
})().catch(console.error);
