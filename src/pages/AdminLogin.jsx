import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import {
  Box, Paper, Typography, TextField, Button, Alert,
  InputAdornment, IconButton
} from "@mui/material";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

export default function AdminLogin() {
  const { adminLogin, user, isAdmin } = useAuth();
  const { resolved } = useThemeMode();
  const dark = resolved === "dark";
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Already logged in as admin
  if (user && isAdmin) {
    navigate("/admin");
    return null;
  }

  const handleSubmit = async () => {
    if (!email || !password) { setError("Please enter email and password."); return; }
    setLoading(true);
    setError("");
    try {
      await adminLogin(email, password);
      // onAuthStateChanged will verify admin status, then redirect
      navigate("/admin");
    } catch (e) {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", position: "relative", overflow: "hidden",
      bgcolor: dark ? "#0a0f1a" : "#e8f0f5",
    }}>
      {/* Background blobs */}
      <Box sx={{
        position: "absolute", width: 500, height: 500, borderRadius: "50%",
        top: "-150px", right: "-150px",
        background: dark
          ? "radial-gradient(circle, rgba(63,81,181,0.2) 0%, transparent 70%)"
          : "radial-gradient(circle, rgba(63,81,181,0.12) 0%, transparent 70%)",
        filter: "blur(56px)", pointerEvents: "none",
      }} />
      <Box sx={{
        position: "absolute", width: 400, height: 400, borderRadius: "50%",
        bottom: "-100px", left: "-100px",
        background: dark
          ? "radial-gradient(circle, rgba(63,81,181,0.15) 0%, transparent 70%)"
          : "radial-gradient(circle, rgba(63,81,181,0.1) 0%, transparent 70%)",
        filter: "blur(48px)", pointerEvents: "none",
      }} />

      {/* Decorative rings */}
      <Box sx={{
        position: "absolute", bottom: 60, right: 80,
        width: 200, height: 200, borderRadius: "50%",
        border: `1.5px solid ${dark ? "rgba(63,81,181,0.2)" : "rgba(63,81,181,0.15)"}`,
        pointerEvents: "none",
      }} />
      <Box sx={{
        position: "absolute", bottom: 100, right: 120,
        width: 120, height: 120, borderRadius: "50%",
        border: `1px solid ${dark ? "rgba(63,81,181,0.15)" : "rgba(63,81,181,0.1)"}`,
        pointerEvents: "none",
      }} />

      <Paper elevation={0} sx={{
        position: "relative", zIndex: 2,
        width: { xs: "90%", sm: 420 },
        p: { xs: 3.5, sm: 5 },
        borderRadius: 4,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        background: dark ? "rgba(26,31,46,0.8)" : "rgba(255,255,255,0.75)",
        border: `1px solid ${dark ? "rgba(63,81,181,0.2)" : "rgba(63,81,181,0.15)"}`,
        boxShadow: dark
          ? "0 8px 48px rgba(0,0,0,0.5)"
          : "0 8px 48px rgba(63,81,181,0.1)",
        textAlign: "center",
      }}>

        {/* Icon */}
        <Box sx={{
          width: 56, height: 56, borderRadius: "16px", mx: "auto", mb: 3,
          background: "linear-gradient(135deg, #3f51b5 0%, #1a237e 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(63,81,181,0.4)",
        }}>
          <AdminPanelSettingsIcon sx={{ color: "white", fontSize: 28 }} />
        </Box>

        <Typography sx={{
          fontSize: 28, fontWeight: 800, letterSpacing: "-1px", mb: 0.5,
          background: "linear-gradient(135deg, #3f51b5 0%, #1a237e 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Admin Portal
        </Typography>
        <Typography sx={{ fontSize: 13, color: dark ? "rgba(255,255,255,0.4)" : "#888", mb: 4, fontWeight: 500 }}>
          FinTrack — Restricted Access
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, textAlign: "left" }}>
          <TextField
            label="Admin Email" type="email" fullWidth value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
          />
          <TextField
            label="Password" fullWidth value={password}
            type={showPw ? "text" : "password"}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPw(!showPw)} edge="end" size="small">
                    {showPw ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
          <Button
            variant="contained" size="large" fullWidth
            onClick={handleSubmit} disabled={loading}
            sx={{
              mt: 1, py: 1.5, borderRadius: 3, fontWeight: 700, fontSize: 15,
              textTransform: "none", letterSpacing: 0.3,
              bgcolor: "#3f51b5",
              boxShadow: "0 4px 20px rgba(63,81,181,0.35)",
              "&:hover": { bgcolor: "#1a237e", transform: "translateY(-1px)", boxShadow: "0 6px 28px rgba(63,81,181,0.45)" },
              transition: "all 0.2s ease",
            }}
          >
            {loading ? "Signing in…" : "Sign in as Admin"}
          </Button>
        </Box>

        <Button
          size="small" onClick={() => navigate("/login")}
          sx={{ mt: 2.5, color: dark ? "rgba(255,255,255,0.35)" : "#aaa", textTransform: "none", fontSize: 12 }}
        >
          ← Back to user login
        </Button>
      </Paper>
    </Box>
  );
}