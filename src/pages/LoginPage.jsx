import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import { Box, Button, Typography, Paper } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const { login, user } = useAuth();
  const { resolved } = useThemeMode();
  const dark = resolved === "dark";
  const navigate = useNavigate();

  if (user) return <Navigate to="/" />;

  return (
    <Box sx={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
      bgcolor: dark ? "#0a0f1a" : "#e8f5f0",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>

      {/* ── Background blobs ── */}
      <Box sx={{
        position: "absolute", width: 520, height: 520,
        borderRadius: "50%", top: "-140px", left: "-160px",
        background: dark
          ? "radial-gradient(circle, rgba(29,158,117,0.25) 0%, transparent 70%)"
          : "radial-gradient(circle, rgba(29,158,117,0.18) 0%, transparent 70%)",
        filter: "blur(48px)", pointerEvents: "none",
      }} />
      <Box sx={{
        position: "absolute", width: 400, height: 400,
        borderRadius: "50%", bottom: "-100px", right: "-80px",
        background: dark
          ? "radial-gradient(circle, rgba(29,158,117,0.2) 0%, transparent 70%)"
          : "radial-gradient(circle, rgba(15,110,86,0.14) 0%, transparent 70%)",
        filter: "blur(56px)", pointerEvents: "none",
      }} />
      <Box sx={{
        position: "absolute", width: 260, height: 260,
        borderRadius: "50%", top: "55%", left: "20%",
        background: dark
          ? "radial-gradient(circle, rgba(29,158,117,0.12) 0%, transparent 70%)"
          : "radial-gradient(circle, rgba(29,158,117,0.1) 0%, transparent 70%)",
        filter: "blur(40px)", pointerEvents: "none",
      }} />

      {/* ── Floating graphic rings ── */}
      <Box sx={{
        position: "absolute", top: 60, right: 80,
        width: 180, height: 180, borderRadius: "50%",
        border: `1.5px solid ${dark ? "rgba(29,158,117,0.25)" : "rgba(29,158,117,0.2)"}`,
        pointerEvents: "none",
      }} />
      <Box sx={{
        position: "absolute", top: 90, right: 110,
        width: 120, height: 120, borderRadius: "50%",
        border: `1px solid ${dark ? "rgba(29,158,117,0.15)" : "rgba(29,158,117,0.15)"}`,
        pointerEvents: "none",
      }} />
      <Box sx={{
        position: "absolute", bottom: 80, left: 60,
        width: 140, height: 140, borderRadius: "50%",
        border: `1.5px solid ${dark ? "rgba(29,158,117,0.2)" : "rgba(29,158,117,0.18)"}`,
        pointerEvents: "none",
      }} />

      {/* ── Floating stat chips ── */}
      {[
        { label: "Saved this month", value: "₹12,400", top: "14%", left: "8%", rotate: "-6deg" },
        { label: "Debt-free in", value: "14 months", top: "70%", right: "6%", rotate: "5deg" },
        { label: "Savings rate", value: "42%", top: "22%", right: "10%", rotate: "4deg" },
      ].map((chip) => (
        <Box key={chip.label} sx={{
          position: "absolute",
          top: chip.top, left: chip.left, right: chip.right,
          transform: `rotate(${chip.rotate})`,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          background: dark ? "rgba(29,158,117,0.12)" : "rgba(255,255,255,0.6)",
          border: `1px solid ${dark ? "rgba(29,158,117,0.3)" : "rgba(29,158,117,0.25)"}`,
          borderRadius: "14px",
          px: 2, py: 1,
          pointerEvents: "none",
          display: { xs: "none", md: "block" },
        }}>
          <Typography sx={{ fontSize: 10, color: dark ? "rgba(255,255,255,0.5)" : "#555", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {chip.label}
          </Typography>
          <Typography sx={{ fontSize: 16, fontWeight: 800, color: "#1D9E75", lineHeight: 1.2 }}>
            {chip.value}
          </Typography>
        </Box>
      ))}

      {/* ── Main card ── */}
      <Paper elevation={0} sx={{
        position: "relative", zIndex: 2,
        width: { xs: "90%", sm: 420 },
        p: { xs: 3.5, sm: 5 },
        borderRadius: 4,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        background: dark
          ? "rgba(26, 31, 46, 0.75)"
          : "rgba(255,255,255,0.72)",
        border: `1px solid ${dark ? "rgba(29,158,117,0.2)" : "rgba(29,158,117,0.18)"}`,
        boxShadow: dark
          ? "0 8px 48px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.05) inset"
          : "0 8px 48px rgba(29,158,117,0.12), 0 1px 0 rgba(255,255,255,0.9) inset",
        textAlign: "center",
      }}>

        {/* Logo mark */}
        <Box sx={{
          width: 56, height: 56, borderRadius: "16px",
          background: "linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          mx: "auto", mb: 3,
          boxShadow: "0 4px 20px rgba(29,158,117,0.4)",
        }}>
          <Typography sx={{ fontSize: 24, lineHeight: 1 }}>₹</Typography>
        </Box>

        <Typography sx={{
          fontSize: { xs: 30, sm: 36 },
          fontWeight: 800,
          letterSpacing: "-1.5px",
          lineHeight: 1,
          mb: 0.5,
          background: "linear-gradient(135deg, #1D9E75 0%, #0a7a57 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          FinTrack
        </Typography>

        <Typography sx={{
          fontSize: 14, color: dark ? "rgba(255,255,255,0.5)" : "#666",
          mb: 1, fontWeight: 500,
        }}>
          Personal Finance, Simplified
        </Typography>

        <Box sx={{
          display: "flex", gap: 1.5, justifyContent: "center",
          flexWrap: "wrap", mb: 4, mt: 2,
        }}>
          {["Track Income", "Manage Debts", "Save More"].map((tag) => (
            <Box key={tag} sx={{
              px: 1.5, py: 0.4,
              borderRadius: "20px",
              background: dark ? "rgba(29,158,117,0.15)" : "rgba(29,158,117,0.1)",
              border: "1px solid rgba(29,158,117,0.3)",
            }}>
              <Typography sx={{ fontSize: 11, color: "#1D9E75", fontWeight: 700 }}>{tag}</Typography>
            </Box>
          ))}
        </Box>

        <Button
          fullWidth
          variant="contained"
          size="large"
          startIcon={<GoogleIcon />}
          onClick={login}
          sx={{
            bgcolor: "#1D9E75",
            color: "white",
            fontWeight: 700,
            fontSize: 15,
            py: 1.5,
            borderRadius: 3,
            textTransform: "none",
            letterSpacing: 0.3,
            boxShadow: "0 4px 20px rgba(29,158,117,0.35)",
            "&:hover": {
              bgcolor: "#0F6E56",
              boxShadow: "0 6px 28px rgba(29,158,117,0.45)",
              transform: "translateY(-1px)",
            },
            transition: "all 0.2s ease",
          }}
        >
          Continue with Google
        </Button>

        <Typography sx={{ fontSize: 11, color: dark ? "rgba(255,255,255,0.3)" : "#aaa", mt: 2.5 }}>
          Your data is private and stored securely in Firebase
        </Typography>

        <Button
  size="small"
  onClick={() => navigate("/admin-login")}
  sx={{ mt: 1.5, p: 1, color: dark ? "rgba(93, 101, 56, 0.25)" : "#ccc", textTransform: "none", fontSize: 11 }}
>
  Admin login →
</Button>

      </Paper>
    </Box>
  );
}