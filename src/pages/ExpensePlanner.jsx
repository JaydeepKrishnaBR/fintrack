import { useEffect, useState } from "react";
import { db } from "../firebase/config";
import {
  collection, onSnapshot, addDoc, updateDoc,
  deleteDoc, doc, setDoc, getDoc, Timestamp
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import {
  Box, Typography, Grid, TextField, Button, IconButton,
  Chip, LinearProgress, Divider, MenuItem, Dialog,
  DialogTitle, DialogContent, DialogActions, Tooltip
} from "@mui/material";
import Masonry from "@mui/lab/Masonry";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import EventNoteIcon from "@mui/icons-material/EventNote";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  getDailyLimit, getWeeklyDigest,
  getSmartSuggestions, getNoSpendDays, canAfford,
} from "../utils/plannerEngine";

const CATEGORIES = [
  "Rent","Groceries","Transport","Dining","Utilities",
  "Shopping","Health","Education","Entertainment","Other",
];

const MOOD_OPTIONS = [
  { value: "necessary", label: "Necessary", emoji: "✅", color: "#1D9E75" },
  { value: "happy",     label: "Happy",     emoji: "😊", color: "#378ADD" },
  { value: "regretted", label: "Regretted", emoji: "😬", color: "#E24B4A" },
];

const MONTH_NAMES = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

export default function ExpensePlanner() {
  const { user } = useAuth();
  const { resolved } = useThemeMode();
  const dark = resolved === "dark";
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [transactions, setTransactions]  = useState([]);
  const [debts, setDebts]                = useState([]);
  const [plannedExpenses, setPlanned]    = useState([]);
  const [budgets, setBudgets]            = useState({});
  const [moods, setMoods]                = useState({});
  const [balance, setBalance]            = useState("");
  const [affordAmount, setAffordAmount]  = useState("");
  const [newPlanned, setNewPlanned]      = useState({ name: "", amount: "", dueDay: "", category: "Rent" });
  const [newBudgetCat, setNewBudgetCat]  = useState("Groceries");
  const [newBudgetAmt, setNewBudgetAmt]  = useState("");
  const [quickAmt, setQuickAmt]          = useState("");
  const [quickCat, setQuickCat]          = useState("Dining");
  const [quickOpen, setQuickOpen]        = useState(false);
  const [showAllSuggestions, setShowAll] = useState(false);

  const fmt = n => "₹" + Number(Math.abs(n || 0)).toLocaleString("en-IN");

  useEffect(() => {
    if (!user) return;
    const u1 = onSnapshot(collection(db, "users", user.uid, "transactions"), s =>
      setTransactions(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(collection(db, "users", user.uid, "debts"), s =>
      setDebts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u3 = onSnapshot(collection(db, "users", user.uid, "plannedExpenses"), s =>
      setPlanned(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    getDoc(doc(db, "users", user.uid, "budgets", currentMonthKey)).then(d => {
      if (d.exists()) setBudgets(d.data());
    });
    const u4 = onSnapshot(collection(db, "users", user.uid, "moods"), s =>
      setMoods(Object.fromEntries(s.docs.map(d => [d.id, d.data().mood]))));
    return () => { u1(); u2(); u3(); u4(); };
  }, [user]);

  // ── Computed ─────────────────────────────────────────────────────────────
  const bal = Number(balance) || 0;
  const dailyData    = getDailyLimit(transactions, plannedExpenses, bal);
  const weekData     = getWeeklyDigest(transactions);
  const suggestions  = getSmartSuggestions(transactions, budgets);
  const { days: nsDays, streak, noSpendCount } = getNoSpendDays(transactions);
  const affordData   = affordAmount
    ? canAfford(affordAmount, transactions, bal, debts)
    : null;

  const currentMonthTxns = transactions.filter(t => t.date?.startsWith(currentMonthKey));
  const catSpend = {};
  currentMonthTxns.filter(t => t.type === "expense").forEach(t => {
    catSpend[t.category] = (catSpend[t.category] || 0) + Number(t.amount || 0);
  });

  const moodBreakdown = { necessary: 0, happy: 0, regretted: 0 };
  currentMonthTxns.filter(t => t.type === "expense").forEach(t => {
    const mood = moods[t.id];
    if (mood) moodBreakdown[mood] = (moodBreakdown[mood] || 0) + Number(t.amount || 0);
  });
  const totalMooded = Object.values(moodBreakdown).reduce((s, v) => s + v, 0);
  const todayKey = now.toISOString().split("T")[0];
  const todayTxns = transactions.filter(t => t.date === todayKey && t.type === "expense");

  // ── Priority card numbers ─────────────────────────────────────────────────
  const totalPlanned = plannedExpenses.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalBudget  = Object.values(budgets).reduce((s, v) => s + Number(v || 0), 0);
  const totalActualSpend = Object.values(catSpend).reduce((s, v) => s + v, 0);
  const budgetUsedPct = totalBudget > 0
    ? Math.min(100, Math.round((totalActualSpend / totalBudget) * 100))
    : 0;
  const budgetRemaining = totalBudget - totalActualSpend;
  const upcomingThisWeek = plannedExpenses.filter(p => {
    const daysUntil = p.dueDay - now.getDate();
    return !p.paid && daysUntil >= 0 && daysUntil <= 7;
  });
  const overBudgetCats = Object.entries(budgets).filter(([cat, budget]) =>
    (catSpend[cat] || 0) > budget
  );

  // ── Handlers ─────────────────────────────────────────────────────────────
  const saveBudget = async () => {
    if (!newBudgetCat || !newBudgetAmt) return;
    const updated = { ...budgets, [newBudgetCat]: Number(newBudgetAmt) };
    await setDoc(doc(db, "users", user.uid, "budgets", currentMonthKey), updated);
    setBudgets(updated);
    setNewBudgetAmt("");
  };

  const removeBudget = async (cat) => {
    const updated = { ...budgets };
    delete updated[cat];
    await setDoc(doc(db, "users", user.uid, "budgets", currentMonthKey), updated);
    setBudgets(updated);
  };

  const addPlanned = async () => {
    if (!newPlanned.name || !newPlanned.amount) return;
    await addDoc(collection(db, "users", user.uid, "plannedExpenses"), {
      ...newPlanned,
      amount: Number(newPlanned.amount),
      dueDay: Number(newPlanned.dueDay) || 1,
      paid: false,
      createdAt: Timestamp.now(),
    });
    setNewPlanned({ name: "", amount: "", dueDay: "", category: "Rent" });
  };

  const togglePaid = async (expense) => {
    await updateDoc(
      doc(db, "users", user.uid, "plannedExpenses", expense.id),
      { paid: !expense.paid }
    );
  };

  const deletePlanned = async (id) => {
    await deleteDoc(doc(db, "users", user.uid, "plannedExpenses", id));
  };

  const quickLog = async () => {
    if (!quickAmt) return;
    await addDoc(collection(db, "users", user.uid, "transactions"), {
      type: "expense", amount: Number(quickAmt),
      category: quickCat,
      date: now.toISOString().split("T")[0],
      note: "Quick log",
      createdAt: Timestamp.now(),
    });
    setQuickAmt(""); setQuickOpen(false);
  };

  const setMood = async (txnId, mood) => {
    await setDoc(doc(db, "users", user.uid, "moods", txnId), { mood });
  };

  // ── Style helpers ─────────────────────────────────────────────────────────
  const glass = (extra = {}) => ({
    backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
    background: dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.65)",
    border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.9)"}`,
    borderRadius: 3,
    boxShadow: dark
      ? "0 4px 24px rgba(0,0,0,0.3)"
      : "0 4px 24px rgba(0,0,0,0.06)",
    p: 2.5,
    ...extra,
  });

  const sectionLabel = {
    fontSize: 11, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: 0.8,
    color: dark ? "rgba(255,255,255,0.4)" : "#aaa",
    mb: 2,
  };

  const verdictConfig = {
    yes:     { color: "#1D9E75", label: "Yes, you can afford it ✅",   bg: "rgba(29,158,117,0.1)"  },
    caution: { color: "#BA7517", label: "Possible — but be careful ⚠️", bg: "rgba(186,117,23,0.1)" },
    no:      { color: "#E24B4A", label: "Not right now ❌",             bg: "rgba(226,75,74,0.1)"  },
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box pb={10}>

      {/* ── Page header ────────────────────────────────────────────────── */}
      <Box display="flex" alignItems="center" justifyContent="space-between"
        flexWrap="wrap" gap={1} mb={3}>
        <Box>
          <Typography sx={{
            fontSize: { xs: 26, sm: 32 }, fontWeight: 800,
            letterSpacing: "-1px", mb: 0.3,
          }}>
            Expense Planner
          </Typography>
          <Typography sx={{
            color: dark ? "rgba(255,255,255,0.45)" : "#888",
            fontWeight: 500,
          }}>
            Plan ahead. Spend smart. Stay in control.
          </Typography>
        </Box>
        <Button
          variant="contained" startIcon={<AddIcon />}
          onClick={() => setQuickOpen(true)}
          sx={{
            bgcolor: "#1D9E75", "&:hover": { bgcolor: "#0F6E56" },
            borderRadius: 2.5, textTransform: "none", fontWeight: 700,
            boxShadow: "0 4px 16px rgba(29,158,117,0.35)",
          }}
        >
          Quick Log
        </Button>
      </Box>

      {/* ── Priority Summary Card ───────────────────────────────────────── */}
      <Box sx={{
        ...glass({ p: 0 }),
        mb: 3, overflow: "hidden",
        border: `1px solid ${dark ? "rgba(29,158,117,0.25)" : "rgba(29,158,117,0.2)"}`,
      }}>
        {/* Card header */}
        <Box sx={{
          px: 2.5, py: 2,
          background: dark
            ? "linear-gradient(135deg, rgba(29,158,117,0.15) 0%, rgba(29,158,117,0.05) 100%)"
            : "linear-gradient(135deg, rgba(29,158,117,0.1) 0%, rgba(29,158,117,0.03) 100%)",
          borderBottom: `1px solid ${dark ? "rgba(29,158,117,0.15)" : "rgba(29,158,117,0.12)"}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 1,
        }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{
              width: 36, height: 36, borderRadius: 2,
              background: "linear-gradient(135deg, #1D9E75, #0a7a57)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <AccountBalanceWalletIcon sx={{ color: "white", fontSize: 18 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.3px" }}>
                {MONTH_NAMES[now.getMonth()]} {now.getFullYear()} — Financial Position
              </Typography>
              <Typography sx={{ fontSize: 12, color: dark ? "rgba(255,255,255,0.45)" : "#888" }}>
                Budget · Planned expenses · Alerts
              </Typography>
            </Box>
          </Box>
          {overBudgetCats.length > 0 && (
            <Chip
              icon={<WarningAmberIcon sx={{ fontSize: 14 }} />}
              label={`${overBudgetCats.length} over budget`}
              size="small"
              sx={{
                bgcolor: "rgba(226,75,74,0.12)", color: "#E24B4A",
                fontWeight: 700, fontSize: 11,
                "& .MuiChip-icon": { color: "#E24B4A" },
              }}
            />
          )}
        </Box>

        {/* Metrics row */}
        <Box sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, 1fr)",
            sm: "repeat(3, 1fr)",
            md: "repeat(6, 1fr)",
          },
          borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "#f0f0f0"}`,
        }}>
          {[
            {
              label: "Total Planned",
              value: fmt(totalPlanned),
              sub: `${plannedExpenses.length} bills`,
              color: "#E24B4A",
              icon: "📆",
            },
            {
              label: "Total Budget",
              value: fmt(totalBudget),
              sub: `${Object.keys(budgets).length} categories`,
              color: "#378ADD",
              icon: "📋",
            },
            {
              label: "Actually Spent",
              value: fmt(totalActualSpend),
              sub: "this month",
              color: "#BA7517",
              icon: "💸",
            },
            {
              label: "Budget Remaining",
              value: fmt(Math.max(0, budgetRemaining)),
              sub: budgetUsedPct + "% used",
              color: budgetRemaining >= 0 ? "#1D9E75" : "#E24B4A",
              icon: budgetRemaining >= 0 ? "✅" : "⚠️",
            },
            {
              label: "Due This Week",
              value: upcomingThisWeek.length + " bills",
              sub: fmt(upcomingThisWeek.reduce((s, p) => s + Number(p.amount || 0), 0)),
              color: upcomingThisWeek.length > 0 ? "#BA7517" : "#1D9E75",
              icon: "🔔",
            },
            {
              label: "Daily Safe Limit",
              value: bal > 0 ? fmt(dailyData.safeDaily) : "—",
              sub: bal > 0 ? `${dailyData.daysLeft} days left` : "Enter balance",
              color: "#9c27b0",
              icon: "📅",
            },
          ].map((m, i, arr) => (
            <Box key={m.label} sx={{
              px: 2, py: 1.8,
              borderRight: i < arr.length - 1
                ? `1px solid ${dark ? "rgba(255,255,255,0.06)" : "#f0f0f0"}`
                : "none",
              borderBottom: {
                xs: i < 4 ? `1px solid ${dark ? "rgba(255,255,255,0.06)" : "#f0f0f0"}` : "none",
                sm: i < 3 ? `1px solid ${dark ? "rgba(255,255,255,0.06)" : "#f0f0f0"}` : "none",
                md: "none",
              },
            }}>
              <Typography sx={{ fontSize: 16, mb: 0.3 }}>{m.icon}</Typography>
              <Typography sx={{
                fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: 0.5,
                color: dark ? "rgba(255,255,255,0.4)" : "#aaa",
                mb: 0.3,
              }}>
                {m.label}
              </Typography>
              <Typography sx={{
                fontSize: 17, fontWeight: 800,
                letterSpacing: "-0.5px", color: m.color,
                lineHeight: 1.1,
              }}>
                {m.value}
              </Typography>
              <Typography sx={{
                fontSize: 11,
                color: dark ? "rgba(255,255,255,0.35)" : "#aaa",
                mt: 0.2,
              }}>
                {m.sub}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Budget progress bar */}
        {totalBudget > 0 && (
          <Box sx={{ px: 2.5, py: 1.5 }}>
            <Box display="flex" justifyContent="space-between" mb={0.6}>
              <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                Overall budget usage
              </Typography>
              <Typography sx={{
                fontSize: 12, fontWeight: 800,
                color: budgetUsedPct >= 100
                  ? "#E24B4A" : budgetUsedPct >= 80
                  ? "#BA7517" : "#1D9E75",
              }}>
                {budgetUsedPct}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={budgetUsedPct}
              sx={{
                height: 7, borderRadius: 4,
                bgcolor: dark ? "rgba(255,255,255,0.06)" : "#f0f0f0",
                "& .MuiLinearProgress-bar": {
                  bgcolor: budgetUsedPct >= 100
                    ? "#E24B4A" : budgetUsedPct >= 80
                    ? "#BA7517" : "#1D9E75",
                  borderRadius: 4,
                },
              }}
            />
            {overBudgetCats.length > 0 && (
              <Box display="flex" gap={0.8} flexWrap="wrap" mt={1}>
                {overBudgetCats.map(([cat]) => (
                  <Chip
                    key={cat}
                    label={`${cat} over`}
                    size="small"
                    sx={{
                      bgcolor: "rgba(226,75,74,0.1)",
                      color: "#E24B4A",
                      fontWeight: 700, fontSize: 10, height: 20,
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* ── Masonry grid of planner cards ──────────────────────────────── */}
      <Masonry columns={{ xs: 1, sm: 2, md: 2, lg: 3 }} spacing={2}>

        {/* Section 4 — Daily Spending Limit */}
        <Box sx={glass()}>
          <Typography sx={sectionLabel}>📅 Daily Spending Limit</Typography>
          <TextField
            size="small" fullWidth label="Current bank balance (₹)"
            type="number" value={balance}
            onChange={e => setBalance(e.target.value)}
            sx={{ mb: 2 }}
          />
          {bal > 0 ? (
            <>
              <Box sx={{
                p: 2, borderRadius: 2.5, textAlign: "center", mb: 1.5,
                background: dailyData.remainingToday > 0
                  ? "rgba(29,158,117,0.1)" : "rgba(226,75,74,0.1)",
                border: `1px solid ${dailyData.remainingToday > 0
                  ? "rgba(29,158,117,0.3)" : "rgba(226,75,74,0.3)"}`,
              }}>
                <Typography sx={{
                  fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: 0.5,
                  color: dark ? "rgba(255,255,255,0.4)" : "#888", mb: 0.5,
                }}>
                  Safe to spend today
                </Typography>
                <Typography sx={{
                  fontSize: 36, fontWeight: 900, letterSpacing: "-2px",
                  color: dailyData.remainingToday > 0 ? "#1D9E75" : "#E24B4A",
                }}>
                  {fmt(dailyData.safeDaily)}
                </Typography>
              </Box>
              <Box sx={{
                display: "grid", gridTemplateColumns: "1fr 1fr",
                gap: 1,
              }}>
                {[
                  { label: "Spent today",     val: fmt(dailyData.spentToday),    color: "#E24B4A" },
                  { label: "Remaining today", val: fmt(dailyData.remainingToday), color: dailyData.remainingToday > 0 ? "#1D9E75" : "#E24B4A" },
                  { label: "Planned bills",   val: fmt(dailyData.plannedTotal),  color: "#BA7517" },
                  { label: "Days left",       val: dailyData.daysLeft,           color: "#378ADD" },
                ].map(m => (
                  <Box key={m.label} sx={{
                    p: 1.2, borderRadius: 2, textAlign: "center",
                    background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                  }}>
                    <Typography sx={{
                      fontSize: 10, textTransform: "uppercase",
                      letterSpacing: 0.5,
                      color: dark ? "rgba(255,255,255,0.35)" : "#aaa",
                      fontWeight: 700,
                    }}>
                      {m.label}
                    </Typography>
                    <Typography sx={{ fontSize: 16, fontWeight: 800, color: m.color }}>
                      {m.val}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </>
          ) : (
            <Typography sx={{ fontSize: 13, color: dark ? "rgba(255,255,255,0.35)" : "#bbb" }}>
              Enter your balance above to see your daily limit.
            </Typography>
          )}
        </Box>

        {/* Section 3 — Can I Afford This? */}
        <Box sx={glass()}>
          <Typography sx={sectionLabel}>🤔 Can I Afford This?</Typography>
          <TextField
            size="small" fullWidth label="Purchase amount (₹)"
            type="number" value={affordAmount}
            onChange={e => setAffordAmount(e.target.value)}
            sx={{ mb: 2 }}
          />
          {affordData ? (
            <Box>
              <Box sx={{
                p: 2, borderRadius: 2.5, mb: 2,
                background: verdictConfig[affordData.verdict].bg,
                border: `1px solid ${verdictConfig[affordData.verdict].color}40`,
              }}>
                <Typography sx={{
                  fontSize: 15, fontWeight: 800,
                  color: verdictConfig[affordData.verdict].color,
                }}>
                  {verdictConfig[affordData.verdict].label}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.8 }}>
                {[
                  { label: "Current balance",      val: fmt(affordData.currentBalance) },
                  { label: "Monthly savings",       val: affordData.monthlySavings > 0 ? fmt(affordData.monthlySavings) : "—" },
                  { label: "Months to save up",     val: affordData.monthsToSave ? `${affordData.monthsToSave} months` : "—" },
                  { label: "6-month EMI",           val: fmt(affordData.emi6) + "/mo" },
                  { label: "12-month EMI",          val: fmt(affordData.emi12) + "/mo" },
                  affordData.emiImpact6 && { label: "Expense ratio w/ EMI", val: affordData.emiImpact6 + "% of income" },
                ].filter(Boolean).map(r => (
                  <Box key={r.label} display="flex" justifyContent="space-between">
                    <Typography sx={{ fontSize: 13, color: dark ? "rgba(255,255,255,0.5)" : "#888" }}>
                      {r.label}
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{r.val}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          ) : (
            <Typography sx={{ fontSize: 13, color: dark ? "rgba(255,255,255,0.35)" : "#bbb" }}>
              Enter a purchase amount to get a personalised verdict.
            </Typography>
          )}
        </Box>

        {/* Section 1 — Monthly Budget Planner */}
        <Box sx={glass()}>
          <Typography sx={sectionLabel}>
            📋 Monthly Budget — {MONTH_NAMES[now.getMonth()]} {now.getFullYear()}
          </Typography>
          <Box display="flex" gap={1.5} flexWrap="wrap" mb={2}>
            <TextField select size="small" label="Category"
              value={newBudgetCat} onChange={e => setNewBudgetCat(e.target.value)}
              sx={{ minWidth: 140 }}>
              {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <TextField size="small" label="Budget (₹)" type="number"
              value={newBudgetAmt} onChange={e => setNewBudgetAmt(e.target.value)}
              sx={{ width: 120 }}
              onKeyDown={e => e.key === "Enter" && saveBudget()}
            />
            <Button variant="outlined" onClick={saveBudget}
              sx={{
                borderRadius: 2, textTransform: "none", fontWeight: 700,
                borderColor: "#1D9E75", color: "#1D9E75",
              }}>
              Set
            </Button>
          </Box>
          {Object.keys(budgets).length === 0 ? (
            <Typography sx={{ fontSize: 13, color: dark ? "rgba(255,255,255,0.35)" : "#bbb" }}>
              No budgets set. Add a category above.
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {Object.entries(budgets).map(([cat, budget]) => {
                const spent = Math.round(catSpend[cat] || 0);
                const pct = Math.min(100, Math.round((spent / budget) * 100));
                const over = spent > budget;
                const barColor = pct >= 100 ? "#E24B4A" : pct >= 80 ? "#BA7517" : "#1D9E75";
                return (
                <Box>
                  <Box key={cat}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                      <Box display="flex" alignItems="center" gap={0.8}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{cat}</Typography>
                        {over && (
                          <Chip label="Over" size="small" sx={{
                            bgcolor: "rgba(226,75,74,0.12)", color: "#E24B4A",
                            fontWeight: 700, fontSize: 10, height: 16,
                          }} />
                        )}
                      </Box>
                      <Box display="flex" alignItems="center" gap={0.5} >
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: barColor }}>
                          {fmt(spent)}/{fmt(budget)}
                        </Typography>
                        <IconButton size="small" onClick={() => removeBudget(cat)} sx={{ p: 0.3 }}>
                          <DeleteIcon sx={{ fontSize: 13, color: "#E24B4A" }} />
                        </IconButton>
                      </Box>
                    </Box>
                    <LinearProgress variant="determinate" value={pct}
                      sx={{
                        height: 6, borderRadius: 3,
                        bgcolor: dark ? "rgba(255,255,255,0.06)" : "#f0f0f0",
                        "& .MuiLinearProgress-bar": { bgcolor: barColor, borderRadius: 3 },
                      }} />
                    <Typography sx={{
                      fontSize: 11,
                      color: dark ? "rgba(255,255,255,0.35)" : "#aaa",
                      mt: 0.4,
                    }}>
                      {over
                        ? `Over by ${fmt(Math.abs(budget - spent))}`
                        : `${fmt(budget - spent)} remaining`}
                    </Typography>
                  </Box>
                </Box>
                );
              })}
            </Box>
          )}
        </Box>

        {/* Section 2 — Upcoming Planned Expenses */}
        <Box sx={glass()}>
          <Typography sx={sectionLabel}>📆 Upcoming Planned Expenses</Typography>
          <Box display="flex" flexDirection="column" gap={1.5} mb={2}>
            <Box display="flex" gap={1.5} flexWrap="wrap">
              <TextField size="small" label="Name" value={newPlanned.name}
                onChange={e => setNewPlanned(p => ({ ...p, name: e.target.value }))}
                sx={{ flex: 1, minWidth: 110 }} />
              <TextField size="small" label="Amount (₹)" type="number"
                value={newPlanned.amount}
                onChange={e => setNewPlanned(p => ({ ...p, amount: e.target.value }))}
                sx={{ width: 110 }} />
              <TextField size="small" label="Due day" type="number"
                value={newPlanned.dueDay}
                onChange={e => setNewPlanned(p => ({ ...p, dueDay: e.target.value }))}
                sx={{ width: 80 }} inputProps={{ min: 1, max: 31 }} />
            </Box>
            <Box display="flex" gap={1.5} flexWrap="wrap" alignItems="center">
              <TextField select size="small" label="Category"
                value={newPlanned.category}
                onChange={e => setNewPlanned(p => ({ ...p, category: e.target.value }))}
                sx={{ minWidth: 130 }}>
                {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
              <Button variant="outlined" onClick={addPlanned}
                sx={{
                  borderRadius: 2, textTransform: "none", fontWeight: 700,
                  borderColor: "#1D9E75", color: "#1D9E75",
                }}>
                Add
              </Button>
            </Box>
          </Box>
          {plannedExpenses.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: dark ? "rgba(255,255,255,0.35)" : "#bbb" }}>
              No planned expenses yet.
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              {plannedExpenses
                .sort((a, b) => a.dueDay - b.dueDay)
                .map((expense, i) => {
                  const daysUntil = expense.dueDay - now.getDate();
                  const isUrgent = daysUntil >= 0 && daysUntil <= 3;
                  const isPast   = daysUntil < 0;
                  const suffix   = ["st","nd","rd"][expense.dueDay % 10 - 1] || "th";
                  return (
                    <Box key={expense.id}>
                      {i > 0 && <Divider sx={{ opacity: 0.06 }} />}
                      <Box display="flex" alignItems="center" gap={1.2} py={1}>
                        <IconButton size="small" onClick={() => togglePaid(expense)} sx={{ p: 0.3 }}>
                          {expense.paid
                            ? <CheckCircleIcon sx={{ fontSize: 20, color: "#1D9E75" }} />
                            : <RadioButtonUncheckedIcon sx={{ fontSize: 20, color: dark ? "rgba(255,255,255,0.3)" : "#ccc" }} />}
                        </IconButton>
                        <Box flex={1} minWidth={0}>
                          <Typography sx={{
                            fontSize: 13, fontWeight: 700,
                            textDecoration: expense.paid ? "line-through" : "none",
                            color: expense.paid ? (dark ? "rgba(255,255,255,0.3)" : "#bbb") : "inherit",
                          }}>
                            {expense.name}
                          </Typography>
                          <Typography sx={{
                            fontSize: 11,
                            color: isUrgent ? "#BA7517" : isPast ? "#E24B4A" : dark ? "rgba(255,255,255,0.35)" : "#aaa",
                          }}>
                            Due {expense.dueDay}{suffix} ·{" "}
                            {expense.paid ? "Paid ✅"
                              : isPast ? "Past due ⚠️"
                              : isUrgent ? `Due in ${daysUntil}d 🔔`
                              : `${daysUntil} days`}
                          </Typography>
                        </Box>
                        <Typography sx={{
                          fontSize: 13, fontWeight: 800, whiteSpace: "nowrap",
                          color: expense.paid
                            ? (dark ? "rgba(255,255,255,0.3)" : "#bbb")
                            : "#E24B4A",
                        }}>
                          {fmt(expense.amount)}
                        </Typography>
                        <IconButton size="small" onClick={() => deletePlanned(expense.id)} sx={{ p: 0.3 }}>
                          <DeleteIcon sx={{ fontSize: 13, color: "#E24B4A" }} />
                        </IconButton>
                      </Box>
                    </Box>
                  );
                })}
              <Divider sx={{ opacity: 0.06, mt: 0.5 }} />
              <Box display="flex" justifyContent="space-between" pt={1}>
                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Total</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#E24B4A" }}>
                  {fmt(plannedExpenses.reduce((s, p) => s + Number(p.amount || 0), 0))}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>

        {/* Section 9 — No-Spend Day Tracker */}
        <Box sx={glass()}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Typography sx={sectionLabel}>🔥 No-Spend Day Tracker</Typography>
            <Box textAlign="right">
              <Typography sx={{ fontSize: 22, fontWeight: 900, color: "#1D9E75", lineHeight: 1 }}>
                {streak}
              </Typography>
              <Typography sx={{ fontSize: 10, color: dark ? "rgba(255,255,255,0.35)" : "#aaa", fontWeight: 700 }}>
                day streak
              </Typography>
            </Box>
          </Box>
          <Box sx={{
            display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
            gap: 0.7, mb: 1.5,
          }}>
            {["S","M","T","W","T","F","S"].map((d, i) => (
              <Typography key={i} sx={{
                fontSize: 10, textAlign: "center", fontWeight: 700,
                color: dark ? "rgba(255,255,255,0.3)" : "#ccc",
              }}>
                {d}
              </Typography>
            ))}
            {Array.from(
              { length: new Date(now.getFullYear(), now.getMonth(), 1).getDay() },
              (_, i) => <Box key={`e${i}`} />
            )}
            {nsDays.map(({ day, isNoSpend, isSpend, isFuture }) => (
              <Tooltip
                key={day}
                title={isFuture ? "" : isNoSpend ? `${day} — No spend ✅` : `${day} — Spent`}
              >
                <Box sx={{
                  aspectRatio: "1", borderRadius: 1.5,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700,
                  background: isFuture ? "transparent"
                    : isNoSpend ? "rgba(29,158,117,0.2)"
                    : isSpend   ? "rgba(226,75,74,0.15)"
                    : "transparent",
                  border: isFuture
                    ? `1px dashed ${dark ? "rgba(255,255,255,0.06)" : "#eee"}`
                    : "none",
                  color: isNoSpend ? "#1D9E75"
                    : isSpend   ? "#E24B4A"
                    : dark      ? "rgba(255,255,255,0.3)" : "#bbb",
                }}>
                  {day}
                </Box>
              </Tooltip>
            ))}
          </Box>
          <Box display="flex" gap={2}>
            {[
              { label: "No-spend days", val: noSpendCount, color: "#1D9E75" },
              { label: "Spend days", val: nsDays.filter(d => d.isSpend).length, color: "#E24B4A" },
            ].map(m => (
              <Box key={m.label} display="flex" alignItems="center" gap={0.8}>
                <Box sx={{
                  width: 10, height: 10, borderRadius: 1,
                  bgcolor: m.color + "33",
                  border: `1.5px solid ${m.color}`,
                }} />
                <Typography sx={{ fontSize: 12, color: dark ? "rgba(255,255,255,0.5)" : "#888" }}>
                  {m.val} {m.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Section 6 — Weekly Spending Digest */}
        <Box sx={glass()}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography sx={sectionLabel}>📊 Weekly Digest</Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography sx={{ fontSize: 13, fontWeight: 800 }}>
                {fmt(weekData.thisTotal)}
              </Typography>
              {weekData.totalPct !== null && (
                <Chip
                  label={`${weekData.totalPct >= 0 ? "+" : ""}${weekData.totalPct}%`}
                  size="small"
                  sx={{
                    bgcolor: weekData.totalPct > 0
                      ? "rgba(226,75,74,0.12)" : "rgba(29,158,117,0.12)",
                    color: weekData.totalPct > 0 ? "#E24B4A" : "#1D9E75",
                    fontWeight: 700, fontSize: 11,
                  }}
                />
              )}
            </Box>
          </Box>
          {weekData.categories.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: dark ? "rgba(255,255,255,0.35)" : "#bbb" }}>
              No spending this week yet.
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {weekData.categories.map(({ cat, cur, prev, pct }) => (
                <Box key={cat} sx={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  py: 0.8,
                  borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.04)" : "#f5f5f5"}`,
                }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{cat}</Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography sx={{ fontSize: 12, color: dark ? "rgba(255,255,255,0.4)" : "#aaa" }}>
                      {fmt(prev)}
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 800 }}>
                      {fmt(cur)}
                    </Typography>
                    {pct !== null && (
                      <Chip
                        label={`${pct > 0 ? "+" : ""}${pct}%`}
                        size="small"
                        sx={{
                          bgcolor: pct > 0
                            ? "rgba(226,75,74,0.1)" : "rgba(29,158,117,0.1)",
                          color: pct > 0 ? "#E24B4A" : "#1D9E75",
                          fontWeight: 700, fontSize: 10, height: 18,
                        }}
                      />
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Section 8 — Spending Mood Tracker */}
        <Box sx={glass()}>
          <Typography sx={sectionLabel}>😊 Spending Mood Tracker</Typography>
          {todayTxns.length > 0 ? (
            <Box mb={2}>
              <Typography sx={{
                fontSize: 12, color: dark ? "rgba(255,255,255,0.45)" : "#888", mb: 1,
              }}>
                Tag today's spending:
              </Typography>
              {todayTxns.map(t => (
                <Box key={t.id} sx={{
                  display: "flex", alignItems: "center",
                  justifyContent: "space-between", py: 0.8,
                  borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "#f5f5f5"}`,
                }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                    {t.category} — {fmt(t.amount)}
                  </Typography>
                  <Box display="flex" gap={0.5}>
                    {MOOD_OPTIONS.map(m => (
                      <Tooltip key={m.value} title={m.label}>
                        <IconButton
                          size="small"
                          onClick={() => setMood(t.id, m.value)}
                          sx={{
                            fontSize: 15, p: 0.4,
                            bgcolor: moods[t.id] === m.value ? m.color + "22" : "transparent",
                            border: moods[t.id] === m.value
                              ? `1.5px solid ${m.color}` : "1.5px solid transparent",
                            borderRadius: 1.5,
                          }}
                        >
                          {m.emoji}
                        </IconButton>
                      </Tooltip>
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography sx={{
              fontSize: 13, color: dark ? "rgba(255,255,255,0.35)" : "#bbb", mb: 2,
            }}>
              No expenses logged today yet.
            </Typography>
          )}
          {totalMooded > 0 && (
            <Box>
              <Typography sx={{
                fontSize: 12, color: dark ? "rgba(255,255,255,0.45)" : "#888", mb: 1,
              }}>
                This month:
              </Typography>
              {MOOD_OPTIONS.map(m => {
                const amt = moodBreakdown[m.value] || 0;
                const pct = totalMooded > 0
                  ? Math.round((amt / totalMooded) * 100) : 0;
                return (
                  <Box key={m.value} mb={1}>
                    <Box display="flex" justifyContent="space-between" mb={0.4}>
                      <Typography sx={{ fontSize: 13 }}>{m.emoji} {m.label}</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: m.color }}>
                        {fmt(amt)} ({pct}%)
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={pct}
                      sx={{
                        height: 5, borderRadius: 3,
                        bgcolor: dark ? "rgba(255,255,255,0.06)" : "#f0f0f0",
                        "& .MuiLinearProgress-bar": { bgcolor: m.color, borderRadius: 3 },
                      }} />
                  </Box>
                );
              })}
              {moodBreakdown.regretted > 0 && (
                <Box sx={{
                  mt: 1.5, p: 1.5, borderRadius: 2,
                  background: "rgba(226,75,74,0.08)",
                  border: "1px solid rgba(226,75,74,0.2)",
                }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#E24B4A" }}>
                    {fmt(moodBreakdown.regretted)} in regretted spending
                  </Typography>
                  <Typography sx={{
                    fontSize: 12,
                    color: dark ? "rgba(255,255,255,0.45)" : "#777", mt: 0.3,
                  }}>
                    This is your most actionable number — exactly where to cut.
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>

        {/* Section 10 — Smart Suggestions */}
        <Box sx={glass()}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <LightbulbIcon sx={{ color: "#BA7517", fontSize: 18 }} />
            <Typography sx={sectionLabel}>Smart Suggestions</Typography>
          </Box>
          {suggestions.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: dark ? "rgba(255,255,255,0.35)" : "#bbb" }}>
              Add more transactions to generate suggestions.
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {(showAllSuggestions ? suggestions : suggestions.slice(0, 2)).map((s, i) => (
                <Box key={i} sx={{
                  p: 1.5, borderRadius: 2,
                  background: s.type === "positive"
                    ? "rgba(29,158,117,0.08)" : s.type === "warning"
                    ? "rgba(226,75,74,0.08)" : "rgba(186,117,23,0.08)",
                  border: `1px solid ${
                    s.type === "positive" ? "rgba(29,158,117,0.2)"
                    : s.type === "warning" ? "rgba(226,75,74,0.2)"
                    : "rgba(186,117,23,0.2)"}`,
                }}>
                  <Typography sx={{ fontSize: 13, lineHeight: 1.55 }}>
                    {s.icon} {s.text}
                  </Typography>
                </Box>
              ))}
              {suggestions.length > 2 && (
                <Button
                  size="small"
                  onClick={() => setShowAll(!showAllSuggestions)}
                  sx={{
                    textTransform: "none", fontWeight: 600,
                    color: "#1D9E75", alignSelf: "flex-start", p: 0,
                  }}
                >
                  {showAllSuggestions
                    ? "Show less ▲"
                    : `View ${suggestions.length - 2} more ▼`}
                </Button>
              )}
            </Box>
          )}
        </Box>

      </Masonry>

      {/* ── Quick Log Dialog ──────────────────────────────────────────── */}
      <Dialog
        open={quickOpen} onClose={() => setQuickOpen(false)}
        maxWidth="xs" fullWidth
        PaperProps={{
          sx: { borderRadius: 3, background: dark ? "#1a1f2e" : "white" },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, letterSpacing: "-0.5px" }}>
          ⚡ Quick Expense Log
        </DialogTitle>
        <DialogContent sx={{
          display: "flex", flexDirection: "column",
          gap: 2, pt: "8px !important",
        }}>
          <TextField
            label="Amount (₹)" type="number" value={quickAmt}
            autoFocus fullWidth
            onChange={e => setQuickAmt(e.target.value)}
            onKeyDown={e => e.key === "Enter" && quickLog()}
          />
          <TextField
            select label="Category" value={quickCat}
            onChange={e => setQuickCat(e.target.value)} fullWidth
          >
            {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            onClick={() => setQuickOpen(false)}
            sx={{
              textTransform: "none",
              color: dark ? "rgba(255,255,255,0.5)" : "#888",
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained" onClick={quickLog}
            sx={{
              bgcolor: "#1D9E75", "&:hover": { bgcolor: "#0F6E56" },
              borderRadius: 2, textTransform: "none",
              fontWeight: 700, boxShadow: "none",
            }}
          >
            Log It
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}