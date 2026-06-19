import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { dashboardApi, FundingCase, ReimbursementRequest, Transaction } from "../services/api";
import { formatCurrency, formatDateTime } from "../utils/format";

const FundingPage = () => {
  const [fundingCases, setFundingCases] = useState<FundingCase[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reimbursements, setReimbursements] = useState<ReimbursementRequest[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const [cases, reimbursementsData] = await Promise.all([dashboardApi.listFundingCases(), dashboardApi.listReimbursements()]);
      setFundingCases(cases);
      setReimbursements(reimbursementsData);
      if (!selectedCaseId && cases[0]) setSelectedCaseId(cases[0].id);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load funding.");
    }
  };

  useEffect(() => {
    if (!dashboardApi.getToken() && typeof window !== "undefined") {
      window.location.replace("/login");
      return;
    }
    void load();
  }, []);

  useEffect(() => {
    if (!selectedCaseId) return;
    dashboardApi.listFundingTransactions(selectedCaseId)
      .then(setTransactions)
      .catch(() => setTransactions([]));
  }, [selectedCaseId]);

  const releasePayout = async (caseId: string) => {
    try {
      setBusyId(caseId);
      await dashboardApi.releasePayout(caseId);
      await load();
    } catch (releaseError) {
      setError(releaseError instanceof Error ? releaseError.message : "Unable to release payout.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Layout>
      <main style={styles.page}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Funding</p>
            <h1 style={styles.title}>Donations, reimbursements, and payouts</h1>
          </div>
        </header>
        {error ? <p style={styles.error}>{error}</p> : null}
        <section style={styles.grid}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Funding cases</h2>
            {fundingCases.map((item) => (
              <div key={item.id} style={styles.row}>
                <button style={styles.caseButton} onClick={() => setSelectedCaseId(item.id)}>
                  <strong>{item.caseId ?? item.id}</strong>
                  <span>{item.fundingType} • {formatCurrency(item.raisedAmount)} / {formatCurrency(item.totalAmount)}</span>
                </button>
                <button style={styles.button} disabled={busyId === item.id} onClick={() => void releasePayout(item.id)}>
                  {busyId === item.id ? "Releasing..." : "Release payout"}
                </button>
              </div>
            ))}
          </div>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Transactions</h2>
            {transactions.map((item) => (
              <div key={item.id} style={styles.listItem}>
                <div>
                  <strong>{formatCurrency(item.amount)}</strong>
                  <div style={styles.meta}>{item.status} • {formatDateTime(item.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ ...styles.card, gridColumn: "1 / -1" }}>
            <h2 style={styles.cardTitle}>Reimbursement requests</h2>
            {reimbursements.map((item) => (
              <div key={item.id} style={styles.row}>
                <div>
                  <strong>{item.requesterName ?? item.requesterUserId}</strong>
                  <div style={styles.meta}>{formatCurrency(item.amount)} • {item.status} • hospital verified: {item.hospitalVerified ? "yes" : "no"}</div>
                </div>
                <div style={styles.meta}>{formatDateTime(item.createdAt)}</div>
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
  grid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 20 },
  card: { background: "#FFFFFF", borderRadius: 24, padding: 22 },
  cardTitle: { marginTop: 0, marginBottom: 18 },
  row: { display: "grid", gridTemplateColumns: "1fr 160px", gap: 14, alignItems: "center", padding: "14px 0", borderBottom: "1px solid #EFE7D9" },
  caseButton: { border: 0, background: "transparent", textAlign: "left", cursor: "pointer", display: "grid", gap: 5 },
  meta: { color: "#6B6257", fontSize: 13 },
  button: { border: 0, borderRadius: 12, padding: "10px 14px", background: "#D96C3F", color: "#FFFFFF", fontWeight: 700, cursor: "pointer" },
  listItem: { padding: "14px 0", borderBottom: "1px solid #EFE7D9" }
};

export default FundingPage;
