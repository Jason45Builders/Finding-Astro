import { supabaseAdmin } from "./supabase-admin";

interface AuditEntry {
  tableName: string;
  recordId: string;
  action: "INSERT" | "UPDATE" | "DELETE" | "APPROVE" | "REJECT";
  actorId: string;
  actorRole: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  sessionVars?: Record<string, unknown>;
}

export async function audit(entry: AuditEntry): Promise<void> {
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
  } catch {
    // non-fatal: audit delivery is best-effort
  }
}
