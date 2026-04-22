import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, AppBar, Toolbar, IconButton, Typography,
  Avatar, Divider, useMediaQuery, useTheme, Tooltip,
  ToggleButtonGroup, ToggleButton
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import BarChartIcon from "@mui/icons-material/BarChart";
import ReceiptIcon from "@mui/icons-material/Receipt";
import PersonIcon from "@mui/icons-material/Person";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import SettingsBrightnessIcon from "@mui/icons-material/SettingsBrightness";
import AssessmentIcon from "@mui/icons-material/Assessment";
import FlagIcon from "@mui/icons-material/Flag";

const DRAWER_WIDTH = 230;

const navItems = [
  { label: "Home", icon: <HomeIcon />, path: "/" },
  { label: "Add Entry", icon: <AddCircleIcon />, path: "/add" },
  { label: "Dashboard", icon: <BarChartIcon />, path: "/dashboard" },
  { label: "Salary Report", icon: <AssessmentIcon />, path: "/report" },
  { label: "Goals", icon: <FlagIcon />, path: "/goals" },
  { label: "Transactions", icon: <ReceiptIcon />, path: "/transactions" },
  { label: "Profile", icon: <PersonIcon />, path: "/profile" },
];

const glassStyle = (dark) => ({
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  background: dark ? "rgba(20,25,38,0.85)" : "rgba(255,255,255,0.82)",
  borderRight: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)"}`,
});

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { mode, setMode, resolved } = useThemeMode();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const dark = resolved === "dark";

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", ...glassStyle(dark) }}>
      {/* Logo */}
      <Box sx={{ pb: 2 }}>
        <Typography sx={{
          fontSize: 22, fontWeight: 800, letterSpacing: "-1px",
          background: "linear-gradient(135deg, #1D9E75 0%, #0a7a57 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          FinTrack
        </Typography>
        <Typography variant="caption" sx={{ color: dark ? "rgba(255,255,255,0.4)" : "#999", fontWeight: 500 }}>
          Personal Finance
        </Typography>
      </Box>
      <Divider sx={{ opacity: 0.08 }} />

      {/* Nav */}
      <List sx={{ flex: 1, pt: 1.5, px: 1 }}>
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => { navigate(item.path); setMobileOpen(false); }}
                sx={{
                  borderRadius: 2.5,
                  background: active
                    ? "linear-gradient(135deg, rgba(29,158,117,0.18) 0%, rgba(29,158,117,0.08) 100%)"
                    : "transparent",
                  border: active
                    ? "1px solid rgba(29,158,117,0.25)"
                    : "1px solid transparent",
                  color: active ? "#1D9E75" : dark ? "rgba(255,255,255,0.6)" : "#555",
                  "&:hover": {
                    background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                  },
                  py: 1.1,
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 700 : 500 }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ opacity: 0.08 }} />

      {/* Theme toggle */}
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="caption" sx={{ color: dark ? "rgba(255,255,255,0.35)" : "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, display: "block", mb: 1 }}>
          Theme
        </Typography>
        <ToggleButtonGroup value={mode} exclusive onChange={(_, v) => v && setMode(v)} fullWidth size="small">
          {[
            { val: "light", icon: <LightModeIcon sx={{ fontSize: 15 }} />, label: "Light" },
            { val: "dark", icon: <DarkModeIcon sx={{ fontSize: 15 }} />, label: "Dark" },
            { val: "system", icon: <SettingsBrightnessIcon sx={{ fontSize: 15 }} />, label: "Auto" },
          ].map(({ val, icon, label }) => (
            <Tooltip title={label} key={val}>
              <ToggleButton value={val} sx={{
                border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"} !important`,
                color: mode === val ? "#1D9E75" : dark ? "rgba(255,255,255,0.4)" : "#999",
                bgcolor: mode === val
                  ? (dark ? "rgba(29,158,117,0.15)" : "rgba(29,158,117,0.1)")
                  : "transparent",
                py: 0.5,
                gap: 0.5,
                fontSize: 11,
                fontWeight: 600,
                textTransform: "none",
                "&:hover": { bgcolor: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" },
              }}>
                {icon}{label}
              </ToggleButton>
            </Tooltip>
          ))}
        </ToggleButtonGroup>
      </Box>

      <Divider sx={{ opacity: 0.08 }} />

      {/* User */}
      <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Avatar src={user?.photoURL} sx={{ width: 34, height: 34, bgcolor: "#1D9E75", fontSize: 14 }}>
          {user?.displayName?.[0]}
        </Avatar>
        <Box sx={{ flex: 1, overflow: "hidden" }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700 }} noWrap>{user?.displayName}</Typography>
          <Typography variant="caption" sx={{ color: dark ? "rgba(255,255,255,0.4)" : "#aaa" }} noWrap>{user?.email}</Typography>
        </Box>
        <Tooltip title="Sign out">
          <IconButton size="small" onClick={logout} sx={{ color: dark ? "rgba(255,255,255,0.4)" : "#bbb" }}>
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  const mainBg = dark
    ? "radial-gradient(ellipse at top left, rgba(29,158,117,0.07) 0%, transparent 50%), #0f1117"
    : "radial-gradient(ellipse at top left, rgba(29,158,117,0.06) 0%, transparent 50%), #f4f7f5";

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", background: mainBg }}>
      {isMobile ? (
        <>
          <AppBar position="fixed" elevation={0} sx={{
            ...glassStyle(dark),
            borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)"}`,
            borderRight: "none",
          }}>
            <Toolbar>
              <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ color: dark ? "white" : "inherit" }}>
                <MenuIcon />
              </IconButton>
              <Typography sx={{
                ml: 1, fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px",
                background: "linear-gradient(135deg, #1D9E75, #0a7a57)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                FinTrack
              </Typography>
            </Toolbar>
          </AppBar>
          <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)}
            sx={{ "& .MuiDrawer-paper": { width: DRAWER_WIDTH, background: "transparent" } }}>
            {drawerContent}
          </Drawer>
          <Box component="main" sx={{ flex: 1, p: 2, mt: 8 }}>{children}</Box>
        </>
      ) : (
        <>
          <Drawer variant="permanent" sx={{
            width: DRAWER_WIDTH,
            "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box", background: "transparent", borderRight: "none" },
          }}>
            {drawerContent}
          </Drawer>
          <Box component="main" sx={{ flex: 1, p: 3, ml: 2 }}>{children}</Box>
        </>
      )}
    </Box>
  );
}