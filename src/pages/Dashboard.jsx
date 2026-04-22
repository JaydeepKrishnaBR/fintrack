import { useEffect, useState } from "react";
import { db } from "../firebase/config";
import { collection, onSnapshot } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import {
  Box, Typography, Card, CardContent, Grid, Collapse,
  IconButton, LinearProgress, Divider, Chip
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { generateInsights, detectSubscriptions, getBurnRate } from "../utils/insightEngine";
import InsightCards from "../components/InsightCards";
import BurnRate from "../components/BurnRate";
import SubscriptionDetector from "../components/SubscriptionDetector";
import FinScore from "../components/FinScore";
import FilterBar from "../components/FilterBar";
import { useFilterSort } from "../hooks/useFilterSort";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function AccordionSection({ title, subtitle, icon, children, defaultOpen = false, dark }) {
  const [open, setOpen] = useState(defaultOpen);
  const glass = {
    backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
    background: dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.65)",
    border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.9)"}`,
    borderRadius: 3,
    boxShadow: dark ? "0 4px 24px rgba(0,0,0,0.3)" : "0 4px 24px rgba(0,0,0,0.06)",
    mb: 2, overflow: "hidden",
  };

  return (
    <Box sx={glass}>
      <Box
        onClick={() => setOpen(!open)}
        sx={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          px: 2.5, py: 2, cursor: "pointer",
          "&:hover": { bgcolor: dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)" },
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <Typography sx={{ fontSize: 20 }}>{icon}</Typography>
          <Box>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{title}</Typography>
            <Typography sx={{ fontSize: 12, color: dark ? "rgba(255,255,255,0.4)" : "#aaa" }}>{subtitle}</Typography>
          </Box>
        </Box>
        <IconButton size="small" sx={{ color: dark ? "rgba(255,255,255,0.4)" : "#aaa" }}>
          {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={open}>
        <Divider sx={{ opacity: 0.06 }} />
        <Box sx={{ px: 2.5, py: 2 }}>
          {children}
        </Box>
      </Collapse>
    </Box>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { resolved } = useThemeMode();
  const dark = resolved === "dark";
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

  const { filtered, dateRange, setDateRange, customFrom, setCustomFrom, customTo, setCustomTo, sortBy, setSortBy } = useFilterSort(transactions);

  const now = new Date();
  const fmt = n => "₹" + Number(Math.abs(n)).toLocaleString("en-IN");

  // Chart data — last 6 months
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const txns = transactions.filter(t => t.date?.startsWith(key));
    return {
      month: MONTHS[d.getMonth()],
      Income: Math.round(txns.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0)),
      Expense: Math.round(txns.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0)),
    };
  });

  // Filtered period totals
  const income = filtered.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
  const expense = filtered.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
  const debtPaid = filtered.filter(t => t.type === "debt").reduce((s, t) => s + Number(t.amount || 0), 0);
  const savings = income - expense - debtPaid;
  const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;
  const totalDebt = debts.reduce((s, d) => s + Number(d.remaining || 0), 0);

  const insights = generateInsights(transactions, debts, {});

  return (
    <Box>
      <Typography sx={{ fontSize: { xs: 26, sm: 32 }, fontWeight: 800, letterSpacing: "-1px", mb: 0.5 }}>
        Dashboard
      </Typography>
      <Typography sx={{ color: dark ? "rgba(255,255,255,0.45)" : "#888", mb: 2.5, fontWeight: 500 }}>
        Your complete financial overview — click any section to expand
      </Typography>

      <FilterBar
        dateRange={dateRange} setDateRange={setDateRange}
        customFrom={customFrom} setCustomFrom={setCustomFrom}
        customTo={customTo} setCustomTo={setCustomTo}
        sortBy={sortBy} setSortBy={setSortBy}
      />

      {/* Summary row */}
      <Grid container spacing={1.5} mb={2.5}>
        {[
          { label: "Income", val: fmt(income), color: "#1D9E75" },
          { label: "Expense", val: fmt(expense), color: "#E24B4A" },
          { label: "Savings", val: fmt(savings), color: "#BA7517" },
          { label: "Save rate", val: savingsRate + "%", color: savingsRate >= 20 ? "#1D9E75" : "#BA7517" },
        ].map(m => (
          <Grid item xs={6} sm={3} key={m.label}>
            <Box sx={{
              backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
              background: dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.65)",
              border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.9)"}`,
              borderRadius: 3, p: 1.5,
            }}>
              <Typography sx={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: dark ? "rgba(255,255,255,0.4)" : "#aaa", fontWeight: 700 }}>{m.label}</Typography>
              <Typography sx={{ fontSize: 20, fontWeight: 800, color: m.color, letterSpacing: "-0.5px" }}>{m.val}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Accordion sections */}
      <AccordionSection icon="💡" title="Insights" subtitle={`${insights.length} active alerts`} defaultOpen dark={dark}>
        <InsightCards insights={insights} dark={dark} />
      </AccordionSection>

      <AccordionSection icon="📊" title="Income vs Expenses" subtitle="Last 6 months trend" dark={dark}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData}>
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={v => "₹" + (v / 1000) + "k"} />
            <Tooltip formatter={v => fmt(v)} />
            <Legend />
            <Bar dataKey="Income" fill="#1D9E75" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Expense" fill="#E24B4A" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </AccordionSection>

      <AccordionSection icon="🏦" title="Debt Paydown" subtitle={`${fmt(totalDebt)} outstanding across ${debts.length} debts`} dark={dark}>
        {debts.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: dark ? "rgba(255,255,255,0.35)" : "#bbb" }}>No debts added yet.</Typography>
        ) : debts.map((debt, i) => {
          const pct = debt.total > 0 ? Math.round(((debt.total - debt.remaining) / debt.total) * 100) : 0;
          return (
            <Box key={debt.id}>
              {i > 0 && <Divider sx={{ opacity: 0.08, my: 1.5 }} />}
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{debt.name}</Typography>
                <Chip label={pct + "% paid"} size="small" sx={{ bgcolor: "rgba(29,158,117,0.12)", color: "#1D9E75", fontWeight: 700, fontSize: 11 }} />
              </Box>
              <LinearProgress variant="determinate" value={pct}
                sx={{ height: 7, borderRadius: 4, mb: 0.8,
                  bgcolor: dark ? "rgba(255,255,255,0.06)" : "#f0f0f0",
                  "& .MuiLinearProgress-bar": { bgcolor: "#BA7517", borderRadius: 4 } }} />
              <Box display="flex" justifyContent="space-between">
                <Typography sx={{ fontSize: 11, color: dark ? "rgba(255,255,255,0.35)" : "#aaa" }}>{fmt(debt.remaining)} remaining</Typography>
                <Typography sx={{ fontSize: 11, color: dark ? "rgba(255,255,255,0.35)" : "#aaa" }}>{fmt(debt.monthly)}/mo</Typography>
              </Box>
            </Box>
          );
        })}
      </AccordionSection>

      <AccordionSection icon="🔥" title="Burn Rate" subtitle="Daily spending analysis" dark={dark}>
        <BurnRate transactions={transactions} dark={dark} />
      </AccordionSection>

      <AccordionSection icon="🔁" title="Subscription Leaks" subtitle="Recurring charges detected" dark={dark}>
        <SubscriptionDetector transactions={transactions} dark={dark} />
      </AccordionSection>

      <AccordionSection icon="🏆" title="FinManage Score" subtitle="Your financial health rating" dark={dark}>
        <FinScore transactions={transactions} debts={debts} dark={dark} />
      </AccordionSection>
    </Box>
  );
}