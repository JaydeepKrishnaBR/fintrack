import { useEffect, useState } from "react";
import { db }           from "../firebase/config";
import { collection, onSnapshot } from "firebase/firestore";
import { useAuth }      from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import { usePersona }   from "../context/PersonaContext";
import { useNavigate }  from "react-router-dom";
import { COLORS, glassStyle } from "../brand/theme";
import {
  Box, Typography, Grid, Button, LinearProgress, Chip
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { generateInsights } from "../utils/insightEngine";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// Safe to Spend calculation
function calcSafeToSpend(transactions, balance, persona) {
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonth = transactions.filter(t => t.date?.startsWith(currentKey));

  const income  = thisMonth.filter(t => t.type === "income")
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const spent   = thisMonth.filter(t => t.type === "expense" || t.type === "debt")
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  // Days calculation based on pay cycle
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft    = daysInMonth - now.getDate() + 1;

  const available   = balance > 0 ? balance : Math.max(0, income - spent);
  const safeDaily   = daysLeft > 0 ? Math.round(available / daysLeft) : 0;

  return { safeDaily, income, spent, daysLeft, available };
}

export default function Home() {
  const { user }              = useAuth();
  const { resolved }          = useThemeMode();
  const { persona }           = usePersona();
  const navigate              = useNavigate();
  const dark                  = resolved === "dark";

  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts]               = useState([]);

  useEffect(() => {
    if (!user) return;
    const u1 = onSnapshot(
      collection(db, "users", user.uid, "transactions"),
      s => setTransactions(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const u2 = onSnapshot(
      collection(db, "users", user.uid, "debts"),
      s => setDebts(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => { u1(); u2(); };
  }, [user]);

  const now        = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonth  = transactions.filter(t => t.date?.startsWith(currentKey));

  const income    = thisMonth.filter(t => t.type === "income")
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const expense   = thisMonth.filter(t => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const debtPaid  = thisMonth.filter(t => t.type === "debt")
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const savings   = income - expense - debtPaid;
  const savingsPct = income > 0 ? Math.round((savings / income) * 100) : 0;
  const totalDebt = debts.reduce((s, d) => s + Number(d.remaining || 0), 0);
  const emiLoad   = income > 0 ? Math.round((debtPaid / income) * 100) : 0;

  const { safeDaily } = calcSafeToSpend(transactions, 0, persona);
  const topInsight    = generateInsights(transactions, debts, {})[0];
  const fmt = n => "₹" + Number(Math.abs(n || 0)).toLocaleString("en-IN");

  const glass = (extra = {}) => ({
    ...glassStyle(dark),
    borderRadius: 3,
    p: 2,
    ...extra,
  });

  // ── Persona greeting ──────────────────────────────────────────────────────
  const personaLabel = {
    salaried:   "💼 Salaried",
    freelancer: "🚀 Freelancer",
    business:   "🏢 Business",
    student:    "🎓 Student",
    family:     "🏠 Family",
  };

  // ── Persona-specific priority cards ──────────────────────────────────────
  const personaCards = () => {
    const type = persona?.persona || "salaried";

    if (type === "freelancer") return [
      { label: "Income this month",  value: fmt(income),    color: COLORS.green,   sub: income === 0 ? "None logged yet" : `${thisMonth.filter(t => t.type === "income").length} payments` },
      { label: "Tax reserve needed", value: fmt(income * 0.3), color: COLORS.saffron, sub: "~30% of income" },
      { label: "Expenses",           value: fmt(expense),   color: COLORS.rust,    sub: income > 0 ? `${Math.round((expense / income) * 100)}% of income` : "" },
    ];

    if (type === "student") return [
      { label: "Spent this month", value: fmt(expense),   color: COLORS.rust,    sub: `${thisMonth.filter(t => t.type === "expense").length} transactions` },
      { label: "Remaining",        value: fmt(savings),   color: COLORS.green,   sub: savings < 0 ? "Overspent ⚠️" : "Available" },
      { label: "No-spend days",    value: "—",            color: COLORS.navy,    sub: "See Planner" },
    ];

    if (type === "family") return [
      { label: "Household spend", value: fmt(expense),  color: COLORS.rust,    sub: "this month" },
      { label: "Shared income",   value: fmt(income),   color: COLORS.green,   sub: "combined" },
      { label: "Debt load",       value: fmt(totalDebt), color: COLORS.saffron, sub: "outstanding" },
    ];

    if (type === "business") return [
      { label: "Revenue",       value: fmt(income),   color: COLORS.green,   sub: "this month" },
      { label: "Expenses",      value: fmt(expense),  color: COLORS.rust,    sub: "business costs" },
      { label: "Tax reserve",   value: fmt(income * 0.25), color: COLORS.saffron, sub: "set aside ~25%" },
    ];

    // Default — salaried
    return [
      { label: "Income",      value: fmt(income),   color: COLORS.green,   sub: "this month" },
      { label: "Spent",       value: fmt(expense),  color: COLORS.rust,    sub: `${Math.round((expense / income || 0) * 100)}% of income` },
      { label: "EMI load",    value: emiLoad + "%", color: COLORS.saffron, sub: fmt(debtPaid) + " paid" },
    ];
  };

  return (
    <Box>
      {/* ── Greeting ── */}
      <Box display="flex" alignItems="flex-start" justifyContent="space-between"
        flexWrap="wrap" gap={1} mb={3}>
        <Box>
          <Box display="flex" alignItems="center" gap={1} mb={0.3}>
            <Typography sx={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10, letterSpacing: 3,
              textTransform: "uppercase",
              color: COLORS.saffron,
            }}>
              {MONTH_NAMES[now.getMonth()]} {now.getFullYear()}
            </Typography>
            {persona?.persona && (
              <Chip
                label={personaLabel[persona.persona]}
                size="small"
                sx={{
                  fontSize: 10, height: 20, fontWeight: 600,
                  bgcolor: dark ? "rgba(232,120,10,0.12)" : COLORS.saffronLight,
                  color: COLORS.saffron,
                  border: `1px solid ${COLORS.saffron}33`,
                }}
              />
            )}
          </Box>
          <Typography sx={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: { xs: 28, sm: 36 },
            fontWeight: 900, lineHeight: 1.1,
          }}>
            Good {now.getHours() < 12 ? "morning" : now.getHours() < 17 ? "afternoon" : "evening"},{" "}
            <Box component="span" sx={{ color: COLORS.saffron }}>
              {user?.displayName?.split(" ")[0]}
            </Box>
          </Typography>
        </Box>
      </Box>

      {/* ── Safe to Spend ── */}
      <Box sx={{
        ...glassStyle(dark),
        borderRadius: 3, p: 2.5, mb: 2,
        background: dark
          ? "rgba(232,120,10,0.08)"
          : COLORS.saffronLight,
        border: `1px solid ${COLORS.saffron}33`,
      }}>
        <Typography sx={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10, letterSpacing: 3,
          textTransform: "uppercase",
          color: COLORS.saffron, mb: 0.5,
        }}>
          Safe to spend today
        </Typography>
        <Typography sx={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 48, fontWeight: 900,
          letterSpacing: "-2px", lineHeight: 1,
          color: COLORS.saffron,
        }}>
          {fmt(safeDaily)}
        </Typography>
        <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.5 }}>
          Based on this month's income and spending.{" "}
          <Box component="span"
            onClick={() => navigate("/planner")}
            sx={{ color: COLORS.saffron, cursor: "pointer", fontWeight: 600 }}>
            Add balance for precision →
          </Box>
        </Typography>
      </Box>

      {/* ── Persona cards ── */}
      <Grid container spacing={1.5} mb={2}>
        {personaCards().map(m => (
          <Grid item xs={4} key={m.label}>
            <Box sx={glass()}>
              <Typography sx={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 9, letterSpacing: 1.5,
                textTransform: "uppercase",
                color: "text.secondary", mb: 0.5,
              }}>
                {m.label}
              </Typography>
              <Typography sx={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: { xs: 18, sm: 22 },
                fontWeight: 700, color: m.color,
                letterSpacing: "-0.5px", lineHeight: 1.1,
              }}>
                {m.value}
              </Typography>
              {m.sub && (
                <Typography sx={{ fontSize: 10, color: "text.secondary", mt: 0.3 }}>
                  {m.sub}
                </Typography>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* ── Savings progress ── */}
      <Box sx={{ ...glass(), mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
            Savings rate
          </Typography>
          <Typography sx={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 20, fontWeight: 700,
            color: savingsPct >= 20
              ? COLORS.green : savingsPct >= 10
              ? COLORS.saffron : COLORS.rust,
          }}>
            {savingsPct}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={Math.min(Math.max(savingsPct, 0), 100)}
          sx={{
            height: 5, borderRadius: 2,
            bgcolor: dark ? "rgba(247,243,237,0.06)" : COLORS.cream,
            "& .MuiLinearProgress-bar": {
              bgcolor: savingsPct >= 20
                ? COLORS.green : savingsPct >= 10
                ? COLORS.saffron : COLORS.rust,
              borderRadius: 2,
            },
          }}
        />
        <Typography sx={{ fontSize: 11, color: "text.secondary", mt: 0.7 }}>
          {savingsPct >= 20
            ? "Excellent — you're on track for financial health"
            : savingsPct >= 10
            ? "Good — aim for 20% to build wealth faster"
            : income === 0
            ? "Log your income to see your savings rate"
            : "Low savings — review your expenses"}
        </Typography>
      </Box>

      {/* ── Top insight ── */}
      {topInsight && (
        <Box sx={{
          ...glass({ mb: 2 }),
          border: `1px solid ${COLORS.saffron}22`,
          background: dark
            ? "rgba(232,120,10,0.06)"
            : "rgba(232,120,10,0.04)",
        }}>
          <Box display="flex" gap={1.5} alignItems="flex-start">
            <Typography sx={{ fontSize: 20, flexShrink: 0 }}>
              {topInsight.icon}
            </Typography>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.3 }}>
                {topInsight.title}
              </Typography>
              <Typography sx={{
                fontSize: 12, color: "text.secondary", lineHeight: 1.6,
              }}>
                {topInsight.message}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* ── CTA ── */}
      <Button
        fullWidth variant="outlined"
        endIcon={<ArrowForwardIcon />}
        onClick={() => navigate("/dashboard")}
        sx={{
          borderColor: dark
            ? "rgba(247,243,237,0.12)" : COLORS.rule,
          color: "text.secondary",
          py: 1.3,
          "&:hover": {
            borderColor: COLORS.saffron,
            color: COLORS.saffron,
            bgcolor: dark
              ? "rgba(232,120,10,0.06)"
              : "rgba(232,120,10,0.04)",
          },
        }}
      >
        View full dashboard
      </Button>
    </Box>
  );
}