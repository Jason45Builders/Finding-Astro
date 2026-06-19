import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Button,
  Avatar,
  useMediaQuery,
  useTheme
} from "@mui/material";
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  LocalShipping as DispatchIcon,
  Pets as PetsIcon,
  Vaccines as VaccinesIcon,
  AttachMoney as FundingIcon,
  Store as PartnersIcon,
  People as UsersIcon,
  Map as WardsIcon,
  Article as ContentIcon,
  Logout as LogoutIcon
} from "@mui/icons-material";
import { dashboardApi } from "../services/api";

const DRAWER_WIDTH = 260;

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: <DashboardIcon /> },
  { label: "Dispatch", href: "/dispatch", icon: <DispatchIcon /> },
  { label: "Cases", href: "/cases", icon: <AssignmentIcon /> },
  { label: "Animals", href: "/animals", icon: <PetsIcon /> },
  { label: "ABC", href: "/abc", icon: <VaccinesIcon /> },
  { label: "Funding", href: "/funding", icon: <FundingIcon /> },
  { label: "Partners", href: "/partners", icon: <PartnersIcon /> },
  { label: "Users", href: "/users", icon: <UsersIcon /> },
  { label: "Wards", href: "/wards", icon: <WardsIcon /> },
  { label: "Content", href: "/content", icon: <ContentIcon /> }
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    dashboardApi.logout();
    router.replace("/login");
  };

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar sx={{ px: 3, py: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#2E2A24" }}>
          Finding Astro
        </Typography>
      </Toolbar>
      <Divider sx={{ borderColor: "#EFE7D9" }} />
      <List sx={{ flex: 1, px: 1.5, py: 1 }}>
        {NAV_ITEMS.map((item) => {
          const active = router.pathname === item.href || router.pathname.startsWith(item.href + "/");
          return (
            <ListItem key={item.href} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={Link}
                href={item.href}
                selected={active}
                onClick={() => isMobile && setMobileOpen(false)}
                sx={{
                  borderRadius: 2,
                  color: active ? "#D96C3F" : "#6B6257",
                  backgroundColor: active ? "rgba(217, 108, 63, 0.08)" : "transparent",
                  "&:hover": {
                    backgroundColor: "rgba(217, 108, 63, 0.08)"
                  },
                  "&.Mui-selected": {
                    backgroundColor: "rgba(217, 108, 63, 0.12)",
                    color: "#D96C3F"
                  }
                }}
              >
                <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Divider sx={{ borderColor: "#EFE7D9" }} />
      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{
            justifyContent: "flex-start",
            color: "#6B6257",
            textTransform: "none",
            fontWeight: 600,
            borderRadius: 2,
            px: 1.5,
            py: 1,
            "&:hover": { backgroundColor: "rgba(185, 74, 72, 0.08)", color: "#B94A48" }
          }}
        >
          Logout
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid #EFE7D9",
          color: "#2E2A24"
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="body2" color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }}>
            Operations Dashboard
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: "#D96C3F", fontSize: 14, fontWeight: 700 }}>
              A
            </Avatar>
            <Typography variant="body2" fontWeight={600} sx={{ display: { xs: "none", sm: "block" } }}>
              Admin
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: DRAWER_WIDTH, backgroundColor: "#FFFFFF", borderRight: "1px solid #EFE7D9" }
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: DRAWER_WIDTH, backgroundColor: "#FFFFFF", borderRight: "1px solid #EFE7D9" }
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: "100vh",
          backgroundColor: "#F5F1E8"
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
