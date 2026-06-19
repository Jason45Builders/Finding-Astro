import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AbcEvent, dashboardApi } from "../services/api";
import { formatDateTime, toTitleCase } from "../utils/format";

const AbcPage = () => {
  const [events, setEvents] = useState<AbcEvent[]>([]);
  const [animalId, setAnimalId] = useState("");
  const [caseId, setCaseId] = useState("");
  const [eventType, setEventType] = useState<"capture" | "surgery" | "return">("capture");
  const [status, setStatus] = useState("scheduled");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setEvents(await dashboardApi.listAbcTracking());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load ABC tracking.");
    }
  };

  useEffect(() => {
    if (!dashboardApi.getToken() && typeof window !== "undefined") {
      window.location.replace("/login");
      return;
    }

    void load();
  }, []);

  const submit = async () => {
    setLoading(true);
    setError(null);

    try {
      await dashboardApi.logAbcEvent({
        animalId,
        caseId: caseId || null,
        eventType,
        status,
        notes: notes || null,
        location: {
          latitude: 12.9716,
          longitude: 77.5946
        }
      });

      setAnimalId("");
      setCaseId("");
      setStatus("scheduled");
      setNotes("");
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to log ABC event.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>ABC tracking</p>
          <h1 style={styles.title}>Capture, surgery, and return</h1>
        </div>
        <Link href="/dashboard" style={styles.linkButton}>
          Back to dashboard
        </Link>
      </header>

      {error ? <p style={styles.error}>{error}</p> : null}

      <section style={styles.layout}>
        <div style={styles.formCard}>
          <h2 style={styles.sectionTitle}>Log a new ABC event</h2>
          <input value={animalId} onChange={(event) => setAnimalId(event.target.value)} placeholder="Animal ID" style={styles.input} />
          <input value={caseId} onChange={(event) => setCaseId(event.target.value)} placeholder="Case ID (optional)" style={styles.input} />
          <select value={eventType} onChange={(event) => setEventType(event.target.value as typeof eventType)} style={styles.input}>
            <option value="capture">Capture</option>
            <option value="surgery">Surgery</option>
            <option value="return">Return</option>
          </select>
          <input value={status} onChange={(event) => setStatus(event.target.value)} placeholder="Status" style={styles.input} />
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes" style={styles.textArea} />
          <button onClick={() => void submit()} style={styles.primaryButton} disabled={loading}>
            {loading ? "Saving..." : "Log event"}
          </button>
        </div>

        <div style={styles.listCard}>
          <h2 style={styles.sectionTitle}>Recent timeline</h2>
          {events.map((item) => (
            <div key={item.id} style={styles.listItem}>
              <div>
                <strong>{toTitleCase(item.eventType)}</strong>
                <div style={styles.meta}>
                  {item.animalName ?? item.animalId.slice(0, 8)} • {item.status}
                </div>
              </div>
              <div style={styles.meta}>
                <div>{item.geoValidated ? "Geo validated" : "Needs geo review"}</div>
                <div>{formatDateTime(item.createdAt)}</div>
              </div>
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
  layout: {
    display: "grid",
    gridTemplateColumns: "minmax(320px, 420px) 1fr",
    gap: 18
  },
  formCard: {
    background: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    display: "grid",
    gap: 12
  },
  listCard: {
    background: "#FFFFFF",
    borderRadius: 24,
    padding: 24
  },
  sectionTitle: {
    marginTop: 0
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 14,
    border: "1px solid #D8CCBC",
    background: "#F8F4EC",
    fontSize: 14
  },
  textArea: {
    minHeight: 110,
    width: "100%",
    padding: "14px 16px",
    borderRadius: 14,
    border: "1px solid #D8CCBC",
    background: "#F8F4EC",
    fontSize: 14,
    resize: "vertical"
  },
  primaryButton: {
    border: "none",
    background: "#D96C3F",
    color: "#FFFFFF",
    borderRadius: 14,
    padding: "14px 18px",
    fontWeight: 700,
    cursor: "pointer"
  },
  listItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "14px 0",
    borderBottom: "1px solid #EFE7D9"
  },
  meta: {
    color: "#6B6257",
    fontSize: 14,
    lineHeight: 1.5
  }
};

export default AbcPage;
