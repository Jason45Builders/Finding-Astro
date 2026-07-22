import { supabaseAdmin } from "../src/lib/supabase-admin";

async function checkAuditLogs() {
  const { data, error } = await supabaseAdmin()
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  console.log(`Found ${data?.length ?? 0} audit log entries:`);
  console.log(JSON.stringify(data, null, 2));
}

checkAuditLogs();
