import { useEffect, useState } from "react";
import { db } from "../firebase/config";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import { Box, Card, CardContent, Typography, LinearProgress, Grid } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import SavingsIcon from "@mui/icons-material/Savings";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const glassCard = (dark) => ({
  elevation: 0,
  sx: {
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    background: dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.7)",
    border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.9)"}`,
    borderRadius: 3,
    boxShadow: dark ? "0 4px 24px rgba(0,0,0,0.3)" : "0 4px 24px rgba(0,0,0,0.06)",
  }
});

export default function Home() {
  const { user } = useAuth();
  const { resolved } = useThemeMode();
  const dark = resolved === "dark";
  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "transactions"), orderBy("date", "desc"));
    const u1 = onSnapshot(q, s => setTransactions(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(collection(db, "users", user.uid, "debts"), s => setDebts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); };
  }, [user]);

  const now = new Date();
  const thisMonth = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const income = thisMonth.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = thisMonth.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const debtPaid = thisMonth.filter(t => t.type === "debt").reduce((s, t) => s + Number(t.amount), 0);
  const savings = income - expense - debtPaid;

  const catMap = {};
  thisMonth.filter(t => t.type === "expense").forEach(t => {
    catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount);
  });
  const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCat = topCats[0]?.[1] || 1;
  const totalDebt = debts.reduce((s, d) => s + Number(d.remaining || 0), 0);
  const fmt = (n) => "₹" + Number(n).toLocaleString("en-IN");

  const metrics = [
    { label: "Income", value: fmt(income), color: "#1D9E75", bg: dark ? "rgba(29,158,117,0.15)" : "rgba(29,158,117,0.1)", icon: <TrendingUpIcon /> },
    { label: "Expenses", value: fmt(expense), color: "#E24B4A", bg: dark ? "rgba(226,75,74,0.15)" : "rgba(226,75,74,0.08)", icon: <TrendingDownIcon /> },
    { label: "Savings", value: fmt(savings), color: "#BA7517", bg: dark ? "rgba(186,117,23,0.15)" : "rgba(186,117,23,0.08)", icon: <SavingsIcon /> },
  ];

  return (
    <Box>
      <Typography sx={{ fontSize: { xs: 26, sm: 32 }, fontWeight: 800, letterSpacing: "-1px", lineHeight: 1.1, mb: 0.5 }}>
        Good morning,{" "}
        <Box component="span" sx={{ color: "#1D9E75" }}>{user?.displayName?.split(" ")[0]}</Box> 👋
      </Typography>
      <Typography sx={{ color: dark ? "rgba(255,255,255,0.45)" : "#888", mb: 3, fontWeight: 500 }}>
        {MONTHS[now.getMonth()]} {now.getFullYear()} — here's your financial snapshot
      </Typography>

      <Grid container spacing={2} mb={3}>
        {metrics.map(m => (
          <Grid item xs={12} sm={4} key={m.label} sx={{mb: 2}}>
            <Card {...glassCard(dark)}>
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box sx={{ width: 42, height: 42, borderRadius: 2.5, bgcolor: m.bg, display: "flex", alignItems: "center", justifyContent: "center", color: m.color }}>
                  {m.icon}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11, color: dark ? "rgba(255,255,255,0.4)" : "#999", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>{m.label}</Typography>
                  <Typography sx={{ fontSize: 20, fontWeight: 800, color: m.color, letterSpacing: "-0.5px" }}>{m.value}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card {...glassCard(dark)} sx={{ ...glassCard(dark).sx, mb: 2 }}>
        <CardContent>
          <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: dark ? "rgba(255,255,255,0.4)" : "#aaa", mb: 2 }}>
            Top Expenses This Month
          </Typography>
          {topCats.length === 0 && <Typography sx={{ color: dark ? "rgba(255,255,255,0.35)" : "#bbb", fontSize: 14 }}>No expenses logged yet.</Typography>}
          {topCats.map(([cat, amt]) => (
            <Box key={cat} mb={1.5}>
              <Box display="flex" justifyContent="space-between" mb={0.5}>
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{cat}</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#E24B4A" }}>{fmt(amt)}</Typography>
              </Box>
              <LinearProgress variant="determinate" value={(amt / maxCat) * 100}
                sx={{ height: 6, borderRadius: 3, bgcolor: dark ? "rgba(255,255,255,0.06)" : "#f0f0f0", "& .MuiLinearProgress-bar": { bgcolor: "#E24B4A", borderRadius: 3 } }} />
            </Box>
          ))}
        </CardContent>
      </Card>

      <Card {...glassCard(dark)} sx={{ ...glassCard(dark).sx }}>
        <CardContent>
          <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: dark ? "rgba(255,255,255,0.4)" : "#aaa", mb: 1.5 }}>
            Debt Snapshot
          </Typography>
          {[
            { label: "Total owed", val: fmt(totalDebt), color: "#BA7517" },
            { label: "Paid this month", val: fmt(debtPaid), color: "#1D9E75" },
          ].map(r => (
            <Box key={r.label} display="flex" justifyContent="space-between" py={0.5}>
              <Typography sx={{ fontSize: 13, color: dark ? "rgba(255,255,255,0.45)" : "#888" }}>{r.label}</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: r.color }}>{r.val}</Typography>
            </Box>
          ))}
          {debts.length === 0 && <Typography sx={{ color: dark ? "rgba(255,255,255,0.3)" : "#ccc", fontSize: 13, mt: 0.5 }}>No debts added yet.</Typography>}
        </CardContent>
      </Card>
    </Box>
  );
}