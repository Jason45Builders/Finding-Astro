import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CaseRecord, dashboardApi } from "../services/api";
import { formatDateTime, toTitleCase } from "../utils/format";

const statusOptions = ["open", "in_review", "action_taken", "resolved", "closed"];

const CasesPage = () => {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await dashboardApi.listCases();
      setCases(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load cases.");
    }
  };

  useEffect(() => {
    if (!dashboardApi.getToken() && typeof window !== "undefined") {
      window.location.replace("/login");
      return;
    }

    void load();
  }, []);

  const updateStatus = async (caseId: string, status: string) => {
    try {
      setUpdatingId(caseId);
      await dashboardApi.updateCase(caseId, { status });
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update case.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Case management</p>
          <h1 style={styles.title}>All cases</h1>
        </div>
        <Link href="/dashboard" style={styles.linkButton}>
          Back to dashboard
        </Link>
      </header>

      {error ? <p style={styles.error}>{error}</p> : null}

      <section style={styles.tableCard}>
        {cases.map((item) => (
          <div key={item.id} style={styles.row}>
            <div style={styles.rowInfo}>
              <strong>{item.title}</strong>
              <div style={styles.meta}>
                {toTitleCase(item.caseType)} • Priority {toTitleCase(item.priority)} • Updated {formatDateTime(item.updatedAt)}
              </div>
              <p style={styles.description}>{item.description}</p>
            </div>
            <select
              value={item.status}
              onChange={(event) => void updateStatus(item.id, event.target.value)}
              style={styles.select}
              disabled={updatingId === item.id}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {toTitleCase(status)}
                </option>
              ))}
            </select>
          </div>
        ))}
      </section>
    </main>
  );
};

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#F5F1E8",
    padding: 32,
    color: "#2E2A24"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24
  },
  eyebrow: {
    margin: 0,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: "#A4472A",
    fontWeight: 700,
    fontSize: 12
  },
  title: {
    margin: "8px 0 0",
    fontSize: 34
  },
  linkButton: {
    textDecoration: "none",
    color: "#FFFFFF",
    background: "#D96C3F",
    padding: "12px 16px",
    borderRadius: 12
  },
  error: {
    color: "#B94A48"
  },
  tableCard: {
    background: "#FFFFFF",
    borderRadius: 24,
    padding: 24
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 180px",
    gap: 16,
    alignItems: "center",
    padding: "18px 0",
    borderBottom: "1px solid #EFE7D9"
  },
  rowInfo: {
    display: "grid",
    gap: 6
  },
  meta: {
    color: "#6B6257",
    fontSize: 14
  },
  description: {
    margin: 0,
    color: "#4B4339",
    lineHeight: 1.6
  },
  select: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #D8CCBC"
  }
};

export default CasesPage;
