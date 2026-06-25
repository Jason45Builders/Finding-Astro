import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Alert,
  IconButton
} from "@mui/material";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import Layout from "../components/Layout";
import {
  dashboardApi,
  EducationContent,
  BehaviourGuidanceCard,
  HelplineEntry
} from "../services/api";

type TabValue = "education" | "behaviour" | "helpline";

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState<TabValue>("education");
  const [educationList, setEducationList] = useState<EducationContent[]>([]);
  const [behaviourList, setBehaviourList] = useState<BehaviourGuidanceCard[]>([]);
  const [helplineList, setHelplineList] = useState<HelplineEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("");
  const [published, setPublished] = useState(true);

  // Helpline specific Form Fields
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [area, setArea] = useState("");
  const [availableHours, setAvailableHours] = useState("");

  const loadData = async () => {
    setError(null);
    try {
      if (activeTab === "education") {
        setEducationList(await dashboardApi.listEducationContent());
      } else if (activeTab === "behaviour") {
        setBehaviourList(await dashboardApi.listBehaviourGuidance());
      } else if (activeTab === "helpline") {
        setHelplineList(await dashboardApi.listHelplines());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load content");
    }
  };

  useEffect(() => {
    if (!dashboardApi.getToken() && typeof window !== "undefined") {
      window.location.replace("/login");
      return;
    }
    void loadData();
  }, [activeTab]);

  const handleOpenAddDialog = () => {
    setEditingId(null);
    setTitle("");
    setBody("");
    setCategory("");
    setPublished(true);
    setName("");
    setNumber("");
    setArea("");
    setAvailableHours("");
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (item: any) => {
    setEditingId(item.id);
    if (activeTab === "helpline") {
      setName(item.name || "");
      setNumber(item.number || "");
      setArea(item.area || "");
      setAvailableHours(item.availableHours || "");
    } else {
      setTitle(item.title || "");
      setBody(item.body || "");
      setCategory(item.category || "");
      setPublished(item.published !== undefined ? item.published : true);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      if (activeTab === "education") {
        await dashboardApi.deleteEducationContent(id);
      } else if (activeTab === "behaviour") {
        await dashboardApi.deleteBehaviourGuidance(id);
      } else if (activeTab === "helpline") {
        await dashboardApi.deleteHelpline(id);
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item");
    }
  };

  const handleSave = async () => {
    try {
      if (activeTab === "helpline") {
        const payload = { name, number, area: area || null, availableHours: availableHours || null };
        if (editingId) {
          await dashboardApi.updateHelpline(editingId, payload);
        } else {
          await dashboardApi.createHelpline(payload);
        }
      } else if (activeTab === "education") {
        const payload = { title, body, category, published };
        if (editingId) {
          await dashboardApi.updateEducationContent(editingId, payload);
        } else {
          await dashboardApi.createEducationContent(payload);
        }
      } else if (activeTab === "behaviour") {
        const payload = { title, body, category, published };
        if (editingId) {
          await dashboardApi.updateBehaviourGuidance(editingId, payload);
        } else {
          await dashboardApi.createBehaviourGuidance(payload);
        }
      }
      setDialogOpen(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save content");
    }
  };

  return (
    <Layout>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box>
            <Typography variant="caption" sx={{ textTransform: "uppercase", letterSpacing: 1.5, color: "#A4472A", fontWeight: 700 }}>
              Content Management
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: "#2E2A24" }}>
              Education & Helplines
            </Typography>
          </Box>
          <Button variant="contained" color="primary" onClick={handleOpenAddDialog} sx={{ textTransform: "none", borderRadius: 3 }}>
            Add New Item
          </Button>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val as TabValue)}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab value="education" label="Education Content" sx={{ textTransform: "none", fontWeight: 600 }} />
          <Tab value="behaviour" label="Behaviour Guidance" sx={{ textTransform: "none", fontWeight: 600 }} />
          <Tab value="helpline" label="Emergency Helplines" sx={{ textTransform: "none", fontWeight: 600 }} />
        </Tabs>

        <TableContainer component={Paper} sx={{ borderRadius: 4, boxShadow: "0 12px 24px rgba(46, 42, 36, 0.08)" }}>
          <Table>
            <TableHead sx={{ backgroundColor: "#F5F1E8" }}>
              {activeTab === "helpline" ? (
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Number</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Area</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Hours</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Published</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              )}
            </TableHead>
            <TableBody>
              {activeTab === "helpline"
                ? helplineList.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                      <TableCell>{item.number}</TableCell>
                      <TableCell>{item.area || "All Chennai"}</TableCell>
                      <TableCell>{item.availableHours || "24 Hours"}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleOpenEditDialog(item)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => void handleDelete(item.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                : (activeTab === "education" ? educationList : behaviourList).map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell sx={{ fontWeight: 600 }}>{item.title}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.published ? "Yes" : "No"}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleOpenEditDialog(item)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => void handleDelete(item.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Form Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="sm">
          <DialogTitle sx={{ fontWeight: 700 }}>
            {editingId ? "Edit Item" : "Create New Item"}
          </DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            {activeTab === "helpline" ? (
              <>
                <TextField label="Name" fullWidth value={name} onChange={(e) => setName(e.target.value)} />
                <TextField label="Phone Number" fullWidth value={number} onChange={(e) => setNumber(e.target.value)} />
                <TextField label="Area Coverage (Optional)" fullWidth value={area} onChange={(e) => setArea(e.target.value)} />
                <TextField label="Available Hours (Optional)" fullWidth value={availableHours} onChange={(e) => setAvailableHours(e.target.value)} />
              </>
            ) : (
              <>
                <TextField label="Title" fullWidth value={title} onChange={(e) => setTitle(e.target.value)} />
                <TextField label="Category" fullWidth value={category} onChange={(e) => setCategory(e.target.value)} />
                <TextField label="Body Content" multiline rows={6} fullWidth value={body} onChange={(e) => setBody(e.target.value)} />
                <FormControlLabel
                  control={<Switch checked={published} onChange={(e) => setPublished(e.target.checked)} />}
                  label="Published"
                />
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseDialog} sx={{ textTransform: "none" }}>Cancel</Button>
            <Button onClick={() => void handleSave()} variant="contained" color="primary" sx={{ textTransform: "none", borderRadius: 2 }}>
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
