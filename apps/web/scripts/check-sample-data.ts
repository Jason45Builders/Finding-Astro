const SUPABASE_URL = "https://opfiqgcxodjwgwndmjpl.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wZmlxZ2N4b2Rqd2d3bmRtanBsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjM5NjUxNCwiZXhwIjoyMDk3OTcyNTE0fQ.Oqo1md47ELv2SnlXGPFzlJJOvQIpvAa6cabraniO81c";

async function list(table: string) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?select=*&limit=10`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );
  const text = await res.text();
  console.log(`\n${table} (${res.status}, count: ${text.length} chars):`);
  console.log(text.slice(0, 800));
}

(async () => {
  await list("helplines");
  await list("safe_awareness_zones");
  await list("legal_aid_providers");
  await list("cases");
  await list("partners");
})().catch(console.error);
