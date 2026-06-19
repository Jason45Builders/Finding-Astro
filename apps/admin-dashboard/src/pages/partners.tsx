import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { dashboardApi, Partner, PartnerType } from "../services/api";

const partnerTypes: PartnerType[] = ["clinic", "store", "ngo", "helpline", "abc_centre", "wildlife_centre"];

const PartnersPage = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [type, setType] = useState<PartnerType | "">("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await dashboardApi.listPartners(type || undefined);
      setPartners(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load partners.");
    }
  };

  useEffect(() => {
    if (!dashboardApi.getToken() && typeof window !== "undefined") {
      window.location.replace("/login");
      return;
    }
    void load();
  }, [type]);

  const verify = async (partnerId: string, status: "approved" | "rejected") => {
    try {
      setBusyId(partnerId);
      await dashboardApi.updatePartnerStatus(partnerId, status);
      await load();
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Unable to update partner.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Layout>
      <main style={styles.page}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Partners</p>
            <h1 style={styles.title}>Clinics, stores, NGOs, helplines</h1>
          </div>
          <select value={type} onChange={(event) => setType(event.target.value as PartnerType | "")} style={styles.select}>
            <option value="">All partners</option>
            {partnerTypes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </header>
        {error ? <p style={styles.error}>{error}</p> : null}
        <section style={styles.grid}>
          {partners.map((item) => (
            <article key={item.id} style={styles.card}>
              <div>
                <strong style={styles.name}>{item.name}</strong>
                <div style={styles.meta}>{item.type} • {item.verificationStatus}</div>
                <div style={styles.meta}>{item.address ?? item.phone ?? "No address"}</div>
                {item.services?.length ? <div style={styles.meta}>{item.services.join(", ")}</div> : null}
              </div>
              <div style={styles.actions}>
                <button style={styles.approve} disabled={busyId === item.id} onClick={() => void verify(item.id, "approved")}>Approve</button>
                <button style={styles.reject} disabled={busyId === item.id} onClick={() => void verify(item.id, "rejected")}>Reject</button>
              </div>
            </article>
          ))}
        </section>
      </main>
    </Layout>
  );
};

const styles: Record<string, CSSProperties> = {
  page: { padding: 32, color: "#2E2A24" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  eyebrow: { margin: 0, color: "#A4472A", fontWeight: 700, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" },
  title: { margin: "8px 0 0", fontSize: 36 },
  error: { color: "#B94A48" },
  select: { padding: "10px 12px", borderRadius: 12, border: "1px solid #D8CCBC" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 },
  card: { background: "#FFFFFF", borderRadius: 24, padding: 20, display: "grid", gap: 16 },
  name: { display: "block", fontSize: 18 },
  meta: { color: "#6B6257", fontSize: 13, marginTop: 5 },
  actions: { display: "flex", gap: 10 },
  approve: { border: 0, borderRadius: 12, padding: "10px 14px", background: "#1E7B68", color: "#FFFFFF", fontWeight: 700, cursor: "pointer" },
  reject: { border: 0, borderRadius: 12, padding: "10px 14px", background: "#B94A48", color: "#FFFFFF", fontWeight: 700, cursor: "pointer" }
};

export default PartnersPage;
