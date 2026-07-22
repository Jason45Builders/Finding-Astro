require("dotenv").config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("URL:", url);
console.log("Key present:", !!key);
console.log("Node version:", process.version);

if (!url || !key) {
  console.error("MISSING ENV VAR — aborting");
  process.exit(1);
}

// Patch WebSocket BEFORE importing supabase-js
try {
  const ws = require("ws");
  globalThis.WebSocket = ws;
  console.log("Patched globalThis.WebSocket with ws");
} catch (e) {
  console.log("ws not available for patch:", (e instanceof Error ? e.message : String(e)));
}

const { createClient } = require("@supabase/supabase-js");

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

(async () => {
  const start = Date.now();
  try {
    console.log("\nCalling supabaseAdmin().from('users').select('id').limit(1)...");
    const { data, error } = await admin.from("users").select("id").limit(1);
    const latency = Date.now() - start;
    console.log("Latency:", latency, "ms");
    console.log("Data:", JSON.stringify(data, null, 2));
    console.log("Error:", JSON.stringify(error, null, 2));
  } catch (e) {
    const latency = Date.now() - start;
    console.log("\nTHREW after", latency, "ms");
    console.log("Error type:", e && e.constructor && e.constructor.name);
    console.log("Error message:", e && e.message);
    console.log("Stack (first 1000 chars):");
    console.log((e && e.stack || "").slice(0, 1000));
  }
})().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
