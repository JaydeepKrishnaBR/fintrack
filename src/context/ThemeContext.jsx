import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { ThemeProvider as MuiThemeProvider, CssBaseline } from "@mui/material";
import { buildTheme } from "../brand/theme";

const ThemeCtx = createContext();

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(
    () => localStorage.getItem("ft-theme") || "system"
  );

  const resolved = useMemo(() => {
    if (mode === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark" : "light";
    }
    return mode;
  }, [mode]);

  useEffect(() => {
    localStorage.setItem("ft-theme", mode);
  }, [mode]);

  const theme = useMemo(() => buildTheme(resolved), [resolved]);

  return (
    <ThemeCtx.Provider value={{ mode, setMode, resolved }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeCtx.Provider>
  );
}

export function useThemeMode() {
  return useContext(ThemeCtx);
}