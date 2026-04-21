import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { createTheme, ThemeProvider as MuiThemeProvider } from "@mui/material";

const ThemeCtx = createContext();

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem("ft-theme") || "system");

  const resolved = useMemo(() => {
    if (mode === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return mode;
  }, [mode]);

  useEffect(() => {
    localStorage.setItem("ft-theme", mode);
  }, [mode]);

  const theme = useMemo(() => createTheme({
    palette: {
      mode: resolved,
      primary: { main: "#1D9E75" },
      background: {
        default: resolved === "dark" ? "#0f1117" : "#f4f7f5",
        paper: resolved === "dark" ? "#1a1f2e" : "#ffffff",
      },
    },
    typography: {
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    },
    shape: { borderRadius: 14 },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
    },
  }), [resolved]);

  return (
    <ThemeCtx.Provider value={{ mode, setMode, resolved }}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeCtx.Provider>
  );
}

export function useThemeMode() {
  return useContext(ThemeCtx);
}