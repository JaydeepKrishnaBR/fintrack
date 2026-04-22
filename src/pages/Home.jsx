import { useEffect, useState } from "react";
import { db } from "../firebase/config";
import { collection, onSnapshot } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { Box, Card, CardContent, Typography, Grid, Button, Divider, LinearProgress } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import SavingsIcon from "@mui/icons-material/Savings";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import FinScore from "../components/FinScore";
import { generateInsights } from "../utils/insightEngine";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function Home() {
  const { user } = useAuth();
  const { resolved } = useThemeMode();
  const dark = resolved === "dark";
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);

  useEffect(() => {
    if (!user) return;
    const u1 = onSnapshot(collection(db, "users", user.uid, "transactions"), s =>
      setTransactions(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(collection(db, "users", user.uid, "debts"), s =>
      setDebts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); };
  }, [user]);

  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonth = transactions.filter(t => t.date?.startsWith(currentKey));

  const income = thisMonth.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
  const expense = thisMonth.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
  const debtPaid = thisMonth.filter(t => t.type === "debt").reduce((s, t) => s + Number(t.amount || 0), 0);
  const savings = income - expense - debtPaid;
  const savingsPct = income > 0 ? Math.round((savings / income) * 100) : 0;
  const totalDebt = debts.reduce((s, d) => s + Number(d.remaining || 0), 0);
  const fmt = n => "₹" + Number(Math.abs(n)).toLocaleString("en-IN");

  const topInsight = generateInsights(transactions, debts, {})[0];

  const glass = {
    backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
    background: dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.65)",
    border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.9)"}`,
    borderRadius: 3,
    boxShadow: dark ? "0 4px 24px rgba(0,0,0,0.3)" : "0 4px 24px rgba(0,0,0,0.06)",
  };

  const metrics = [
    { label: "Income", value: fmt(income), color: "#1D9E75", bg: dark ? "rgba(29,158,117,0.15)" : "rgba(29,158,117,0.1)", icon: <TrendingUpIcon /> },
    { label: "Spent", value: fmt(expense), color: "#E24B4A", bg: dark ? "rgba(226,75,74,0.15)" : "rgba(226,75,74,0.08)", icon: <TrendingDownIcon /> },
    { label: "Saved", value: fmt(savings), color: savings >= 0 ? "#BA7517" : "#E24B4A", bg: dark ? "rgba(186,117,23,0.15)" : "rgba(186,117,23,0.08)", icon: <SavingsIcon /> },
  ];

  return (
    <Box>
      {/* Greeting */}
      <Typography sx={{ fontSize: { xs: 24, sm: 30 }, fontWeight: 800, letterSpacing: "-1px", mb: 0.3 }}>
        Hey, <Box component="span" sx={{ color: "#1D9E75" }}>{user?.displayName?.split(" ")[0]}</Box> 👋
      </Typography>
      <Typography sx={{ color: dark ? "rgba(255,255,255,0.45)" : "#888", mb: 2.5, fontWeight: 500, fontSize: 14 }}>
        {MONTHS[now.getMonth()]} {now.getFullYear()} · quick overview
      </Typography>

      {/* 3 metric cards */}
      <Grid container spacing={1.5} sx={{mb: 2}}>
        {metrics.map(m => (
          <Grid item xs={4} key={m.label}>
            <Box sx={{ ...glass, p: { xs: 1.2, sm: 2 } }}>
              <Box sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: m.bg, display: "flex", alignItems: "center", justifyContent: "center", color: m.color, mb: 1 }}>
                {m.icon}
              </Box>
              <Typography sx={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: dark ? "rgba(255,255,255,0.4)" : "#aaa", fontWeight: 700 }}>
                {m.label}
              </Typography>
              <Typography sx={{ fontSize: { xs: 15, sm: 18 }, fontWeight: 800, color: m.color, letterSpacing: "-0.5px", lineHeight: 1.2 }}>
                {m.value}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Savings progress bar */}
      <Box sx={{ ...glass, p: 2, mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Monthly savings rate</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: savingsPct >= 20 ? "#1D9E75" : savingsPct >= 10 ? "#BA7517" : "#E24B4A" }}>
            {savingsPct}%
          </Typography>
        </Box>
        <LinearProgress variant="determinate" value={Math.min(Math.max(savingsPct, 0), 100)}
          sx={{ height: 7, borderRadius: 4,
            bgcolor: dark ? "rgba(255,255,255,0.06)" : "#f0f0f0",
            "& .MuiLinearProgress-bar": {
              bgcolor: savingsPct >= 20 ? "#1D9E75" : savingsPct >= 10 ? "#BA7517" : "#E24B4A",
              borderRadius: 4,
            }
          }} />
        <Typography sx={{ fontSize: 16, fontWeight: 900, color: dark ? "rgba(174, 4, 4, 0.79)" : "#8f0202", mt: 0.8 }}>
          {savingsPct >= 20 ? "Great savings discipline!" : savingsPct >= 10 ? "Try to reach 20% savings" : "Low savings — review expenses"}
        </Typography>
      </Box>

      {/* Debt + FinScore in 2 columns */}
      <Grid container spacing={1.5} sx={{mb: 2}}>
        <Grid item xs={12} sm={6}>
          <Box sx={{ ...glass, p: 2, height: "100%" }}>
            <Typography sx={{ fontSize: 16, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: dark ? "rgba(255,255,255,0.4)" : "#aaa", mb: 1 }}>
              Debt
            </Typography>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: "#BA7517", letterSpacing: "-0.5px" }}>
              {fmt(totalDebt)}
            </Typography>
            <Typography sx={{ fontSize: 14, color: dark ? "rgba(255,255,255,0.35)" : "#aaa", mt: 0.3 }}>
              outstanding balance
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Box sx={{ ...glass, p: 2, height: "100%" }}>
            <Typography sx={{ fontSize: 16, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: dark ? "rgba(255,255,255,0.4)" : "#aaa", mb: 1 }}>
              FinManage Score
            </Typography>
            <FinScore transactions={transactions} debts={debts} dark={dark} compact />
          </Box>
        </Grid>
      </Grid>

      {/* Top insight */}
      {topInsight && (
        <Box sx={{
          ...glass, p: 2, mb: 2,
          background: dark ? "rgba(29,158,117,0.08)" : "rgba(29,158,117,0.06)",
          border: "1px solid rgba(29,158,117,0.2)",
        }}>
          <Box display="flex" gap={1.5} alignItems="flex-start">
            <Typography sx={{ fontSize: 20 }}>{topInsight.icon}</Typography>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#1D9E75" }}>{topInsight.title}</Typography>
              <Typography sx={{ fontSize: 12, color: dark ? "rgba(255,255,255,0.55)" : "#555", lineHeight: 1.5, mt: 0.3 }}>
                {topInsight.message}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* CTA to Dashboard */}
      <Button
        fullWidth variant="outlined" endIcon={<ArrowForwardIcon />}
        onClick={() => navigate("/dashboard")}
        sx={{
          borderRadius: 2.5, textTransform: "none", fontWeight: 700, py: 1.3,
          borderColor: dark ? "rgba(29,158,117,0.3)" : "rgba(29,158,117,0.4)",
          color: "#1D9E75",
          "&:hover": { borderColor: "#1D9E75", bgcolor: dark ? "rgba(29,158,117,0.08)" : "rgba(29,158,117,0.04)" },
        }}
      >
        View full dashboard & insights
      </Button>
    </Box>
  );
}