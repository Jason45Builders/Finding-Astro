import { SignJWT } from "jose";

const SUPABASE_URL = "https://opfiqgcxodjwgwndmjpl.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wZmlxZ2N4b2Rqd2d3bmRtanBsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjM5NjUxNCwiZXhwIjoyMDk3OTcyNTE0fQ.Oqo1md47ELv2SnlXGPFzlJJOvQIpvAa6cabraniO81c";

async function main() {
  const secret = new TextEncoder().encode("change-me-in-prod-use-openssl-rand-hex-32");
  const token = await new SignJWT({
    sub: "00000000-0000-0000-0000-000000000001",
    email: "guest@test.local",
    role: "guest_system",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret);

  const response = await fetch("http://localhost:3000/api/v1/conflict", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      conflictType: "feel_unsafe",
      description: "test audit logging verification",
      location: { latitude: 13.0, longitude: 80.0 },
    }),
  });

  const result = await response.json();
  console.log("Request result:", response.status, JSON.stringify(result, null, 2));

  await new Promise((resolve) => setTimeout(resolve, 1000));

  const auditResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/audit_logs?select=*&order=created_at.desc&limit=5`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );

  const auditData = await auditResponse.json();
  console.log(`\nFound ${Array.isArray(auditData) ? auditData.length : 0} audit log entries:`);
  console.log(JSON.stringify(auditData, null, 2));
}

main().catch(console.error);
