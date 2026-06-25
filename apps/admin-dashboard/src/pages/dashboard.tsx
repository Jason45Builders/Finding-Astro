import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Chip
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import Layout from "../components/Layout";
import {
  dashboardApi,
  Animal,
  CaseRecord,
  AbcEvent,
  AlertNotification,
  MonthlyResolvedCases
} from "../services/api";
import { formatDateTime, toTitleCase } from "../utils/format";

export default function DashboardPage() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [abcEvents, setAbcEvents] = useState<AbcEvent[]>([]);
  const [alerts, setAlerts] = useState<AlertNotification[]>([]);
  const [monthlyCases, setMonthlyCases] = useState<MonthlyResolvedCases[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dashboardApi.getToken() && typeof window !== "undefined") {
      window.location.replace("/login");
      return;
    }

    const loadData = async () => {
      try {
        const [animalData, caseData, abcData, alertData, monthlyData] = await Promise.all([
          dashboardApi.listAnimals(),
          dashboardApi.listCases(),
          dashboardApi.listAbcTracking(),
          dashboardApi.listAlerts().catch(() => [] as AlertNotification[]),
          dashboardApi.monthlyResolvedCases().catch(() => [] as MonthlyResolvedCases[])
        ]);
        setAnimals(animalData);
        setCases(caseData);
        setAbcEvents(abcData);
        setAlerts(alertData);
        setMonthlyCases(monthlyData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  const openCases = cases.filter((item) => item.status !== "closed" && item.status !== "resolved").length;
  const lostAnimals = animals.filter((item) => item.status === "lost").length;
  const pendingAbc = abcEvents.filter((item) => item.eventType !== "return").length;

  const severityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "error";
      case "warning":
        return "warning";
      default:
        return "info";
    }
  };

  return (
    <Layout>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Box>
          <Typography variant="caption" sx={{ textTransform: "uppercase", letterSpacing: 1.5, color: "#A4472A", fontWeight: 700 }}>
            Operations Dashboard
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: "#2E2A24" }}>
            Finding Astro Overview
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        {/* Metrics Grid */}
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 4, boxShadow: "0 12px 24px rgba(46, 42, 36, 0.05)" }}>
              <CardContent>
                <Typography color="textSecondary" variant="subtitle2" gutterBottom>
                  Animals Tracked
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {animals.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 4, boxShadow: "0 12px 24px rgba(46, 42, 36, 0.05)" }}>
              <CardContent>
                <Typography color="textSecondary" variant="subtitle2" gutterBottom>
                  Open Cases
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "#D96C3F" }}>
                  {openCases}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 4, boxShadow: "0 12px 24px rgba(46, 42, 36, 0.05)" }}>
              <CardContent>
                <Typography color="textSecondary" variant="subtitle2" gutterBottom>
                  Lost Animals
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "#B94A48" }}>
                  {lostAnimals}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 4, boxShadow: "0 12px 24px rgba(46, 42, 36, 0.05)" }}>
              <CardContent>
                <Typography color="textSecondary" variant="subtitle2" gutterBottom>
                  ABC in Progress
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "#1E7B68" }}>
                  {pendingAbc}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Charts & Alerts */}
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Card sx={{ borderRadius: 6, boxShadow: "0 12px 24px rgba(46, 42, 36, 0.08)", p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Monthly Cases Trend
              </Typography>
              <Box sx={{ width: "100%", height: 350 }}>
                {monthlyCases.length > 0 ? (
                  <ResponsiveContainer>
                    <LineChart data={monthlyCases} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="opened" stroke="#D96C3F" strokeWidth={2} name="Opened Cases" />
                      <Line type="monotone" dataKey="resolved" stroke="#1E7B68" strokeWidth={2} name="Resolved Cases" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                    <Typography color="textSecondary">No case history available.</Typography>
                  </Box>
                )}
              </Box>
            </Card>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Card sx={{ borderRadius: 6, boxShadow: "0 12px 24px rgba(46, 42, 36, 0.08)", p: 3, height: "100%", display: "flex", flexDirection: "column" }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                System Alerts
              </Typography>
              <Box sx={{ flexGrow: 1, overflowY: "auto", maxLength: 350 }}>
                {alerts.length > 0 ? (
                  <List disablePadding>
                    {alerts.map((alert) => (
                      <ListItem key={alert.id} sx={{ px: 0, py: 1.5, borderBottom: "1px solid #EFE7D9", gap: 1 }} alignItems="flex-start">
                        <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                            <Chip label={alert.severity} size="small" color={severityColor(alert.severity)} sx={{ fontWeight: 700, fontSize: 10 }} />
                            <Typography variant="caption" color="textSecondary">
                              {formatDateTime(alert.createdAt)}
                            </Typography>
                          </Box>
                          <ListItemText
                            primary={alert.title}
                            secondary={alert.body}
                            primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
                            secondaryTypographyProps={{ fontSize: 12, mt: 0.5 }}
                          />
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                    <Typography color="textSecondary">No recent alerts.</Typography>
                  </Box>
                )}
              </Box>
            </Card>
          </Grid>
        </Grid>

        {/* Detailed Logs Columns */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 6, boxShadow: "0 12px 24px rgba(46, 42, 36, 0.08)", p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Recent Cases
              </Typography>
              <List>
                {cases.slice(0, 5).map((item) => (
                  <ListItem key={item.id} sx={{ px: 0, py: 1.5, borderBottom: "1px solid #EFE7D9" }}>
                    <ListItemText
                      primary={item.title}
                      secondary={`${toTitleCase(item.caseType)} • ${toTitleCase(item.status)}`}
                      primaryTypographyProps={{ fontWeight: 600 }}
                    />
                    <Typography variant="caption" color="textSecondary">
                      {formatDateTime(item.updatedAt)}
                    </Typography>
                  </ListItem>
                ))}
              </List>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 6, boxShadow: "0 12px 24px rgba(46, 42, 36, 0.08)", p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Latest ABC Events
              </Typography>
              <List>
                {abcEvents.slice(0, 5).map((item) => (
                  <ListItem key={item.id} sx={{ px: 0, py: 1.5, borderBottom: "1px solid #EFE7D9" }}>
                    <ListItemText
                      primary={toTitleCase(item.eventType)}
                      secondary={`${item.animalName || `Animal ${item.animalId.slice(0, 8)}`} • ${item.status}`}
                      primaryTypographyProps={{ fontWeight: 600 }}
                    />
                    <Typography variant="caption" color="textSecondary">
                      {formatDateTime(item.createdAt)}
                    </Typography>
                  </ListItem>
                ))}
              </List>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  );
}
