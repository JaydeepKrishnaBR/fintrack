import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth }      from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import { usePersona }   from "../context/PersonaContext";
import { COLORS, glassStyle } from "../brand/theme";
import AnimatedBackground from "./AnimatedBackground";
import {
  Box, Drawer, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, AppBar, Toolbar,
  IconButton, Typography, Avatar, Divider,
  useMediaQuery, useTheme, Tooltip,
  ToggleButtonGroup, ToggleButton,
} from "@mui/material";

import CalculateIcon      from "@mui/icons-material/Calculate";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";

import HomeIcon              from "@mui/icons-material/Home";
import AddCircleIcon         from "@mui/icons-material/AddCircle";
import BarChartIcon          from "@mui/icons-material/BarChart";
import ReceiptIcon           from "@mui/icons-material/Receipt";
import PersonIcon            from "@mui/icons-material/Person";
import MenuIcon              from "@mui/icons-material/Menu";
import LogoutIcon            from "@mui/icons-material/Logout";
import LightModeIcon         from "@mui/icons-material/LightMode";
import DarkModeIcon          from "@mui/icons-material/DarkMode";
import SettingsBrightnessIcon from "@mui/icons-material/SettingsBrightness";
import AssessmentIcon        from "@mui/icons-material/Assessment";
import FlagIcon              from "@mui/icons-material/Flag";
import CalendarMonthIcon     from "@mui/icons-material/CalendarMonth";

const DRAWER_WIDTH = 232;

const NAV_ITEMS = [
  { label: "Home",            icon: <HomeIcon />,         path: "/"             },
  { label: "Add Entry",       icon: <AddCircleIcon />,    path: "/add"          },
  { label: "Dashboard",       icon: <BarChartIcon />,     path: "/dashboard"    },
  { label: "Salary Report",   icon: <AssessmentIcon />,   path: "/report"       },
  { label: "Goals",           icon: <FlagIcon />,         path: "/goals"        },
  { label: "Expense Planner", icon: <CalendarMonthIcon />, path: "/planner"     },
  { label: "Transactions",    icon: <ReceiptIcon />,      path: "/transactions" },
  { label: "Profile",         icon: <PersonIcon />,       path: "/profile"      },
  { label: "Net Worth",       icon: <AccountBalanceIcon />, path: "/networth" },
  { label: "Tax Engine",      icon: <CalculateIcon />,      path: "/tax"      },
];

export default function Layout({ children }) {
  const { user, logout }       = useAuth();
  const { mode, setMode, resolved } = useThemeMode();
  const { persona }            = usePersona();
  const navigate               = useNavigate();
  const location               = useLocation();
  const theme                  = useTheme();
  const isMobile               = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setOpen]  = useState(false);
  const dark                   = resolved === "dark";

  const personaEmoji = {
    salaried: "💼", freelancer: "🚀",
    business: "🏢", student: "🎓", family: "🏠",
  };

  const sidebarBg = dark
    ? "rgba(15,14,12,0.85)"
    : "rgba(247,243,237,0.88)";

  const drawerContent = (
    <Box sx={{
      display: "flex", flexDirection: "column", height: "100%",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      background: sidebarBg,
      borderRight: `1px solid ${dark
        ? "rgba(247,243,237,0.06)" : COLORS.rule}`,
    }}>

      {/* Logo */}
      <Box sx={{ px: 2.5, pt: 2.5, pb: 2 }}>
        <Typography sx={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 26, fontWeight: 900,
          color: COLORS.saffron, lineHeight: 1,
        }}>
          FinTrack
        </Typography>
        <Typography sx={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 9, letterSpacing: 3,
          textTransform: "uppercase",
          color: "text.secondary", mt: 0.3,
        }}>
          Personal Finance
        </Typography>
      </Box>

      <Divider sx={{ opacity: 0.5 }} />

      {/* Nav */}
      <List sx={{ flex: 1, pt: 1.5, px: 1 }}>
        {NAV_ITEMS.map(item => {
          const active = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.3 }}>
              <ListItemButton
                onClick={() => { navigate(item.path); setOpen(false); }}
                sx={{
                  borderRadius: 1.5, py: 1,
                  background: active
                    ? dark
                      ? `rgba(232,120,10,0.12)`
                      : COLORS.saffronLight
                    : "transparent",
                  border: active
                    ? `1px solid ${COLORS.saffron}33`
                    : "1px solid transparent",
                  color: active
                    ? COLORS.saffron
                    : dark ? "rgba(247,243,237,0.55)" : COLORS.muted,
                  "&:hover": {
                    background: dark
                      ? "rgba(247,243,237,0.04)"
                      : COLORS.cream,
                  },
                }}
              >
                <ListItemIcon sx={{
                  minWidth: 34,
                  color: active ? COLORS.saffron : "inherit",
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: 13,
                    fontWeight: active ? 700 : 400,
                    fontFamily: active ? "inherit" : "'DM Sans', sans-serif",
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ opacity: 0.5 }} />

      {/* Theme toggle */}
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography sx={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 9, letterSpacing: 2.5,
          textTransform: "uppercase",
          color: "text.secondary", mb: 1, display: "block",
        }}>
          Theme
        </Typography>
        <ToggleButtonGroup
          value={mode} exclusive
          onChange={(_, v) => v && setMode(v)}
          fullWidth size="small"
        >
          {[
            { val: "light",  icon: <LightModeIcon  sx={{ fontSize: 14 }} />, label: "Light"  },
            { val: "dark",   icon: <DarkModeIcon   sx={{ fontSize: 14 }} />, label: "Dark"   },
            { val: "system", icon: <SettingsBrightnessIcon sx={{ fontSize: 14 }} />, label: "Auto" },
          ].map(({ val, icon, label }) => (
            <Tooltip title={label} key={val}>
              <ToggleButton value={val} sx={{
                border: `1px solid ${dark
                  ? "rgba(247,243,237,0.1)"
                  : COLORS.rule} !important`,
                color: mode === val
                  ? COLORS.saffron
                  : dark ? "rgba(247,243,237,0.35)" : COLORS.muted,
                bgcolor: mode === val
                  ? dark ? "rgba(232,120,10,0.12)" : COLORS.saffronLight
                  : "transparent",
                py: 0.5, gap: 0.4,
                fontSize: 11, fontWeight: 600,
                textTransform: "none",
                "&:hover": {
                  bgcolor: dark
                    ? "rgba(247,243,237,0.05)"
                    : COLORS.cream,
                },
              }}>
                {icon}{label}
              </ToggleButton>
            </Tooltip>
          ))}
        </ToggleButtonGroup>
      </Box>

      <Divider sx={{ opacity: 0.5 }} />

      {/* User footer */}
      <Box sx={{
        p: 2, display: "flex",
        alignItems: "center", gap: 1.5,
      }}>
        <Avatar
          src={user?.photoURL}
          sx={{ width: 34, height: 34, bgcolor: COLORS.saffron, fontSize: 13 }}
        >
          {user?.displayName?.[0]}
        </Avatar>
        <Box sx={{ flex: 1, overflow: "hidden" }}>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography sx={{ fontSize: 13, fontWeight: 700 }} noWrap>
              {user?.displayName}
            </Typography>
            {persona?.persona && (
              <Typography sx={{ fontSize: 13 }}>
                {personaEmoji[persona.persona]}
              </Typography>
            )}
          </Box>
          <Typography
            variant="caption"
            sx={{ color: "text.secondary" }}
            noWrap
          >
            {user?.email}
          </Typography>
        </Box>
        <Tooltip title="Sign out">
          <IconButton size="small" onClick={logout}
            sx={{ color: "text.secondary" }}>
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", position: "relative" }}>
      <AnimatedBackground />

      {isMobile ? (
        <>
          <AppBar position="fixed" elevation={0} sx={{
            zIndex: 10,
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            background: dark
              ? "rgba(15,14,12,0.85)"
              : "rgba(247,243,237,0.9)",
            borderBottom: `1px solid ${dark
              ? "rgba(247,243,237,0.06)" : COLORS.rule}`,
          }}>
            <Toolbar>
              <IconButton
                edge="start"
                onClick={() => setOpen(true)}
                sx={{ color: "text.primary" }}
              >
                <MenuIcon />
              </IconButton>
              <Typography sx={{
                ml: 1,
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 22, fontWeight: 900,
                color: COLORS.saffron,
              }}>
                FinTrack
              </Typography>
            </Toolbar>
          </AppBar>
          <Drawer
            open={mobileOpen}
            onClose={() => setOpen(false)}
            sx={{
              "& .MuiDrawer-paper": {
                width: DRAWER_WIDTH,
                background: "transparent",
              },
            }}
          >
            {drawerContent}
          </Drawer>
          <Box
            component="main"
            sx={{
              flex: 1, p: 2, mt: 8,
              position: "relative", zIndex: 1,
            }}
          >
            {children}
          </Box>
        </>
      ) : (
        <>
          <Drawer
            variant="permanent"
            sx={{
              width: 20,
              "& .MuiDrawer-paper": {
                width: DRAWER_WIDTH,
                background: "transparent",
                borderRight: "none",
              },
            }}
          >
            {drawerContent}
          </Drawer>
          <Box
            component="main"
            sx={{
              flex: 1,
              ml: `${DRAWER_WIDTH}px`,
              p: 3,
              position: "relative",
              zIndex: 1,
              minHeight: "100vh",
            }}
          >
            {children}
          </Box>
        </>
      )}
    </Box>
  );
}