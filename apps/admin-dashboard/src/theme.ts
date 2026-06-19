import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    background: {
      default: "#F5F1E8",
      paper: "#FFFFFF"
    },
    primary: {
      main: "#D96C3F",
      contrastText: "#FFFFFF"
    },
    secondary: {
      main: "#A4472A"
    },
    text: {
      primary: "#2E2A24",
      secondary: "#6B6257"
    },
    error: {
      main: "#B94A48"
    },
    warning: {
      main: "#E9A319"
    },
    success: {
      main: "#4A8C5A"
    },
    info: {
      main: "#4A7FA8"
    }
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    h1: { fontWeight: 700, fontSize: "2.2rem" },
    h2: { fontWeight: 700, fontSize: "1.6rem" },
    h3: { fontWeight: 600, fontSize: "1.25rem" },
    h4: { fontWeight: 600, fontSize: "1.1rem" },
    button: { fontWeight: 600, textTransform: "none" as const }
  },
  shape: {
    borderRadius: 12
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: "none"
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: "0 4px 20px rgba(46, 42, 36, 0.06)"
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600
        }
      }
    }
  }
});
