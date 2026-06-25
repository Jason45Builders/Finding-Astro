import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import Layout from "../components/Layout";
import { dashboardApi, WardSummary } from "../services/api";

export default function WardsPage() {
  const [wardSummaries, setWardSummaries] = useState<WardSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dashboardApi.getToken() && typeof window !== "undefined") {
      window.location.replace("/login");
      return;
    }
    const loadData = async () => {
      try {
        const data = await dashboardApi.listWardSummaries();
        setWardSummaries(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load ward summaries");
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

  // Calculate metrics
  const totalWards = wardSummaries.length;
  const avgAbc = totalWards
    ? (wardSummaries.reduce((sum, w) => sum + w.abcCoveragePercent, 0) / totalWards).toFixed(1)
    : "0";
  const avgVac = totalWards
    ? (wardSummaries.reduce((sum, w) => sum + w.vaccinationRatePercent, 0) / totalWards).toFixed(1)
    : "0";
  const totalOpenCases = wardSummaries.reduce((sum, w) => sum + w.openCases, 0);

  // Recharts: Top 10 wards by open cases
  const chartData = [...wardSummaries]
    .sort((a, b) => b.openCases - a.openCases)
    .slice(0, 10)
    .map((w) => ({
      name: w.wardName || `Ward ${w.wardNumber}`,
      "Open Cases": w.openCases,
      "Animals Tracked": w.animalCount
    }));

  return (
    <Layout>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Box>
          <Typography variant="caption" sx={{ textTransform: "uppercase", letterSpacing: 1.5, color: "#A4472A", fontWeight: 700 }}>
            Ward Statistics
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: "#2E2A24" }}>
            Ward Performance
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 4, boxShadow: "0 12px 24px rgba(46, 42, 36, 0.05)" }}>
              <CardContent>
                <Typography color="textSecondary" variant="subtitle2" gutterBottom>
                  Total Wards
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {totalWards}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 4, boxShadow: "0 12px 24px rgba(46, 42, 36, 0.05)" }}>
              <CardContent>
                <Typography color="textSecondary" variant="subtitle2" gutterBottom>
                  Avg ABC Coverage
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "#1E7B68" }}>
                  {avgAbc}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 4, boxShadow: "0 12px 24px rgba(46, 42, 36, 0.05)" }}>
              <CardContent>
                <Typography color="textSecondary" variant="subtitle2" gutterBottom>
                  Avg Vaccination Rate
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "#D96C3F" }}>
                  {avgVac}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 4, boxShadow: "0 12px 24px rgba(46, 42, 36, 0.05)" }}>
              <CardContent>
                <Typography color="textSecondary" variant="subtitle2" gutterBottom>
                  Total Open Cases
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "#B94A48" }}>
                  {totalOpenCases}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} lg={7}>
            <TableContainer component={Paper} sx={{ borderRadius: 6, boxShadow: "0 12px 24px rgba(46, 42, 36, 0.08)" }}>
              <Box sx={{ p: 2, borderBottom: "1px solid #EFE7D9", backgroundColor: "#FFFFFF" }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Ward Breakdown
                </Typography>
              </Box>
              <Table>
                <TableHead sx={{ backgroundColor: "#F5F1E8" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Ward Name / ID</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Animal Count</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>ABC Coverage</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Vaccination %</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Open Cases</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Avg Response (h)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {wardSummaries.map((row) => (
                    <TableRow key={row.wardNumber} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                      <TableCell component="th" scope="row">
                        {row.wardName || `Ward ${row.wardNumber}`}
                      </TableCell>
                      <TableCell align="right">{row.animalCount}</TableCell>
                      <TableCell align="right">{row.abcCoveragePercent}%</TableCell>
                      <TableCell align="right">{row.vaccinationRatePercent}%</TableCell>
                      <TableCell align="right">{row.openCases}</TableCell>
                      <TableCell align="right">{row.avgResponseHours !== null ? row.avgResponseHours.toFixed(1) : "N/A"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>

          <Grid item xs={12} lg={5}>
            <Card sx={{ borderRadius: 6, boxShadow: "0 12px 24px rgba(46, 42, 36, 0.08)", p: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Top Wards by Open Cases
              </Typography>
              <Box sx={{ width: "100%", height: 350 }}>
                <ResponsiveContainer>
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Open Cases" fill="#D96C3F" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Animals Tracked" fill="#1E7B68" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  );
}
