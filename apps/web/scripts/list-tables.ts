const SUPABASE_URL = "https://opfiqgcxodjwgwndmjpl.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wZmlxZ2N4b2Rqd2d3bmRtanBsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjM5NjUxNCwiZXhwIjoyMDk3OTcyNTE0fQ.Oqo1md47ELv2SnlXGPFzlJJOvQIpvAa6cabraniO81c";

(async () => {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/information_schema.tables?select=table_name&table_schema=eq.public`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );
  const text = await res.text();
  console.log(`Status: ${res.status}`);
  console.log(text.slice(0, 3000));
})().catch(console.error);
