import type { CSSProperties } from "react";
import { useState } from "react";
import { dashboardApi } from "../services/api";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      await dashboardApi.login(email, password);
      window.location.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to log in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <p style={styles.eyebrow}>Ops access</p>
        <h1 style={styles.title}>Finding Astro Dashboard Login</h1>
        <p style={styles.subtitle}>
          Email/password access for NGO, municipal, and admin workflows.
        </p>

        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email address"
          style={styles.input}
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          style={styles.input}
        />

        <button onClick={() => void handleSubmit()} style={styles.primaryButton} disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        {error ? <p style={styles.error}>{error}</p> : null}
      </section>
    </main>
  );
};

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(160deg, #F5F1E8 0%, #F0E4D2 100%)",
    padding: 24
  },
  card: {
    width: "100%",
    maxWidth: 520,
    background: "#FFFFFF",
    borderRadius: 28,
    padding: 36,
    display: "grid",
    gap: 14,
    boxShadow: "0 24px 60px rgba(46, 42, 36, 0.12)"
  },
  eyebrow: {
    margin: 0,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontWeight: 700,
    color: "#A4472A",
    fontSize: 12
  },
  title: {
    margin: 0,
    fontSize: 34,
    color: "#2E2A24"
  },
  subtitle: {
    margin: 0,
    color: "#6B6257",
    lineHeight: 1.6
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 14,
    border: "1px solid #D8CCBC",
    background: "#F8F4EC",
    color: "#2E2A24",
    fontSize: 15
  },
  error: {
    margin: 0,
    color: "#B94A48"
  }
};

export default LoginPage;
