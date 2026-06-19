import type { CSSProperties } from "react";
import { useState } from "react";
import { dashboardApi } from "../services/api";

const LoginPage = () => {
  const [fullName, setFullName] = useState("Blue Paws Coordinator");
  const [phone, setPhone] = useState("+919999000002");
  const [code, setCode] = useState("");
  const [requestedPhone, setRequestedPhone] = useState<string | null>(null);
  const [mockCode, setMockCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestOtp = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await dashboardApi.requestOtp(phone, fullName);
      setRequestedPhone(result.phone);
      setMockCode(result.code ?? null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to request OTP.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    setError(null);

    try {
      await dashboardApi.verifyOtp(requestedPhone ?? phone, code);
      window.location.replace("/dashboard");
    } catch (verificationError) {
      setError(
        verificationError instanceof Error ? verificationError.message : "Unable to verify OTP."
      );
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
          OTP-based access for NGO, municipal, and admin workflows.
        </p>

        {!requestedPhone ? (
          <>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Full name"
              style={styles.input}
            />
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Phone number"
              style={styles.input}
            />
            <button onClick={() => void requestOtp()} style={styles.primaryButton} disabled={loading}>
              {loading ? "Sending..." : "Request OTP"}
            </button>
          </>
        ) : (
          <>
            <div style={styles.notice}>
              <strong>Code sent to:</strong> {requestedPhone}
              {mockCode ? <div>Mock OTP: {mockCode}</div> : null}
            </div>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="6-digit OTP"
              style={styles.input}
            />
            <button onClick={() => void verifyOtp()} style={styles.primaryButton} disabled={loading}>
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </>
        )}

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
  notice: {
    background: "#EFE7D9",
    borderRadius: 14,
    padding: 14,
    color: "#2E2A24",
    lineHeight: 1.6
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
  error: {
    margin: 0,
    color: "#B94A48"
  }
};

export default LoginPage;
