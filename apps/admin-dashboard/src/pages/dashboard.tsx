import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AbcEvent, Animal, CaseRecord, dashboardApi } from "../services/api";
import { formatDateTime, toTitleCase } from "../utils/format";

const DashboardPage = () => {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [abcEvents, setAbcEvents] = useState<AbcEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = dashboardApi.getToken();
    if (!token && typeof window !== "undefined") {
      window.location.replace("/login");
      return;
    }

    const load = async () => {
      try {
        const [animalData, caseData, abcData] = await Promise.all([
          dashboardApi.listAnimals(),
          dashboardApi.listCases(),
          dashboardApi.listAbcTracking()
        ]);
        setAnimals(animalData);
        setCases(caseData);
        setAbcEvents(abcData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard.");
      }
    };

    void load();
  }, []);

  const openCases = cases.filter((item) => item.status !== "closed" && item.status !== "resolved").length;
  const lostAnimals = animals.filter((item) => item.status === "lost").length;
  const pendingAbc = abcEvents.filter((item) => item.eventType !== "return").length;

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Operations dashboard</p>
          <h1 style={styles.title}>Finding Astro overview</h1>
        </div>
        <nav style={styles.nav}>
          <Link href="/cases" style={styles.navLink}>
            Cases
          </Link>
          <Link href="/animals" style={styles.navLink}>
            Animals
          </Link>
          <Link href="/abc" style={styles.navLink}>
            ABC
          </Link>
          <button
            style={styles.logoutButton}
            onClick={() => {
              dashboardApi.logout();
              window.location.replace("/login");
            }}
          >
            Logout
          </button>
        </nav>
      </header>

      {error ? <p style={styles.error}>{error}</p> : null}

      <section style={styles.metricGrid}>
        <article style={styles.metricCard}>
          <span style={styles.metricLabel}>Animals tracked</span>
          <strong style={styles.metricValue}>{animals.length}</strong>
        </article>
        <article style={styles.metricCard}>
          <span style={styles.metricLabel}>Open cases</span>
          <strong style={styles.metricValue}>{openCases}</strong>
        </article>
        <article style={styles.metricCard}>
          <span style={styles.metricLabel}>Lost animals</span>
          <strong style={styles.metricValue}>{lostAnimals}</strong>
        </article>
        <article style={styles.metricCard}>
          <span style={styles.metricLabel}>ABC in progress</span>
          <strong style={styles.metricValue}>{pendingAbc}</strong>
        </article>
      </section>

      <section style={styles.columns}>
        <div style={styles.panel}>
          <h2 style={styles.panelTitle}>Recent cases</h2>
          {cases.slice(0, 6).map((item) => (
            <div key={item.id} style={styles.listItem}>
              <div>
                <strong>{item.title}</strong>
                <div style={styles.listMeta}>
                  {toTitleCase(item.caseType)} • {toTitleCase(item.status)}
                </div>
              </div>
              <span style={styles.timeText}>{formatDateTime(item.updatedAt)}</span>
            </div>
          ))}
        </div>

        <div style={styles.panel}>
          <h2 style={styles.panelTitle}>Latest ABC events</h2>
          {abcEvents.slice(0, 6).map((item) => (
            <div key={item.id} style={styles.listItem}>
              <div>
                <strong>{toTitleCase(item.eventType)}</strong>
                <div style={styles.listMeta}>
                  {item.animalName ?? item.animalId.slice(0, 8)} • {item.status}
                </div>
              </div>
              <span style={styles.timeText}>{formatDateTime(item.createdAt)}</span>
            </div>
          ))}
        </div>
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
    alignItems: "flex-start",
    gap: 16,
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
    fontSize: 38
  },
  nav: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap"
  },
  navLink: {
    textDecoration: "none",
    color: "#2E2A24",
    background: "#FFFFFF",
    padding: "10px 14px",
    borderRadius: 12
  },
  logoutButton: {
    border: "none",
    background: "#D96C3F",
    color: "#FFFFFF",
    padding: "10px 14px",
    borderRadius: 12,
    cursor: "pointer"
  },
  error: {
    color: "#B94A48"
  },
  metricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
    marginBottom: 24
  },
  metricCard: {
    background: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    boxShadow: "0 12px 24px rgba(46, 42, 36, 0.08)"
  },
  metricLabel: {
    display: "block",
    color: "#6B6257",
    marginBottom: 8
  },
  metricValue: {
    fontSize: 34
  },
  columns: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 16
  },
  panel: {
    background: "#FFFFFF",
    borderRadius: 24,
    padding: 22
  },
  panelTitle: {
    marginTop: 0,
    marginBottom: 18
  },
  listItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    padding: "14px 0",
    borderBottom: "1px solid #EFE7D9"
  },
  listMeta: {
    marginTop: 4,
    color: "#6B6257",
    fontSize: 14
  },
  timeText: {
    fontSize: 13,
    color: "#6B6257"
  }
};

export default DashboardPage;
