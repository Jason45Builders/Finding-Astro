import { supabaseAdmin } from "./supabase-admin";

interface AuditEntry {
  tableName: string;
  recordId: string;
  action: "INSERT" | "UPDATE" | "DELETE" | "APPROVE" | "REJECT" | "LOGIN_FAILED";
  actorId: string;
  actorRole: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  sessionVars?: Record<string, unknown>;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function audit(entry: AuditEntry): Promise<void> {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await supabaseAdmin().from("audit_logs").insert({
        table_name: entry.tableName,
        record_id: entry.recordId,
        action: entry.action,
        actor_id: entry.actorId,
        actor_role: entry.actorRole,
        old_data: entry.oldData ?? null,
        new_data: entry.newData ?? null,
        session_vars: entry.sessionVars ?? {},
      });
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        console.error(`[audit] Failed after ${maxAttempts} attempts:`, error);
      } else {
        await sleep(200 * attempt);
      }
    }
  }
}
