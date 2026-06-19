import type { CSSProperties } from "react";
import { useEffect } from "react";
import Link from "next/link";
import { dashboardApi } from "../services/api";

const IndexPage = () => {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const token = dashboardApi.getToken();
    window.location.replace(token ? "/dashboard" : "/login");
  }, []);

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <p style={styles.eyebrow}>Finding Astro</p>
        <h1 style={styles.title}>Admin dashboard</h1>
        <p style={styles.subtitle}>
          This workspace supports NGO and government workflows for cases, animal memory, and ABC tracking.
        </p>
        <div style={styles.actions}>
          <Link href="/login" style={styles.primaryButton}>
            Login
          </Link>
          <Link href="/dashboard" style={styles.secondaryButton}>
            Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
};

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(180deg, #F5F1E8 0%, #E9E0CF 100%)",
    padding: 24
  },
  card: {
    maxWidth: 720,
    background: "#FFFFFF",
    borderRadius: 28,
    padding: 40,
    boxShadow: "0 24px 60px rgba(46, 42, 36, 0.12)"
  },
  eyebrow: {
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: "#A4472A",
    fontSize: 12,
    fontWeight: 700
  },
  title: {
    fontSize: 42,
    margin: "10px 0 12px",
    color: "#2E2A24"
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 1.6,
    color: "#6B6257"
  },
  actions: {
    display: "flex",
    gap: 12,
    marginTop: 28
  },
  primaryButton: {
    background: "#D96C3F",
    color: "#FFFFFF",
    padding: "14px 20px",
    borderRadius: 14,
    textDecoration: "none",
    fontWeight: 700
  },
  secondaryButton: {
    background: "#EFE7D9",
    color: "#2E2A24",
    padding: "14px 20px",
    borderRadius: 14,
    textDecoration: "none",
    fontWeight: 700
  }
};

export default IndexPage;
