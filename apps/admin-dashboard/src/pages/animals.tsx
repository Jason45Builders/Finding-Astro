import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Animal, dashboardApi } from "../services/api";
import { formatDateTime, toTitleCase } from "../utils/format";

const AnimalsPage = () => {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dashboardApi.getToken() && typeof window !== "undefined") {
      window.location.replace("/login");
      return;
    }

    const load = async () => {
      try {
        setAnimals(await dashboardApi.listAnimals());
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load animals.");
      }
    };

    void load();
  }, []);

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Animal memory</p>
          <h1 style={styles.title}>Animal records</h1>
        </div>
        <Link href="/dashboard" style={styles.linkButton}>
          Back to dashboard
        </Link>
      </header>

      {error ? <p style={styles.error}>{error}</p> : null}

      <section style={styles.grid}>
        {animals.map((animal) => (
          <article key={animal.id} style={styles.card}>
            <div style={styles.status}>{toTitleCase(animal.status)}</div>
            <h2 style={styles.cardTitle}>{animal.name ?? animal.species}</h2>
            <p style={styles.cardMeta}>
              {animal.species} {animal.breed ? `• ${animal.breed}` : ""}
            </p>
            <p style={styles.cardMeta}>Color: {animal.color ?? "Unknown"}</p>
            <p style={styles.cardMeta}>Last seen: {animal.lastSeenText ?? "No note available"}</p>
            <p style={styles.cardMeta}>
              Location: {animal.location.latitude.toFixed(4)}, {animal.location.longitude.toFixed(4)}
            </p>
            <p style={styles.cardMeta}>Updated {formatDateTime(animal.updatedAt)}</p>
          </article>
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
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 16
  },
  card: {
    background: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    boxShadow: "0 12px 24px rgba(46, 42, 36, 0.08)"
  },
  status: {
    display: "inline-flex",
    alignSelf: "flex-start",
    background: "#EFE7D9",
    color: "#A4472A",
    padding: "8px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700
  },
  cardTitle: {
    margin: "14px 0 8px"
  },
  cardMeta: {
    margin: "6px 0",
    color: "#6B6257",
    lineHeight: 1.6
  }
};

export default AnimalsPage;
