import { createTheme } from "@mui/material";

// ── Paisa color system ────────────────────────────────────────────────────────
export const COLORS = {
  saffron:      "#E8780A",
  saffronLight: "#FDE8C8",
  saffronDark:  "#B85E08",
  green:        "#1A6644",
  greenLight:   "#D4EDE2",
  greenDark:    "#0F3D28",
  ink:          "#0F0E0C",
  paper:        "#F7F3ED",
  cream:        "#EDE8DF",
  rust:         "#B83A1E",
  navy:         "#0E2340",
  muted:        "#6B6155",
  rule:         "#DDD8CE",

  // Semantic
  income:   "#1A6644",
  expense:  "#B83A1E",
  debt:     "#E8780A",
  saving:   "#0E2340",
};

export const buildTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: {
      main:  COLORS.saffron,
      light: COLORS.saffronLight,
      dark:  COLORS.saffronDark,
    },
    secondary: {
      main:  COLORS.green,
      light: COLORS.greenLight,
      dark:  COLORS.greenDark,
    },
    background: {
      default: mode === "dark" ? "#0F0E0C" : COLORS.paper,
      paper:   mode === "dark" ? "#1A1714" : "#FFFFFF",
    },
    text: {
      primary:   mode === "dark" ? COLORS.paper   : COLORS.ink,
      secondary: mode === "dark" ? "rgba(247,243,237,0.55)" : COLORS.muted,
    },
    error:   { main: COLORS.rust },
    warning: { main: COLORS.saffron },
    success: { main: COLORS.green },
    divider: mode === "dark" ? "rgba(247,243,237,0.08)" : COLORS.rule,
  },
  typography: {
    fontFamily: "'DM Sans', sans-serif",
    h1: { fontFamily: "'Cormorant Garamond', serif", fontWeight: 900 },
    h2: { fontFamily: "'Cormorant Garamond', serif", fontWeight: 700 },
    h3: { fontFamily: "'Cormorant Garamond', serif", fontWeight: 700 },
    h4: { fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 },
    h5: { fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 },
    h6: { fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 },
  },
  shape: { borderRadius: 4 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 4,
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: "small" },
    },
  },
});

// Glass card style helper
export const glassStyle = (dark, extra = {}) => ({
  backdropFilter:       "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  background: dark
    ? "rgba(26,23,20,0.75)"
    : "rgba(255,255,255,0.72)",
  border: `1px solid ${dark
    ? "rgba(247,243,237,0.08)"
    : "rgba(0,0,0,0.07)"}`,
  boxShadow: dark
    ? "0 4px 32px rgba(0,0,0,0.4)"
    : "0 4px 32px rgba(0,0,0,0.06)",
  ...extra,
});