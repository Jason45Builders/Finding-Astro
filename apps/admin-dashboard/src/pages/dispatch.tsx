import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { CaseRecord, dashboardApi, Responder } from "../services/api";

const DispatchPage = () => {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [selectedResponder, setSelectedResponder] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const [caseData, responderData] = await Promise.all([dashboardApi.listCases(), dashboardApi.listResponders()]);
      setCases(caseData.filter((item) => !["resolved", "closed"].includes(item.status)));
      setResponders(responderData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load dispatch data.");
    }
  };

  useEffect(() => {
    if (!dashboardApi.getToken() && typeof window !== "undefined") {
      window.location.replace("/login");
      return;
    }
    void load();
  }, []);

  const assign = async (caseId: string) => {
    const responderId = selectedResponder[caseId];
    if (!responderId) return;
    try {
      setBusyId(caseId);
      await dashboardApi.assignCase(caseId, responderId);
      await load();
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : "Unable to assign case.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Layout>
      <main style={styles.page}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Dispatch</p>
            <h1 style={styles.title}>Responder assignment</h1>
          </div>
        </header>
        {error ? <p style={styles.error}>{error}</p> : null}
        <section style={styles.grid}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Open cases</h2>
            {cases.map((item) => (
              <div key={item.id} style={styles.row}>
                <div>
                  <strong>{item.title}</strong>
                  <div style={styles.meta}>{item.caseType} • {item.priority} • {item.locationText ?? "No location notes"}</div>
                  <p style={styles.description}>{item.description}</p>
                </div>
                <div style={styles.actions}>
                  <select
                    value={selectedResponder[item.id] ?? ""}
                    onChange={(event) => setSelectedResponder({ ...selectedResponder, [item.id]: event.target.value })}
                    style={styles.select}
                  >
                    <option value="">Select responder</option>
                    {responders.map((responder) => (
                      <option key={responder.id} value={responder.id}>
                        {responder.fullName ?? responder.phone} — rep {responder.reputation}
                      </option>
                    ))}
                  </select>
                  <button style={styles.button} disabled={!selectedResponder[item.id] || busyId === item.id} onClick={() => void assign(item.id)}>
                    {busyId === item.id ? "Assigning..." : "Assign"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Available responders</h2>
            {responders.map((responder) => (
              <div key={responder.id} style={styles.responder}>
                <strong>{responder.fullName ?? responder.phone}</strong>
                <div style={styles.meta}>{responder.role} • completed {responder.totalCasesCompleted} • active {responder.activeCaseCount}</div>
                <div style={styles.meta}>Reputation {responder.reputation} • tier {responder.tier}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </Layout>
  );
};

const styles: Record<string, CSSProperties> = {
  page: { padding: 32, color: "#2E2A24" },
  header: { marginBottom: 24 },
  eyebrow: { margin: 0, color: "#A4472A", fontWeight: 700, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" },
  title: { margin: "8px 0 0", fontSize: 36 },
  error: { color: "#B94A48" },
  grid: { display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(320px, 0.6fr)", gap: 20 },
  card: { background: "#FFFFFF", borderRadius: 24, padding: 22 },
  cardTitle: { marginTop: 0, marginBottom: 18 },
  row: { display: "grid", gridTemplateColumns: "1fr 260px", gap: 18, alignItems: "center", padding: "18px 0", borderBottom: "1px solid #EFE7D9" },
  meta: { color: "#6B6257", fontSize: 13, marginTop: 5 },
  description: { color: "#4B4339", lineHeight: 1.55, margin: "8px 0 0" },
  actions: { display: "grid", gap: 10 },
  select: { padding: "10px 12px", borderRadius: 12, border: "1px solid #D8CCBC" },
  button: { border: 0, borderRadius: 12, padding: "10px 14px", background: "#D96C3F", color: "#FFFFFF", fontWeight: 700, cursor: "pointer" },
  responder: { padding: "14px 0", borderBottom: "1px solid #EFE7D9" }
};

export default DispatchPage;
