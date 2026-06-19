import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Box, CircularProgress } from "@mui/material";
import { dashboardApi } from "../services/api";

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const token = dashboardApi.getToken();
    if (!token) {
      router.replace("/login");
    } else {
      setAuthed(true);
    }
    setChecking(false);
  }, [router]);

  if (checking) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#F5F1E8" }}>
        <CircularProgress sx={{ color: "#D96C3F" }} />
      </Box>
    );
  }

  if (!authed) return null;
  return <>{children}</>;
};
