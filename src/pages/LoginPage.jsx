import { Navigate, useNavigate } from "react-router-dom";
import { useAuth }      from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import { COLORS }       from "../brand/theme";
import { Box, Button, Typography } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";

export default function LoginPage() {
  const { login, user } = useAuth();
  const { resolved }    = useThemeMode();
  const dark            = resolved === "dark";
  const navigate        = useNavigate();

  if (user) return <Navigate to="/" />;

  return (
    <Box sx={{
      minHeight: "100vh",
      background: dark ? COLORS.ink : COLORS.paper,
      display: "flex",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* ── Background grid ── */}
      <Box sx={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: `
          linear-gradient(${dark ? "rgba(247,243,237,0.03)" : "rgba(15,14,12,0.04)"} 1px, transparent 1px),
          linear-gradient(90deg, ${dark ? "rgba(247,243,237,0.03)" : "rgba(15,14,12,0.04)"} 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
      }} />

      {/* ── Glow blobs ── */}
      <Box sx={{
        position: "absolute", width: 600, height: 600,
        borderRadius: "50%", top: "-200px", right: "-100px",
        background: `radial-gradient(circle, ${COLORS.saffron}22 0%, transparent 70%)`,
        filter: "blur(60px)", pointerEvents: "none",
      }} />
      <Box sx={{
        position: "absolute", width: 500, height: 500,
        borderRadius: "50%", bottom: "-100px", left: "-100px",
        background: `radial-gradient(circle, ${COLORS.green}18 0%, transparent 70%)`,
        filter: "blur(60px)", pointerEvents: "none",
      }} />

      {/* ── Left panel — branding ── */}
      <Box sx={{
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        justifyContent: "flex-end",
        width: "55%",
        p: "80px 10vw",
        position: "relative",
      }}>
        {/* Eyebrow */}
        <Typography sx={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10, letterSpacing: 4,
          textTransform: "uppercase",
          color: COLORS.saffron, mb: 3,
        }}>
          Personal Finance · India
        </Typography>

        {/* Hero heading */}
        <Typography sx={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "clamp(52px, 8vw, 96px)",
          fontWeight: 900, lineHeight: 0.95,
          color: dark ? COLORS.paper : COLORS.ink,
          mb: 1,
        }}>
          Fin<Box component="span" sx={{ color: COLORS.saffron }}>Track</Box>
        </Typography>
        <Typography sx={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "clamp(18px, 2.5vw, 26px)",
          fontWeight: 400, fontStyle: "italic",
          color: dark ? "rgba(247,243,237,0.45)" : COLORS.muted,
          mb: 4,
        }}>
          Your money. Your terms.
        </Typography>

        <Typography sx={{
          fontSize: 14, fontWeight: 300,
          color: dark ? "rgba(247,243,237,0.55)" : COLORS.muted,
          maxWidth: 420, lineHeight: 1.8, mb: 5,
        }}>
          Track income, control spending, clear debt, build wealth.
          Built for how India actually earns and spends.
        </Typography>

        {/* Feature pills */}
        <Box display="flex" gap={1.5} flexWrap="wrap" mb={5}>
          {[
            "Bank statement import",
            "India tax engine",
            "Smart budgets",
            "Debt tracker",
            "FinManage Score",
          ].map(f => (
            <Box key={f} sx={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10, letterSpacing: 1.5,
              textTransform: "uppercase",
              px: 1.5, py: 0.6,
              border: `1px solid ${COLORS.saffron}44`,
              color: COLORS.saffron,
            }}>
              {f}
            </Box>
          ))}
        </Box>

        {/* Bottom meta */}
        <Box sx={{
          borderTop: `1px solid ${dark ? "rgba(247,243,237,0.08)" : COLORS.rule}`,
          pt: 3, display: "flex", gap: 6,
        }}>
          {[
            { label: "Version", value: "2.0" },
            { label: "Currency", value: "₹ INR" },
            { label: "Data", value: "Firebase" },
          ].map(m => (
            <Box key={m.label}>
              <Typography sx={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 9, letterSpacing: 3,
                textTransform: "uppercase",
                color: dark ? "rgba(247,243,237,0.3)" : COLORS.muted,
                mb: 0.3,
              }}>
                {m.label}
              </Typography>
              <Typography sx={{
                fontSize: 13,
                color: dark ? "rgba(247,243,237,0.7)" : COLORS.ink,
              }}>
                {m.value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── Right panel — sign in ── */}
      <Box sx={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: { xs: 3, sm: 5 },
        position: "relative",
      }}>
        <Box sx={{
          width: "100%", maxWidth: 380,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          background: dark
            ? "rgba(26,23,20,0.8)"
            : "rgba(255,255,255,0.8)",
          border: `1px solid ${dark
            ? "rgba(247,243,237,0.08)"
            : COLORS.rule}`,
          boxShadow: dark
            ? "0 8px 48px rgba(0,0,0,0.5)"
            : "0 8px 48px rgba(15,14,12,0.08)",
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
        }}>

          {/* Mobile logo */}
          <Box sx={{ display: { xs: "block", md: "none" }, mb: 3 }}>
            <Typography sx={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 32, fontWeight: 900,
              color: COLORS.saffron,
            }}>
              FinTrack
            </Typography>
            <Typography sx={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 16, fontStyle: "italic",
              color: "text.secondary",
            }}>
              Your money. Your terms.
            </Typography>
          </Box>

          {/* Logo mark */}
          <Box sx={{
            width: 52, height: 52, borderRadius: 2,
            background: `linear-gradient(135deg, ${COLORS.saffron}, ${COLORS.saffronDark})`,
            display: { xs: "none", md: "flex" },
            alignItems: "center", justifyContent: "center",
            mb: 3,
            boxShadow: `0 4px 20px ${COLORS.saffron}44`,
          }}>
            <Typography sx={{
              fontSize: 22, color: "white", fontWeight: 900,
              fontFamily: "'DM Mono', monospace",
            }}>
              ₹
            </Typography>
          </Box>

          <Typography sx={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 26, fontWeight: 700, mb: 0.5,
          }}>
            Welcome back
          </Typography>
          <Typography sx={{
            fontSize: 13, color: "text.secondary",
            mb: 4, lineHeight: 1.6,
          }}>
            Sign in to access your financial dashboard.
            Your data is private and stored securely.
          </Typography>

          <Button
            fullWidth variant="contained" size="large"
            startIcon={<GoogleIcon />}
            onClick={login}
            sx={{
              bgcolor: COLORS.saffron,
              "&:hover": {
                bgcolor: COLORS.saffronDark,
                transform: "translateY(-1px)",
                boxShadow: `0 6px 24px ${COLORS.saffron}44`,
              },
              py: 1.5, fontSize: 15, fontWeight: 600,
              boxShadow: `0 4px 16px ${COLORS.saffron}33`,
              transition: "all 0.2s",
            }}
          >
            Continue with Google
          </Button>

          {/* Admin link */}
          <Box textAlign="center" mt={2.5}>
            <Button
              size="small"
              onClick={() => navigate("/admin-login")}
              sx={{
                fontSize: 11,
                color: dark ? "rgba(247,243,237,0.2)" : COLORS.muted,
                fontFamily: "'DM Mono', monospace",
                letterSpacing: 1,
              }}
            >
              Admin login →
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}