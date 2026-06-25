import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  Button,
  Chip,
  Alert,
  CircularProgress
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import Layout from "../components/Layout";
import { dashboardApi, User } from "../services/api";
import { formatDateTime } from "../utils/format";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardApi.listUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!dashboardApi.getToken() && typeof window !== "undefined") {
      window.location.replace("/login");
      return;
    }
    void loadUsers();
  }, []);

  const handleBanToggle = async (userId: string, currentBanned: boolean) => {
    setActionLoading(userId);
    try {
      await dashboardApi.banUser(userId, !currentBanned);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle ban status");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: User["role"]) => {
    setActionLoading(userId);
    try {
      await dashboardApi.upgradeRole(userId, newRole);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifyIdentity = async (userId: string, currentVerified: boolean) => {
    setActionLoading(userId);
    try {
      await dashboardApi.verifyIdentity(userId, !currentVerified);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify identity");
    } finally {
      setActionLoading(null);
    }
  };

  const columns: GridColDef[] = [
    {
      field: "fullName",
      headerName: "Full Name",
      flex: 1,
      minWidth: 150,
      renderCell: (params) => params.value || "Anonymous"
    },
    {
      field: "phone",
      headerName: "Email",
      flex: 1.2,
      minWidth: 200
    },
    {
      field: "role",
      headerName: "Role",
      width: 150,
      renderCell: (params) => {
        const user = params.row as User;
        return (
          <Select
            size="small"
            value={params.value || "citizen"}
            onChange={(e) => void handleRoleChange(user.id, e.target.value as User["role"])}
            disabled={actionLoading === user.id}
            sx={{ width: "100%", height: 32 }}
          >
            <MenuItem value="citizen">Citizen</MenuItem>
            <MenuItem value="ngo">NGO</MenuItem>
            <MenuItem value="govt">Government</MenuItem>
            <MenuItem value="hospital">Hospital</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
          </Select>
        );
      }
    },
    {
      field: "reputation",
      headerName: "Reputation",
      width: 110,
      type: "number",
      renderCell: (params) => params.value ?? 0
    },
    {
      field: "identityVerified",
      headerName: "Identity Verified",
      width: 160,
      renderCell: (params) => {
        const user = params.row as User;
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              label={params.value ? "Verified" : "Pending"}
              color={params.value ? "success" : "default"}
              size="small"
            />
            <Button
              size="small"
              variant="outlined"
              onClick={() => void handleVerifyIdentity(user.id, !!user.identityVerified)}
              disabled={actionLoading === user.id}
              sx={{ height: 24, fontSize: 11, py: 0 }}
            >
              Toggle
            </Button>
          </Box>
        );
      }
    },
    {
      field: "createdAt",
      headerName: "Joined Date",
      width: 180,
      valueFormatter: (params) => (params.value ? formatDateTime(params.value) : "")
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 150,
      sortable: false,
      renderCell: (params) => {
        const user = params.row as User;
        const isBanned = !!user.banned;
        return (
          <Button
            size="small"
            variant="contained"
            color={isBanned ? "success" : "error"}
            onClick={() => void handleBanToggle(user.id, isBanned)}
            disabled={actionLoading === user.id}
            sx={{ textTransform: "none" }}
          >
            {isBanned ? "Unban" : "Ban"}
          </Button>
        );
      }
    }
  ];

  return (
    <Layout>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box>
            <Typography variant="caption" sx={{ textTransform: "uppercase", letterSpacing: 1.5, color: "#A4472A", fontWeight: 700 }}>
              User Management
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: "#2E2A24" }}>
              Platform Users
            </Typography>
          </Box>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        <Box
          sx={{
            height: 600,
            width: "100%",
            backgroundColor: "#FFFFFF",
            borderRadius: 6,
            boxShadow: "0 12px 24px rgba(46, 42, 36, 0.08)",
            p: 2,
            "& .MuiDataGrid-root": {
              border: "none"
            },
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#F5F1E8",
              borderBottom: "1px solid #EFE7D9",
              color: "#6B6257",
              fontWeight: 700
            },
            "& .MuiDataGrid-cell": {
              borderBottom: "1px solid #EFE7D9",
              display: "flex",
              alignItems: "center"
            }
          }}
        >
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
              <CircularProgress />
            </Box>
          ) : (
            <DataGrid
              rows={users}
              columns={columns}
              pageSizeOptions={[10, 20, 50]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } }
              }}
              disableRowSelectionOnClick
            />
          )}
        </Box>
      </Box>
    </Layout>
  );
}
