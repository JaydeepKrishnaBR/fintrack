import { useMemo } from "react";
import { Box, Typography, Tooltip, LinearProgress, Divider } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import ErrorIcon from "@mui/icons-material/Error";
import InfoIcon from "@mui/icons-material/Info";

/*
  FinManage Score — 0 to 100
  ─────────────────────────────────────────────────────
  Component 1: Savings Rate (30 pts)
    savingsRate = (income - expense - debtPayments) / income
    ≥ 30%  → 30pts | ≥ 20% → 22pts | ≥ 10% → 14pts | ≥ 0% → 6pts | negative → 0pts

  Component 2: Debt-to-Income Ratio (25 pts)
    dti = totalDebtRemaining / (monthlyIncome * 12)
    0     → 25pts | ≤ 10% → 22pts | ≤ 20% → 17pts | ≤ 35% → 11pts
    ≤ 50% → 5pts  | > 50% → 0pts

  Component 3: Debt Repayment Consistency (20 pts)
    Ratio of months with debt payments vs months with income
    ≥ 90% → 20pts | ≥ 70% → 15pts | ≥ 50% → 9pts | > 0% → 4pts | 0% → 0pts
    (No debts at all → full 20pts)

  Component 4: Expense Control (15 pts)
    expenseRatio = expense / income
    ≤ 40% → 15pts | ≤ 55% → 11pts | ≤ 70% → 7pts | ≤ 85% → 3pts | > 85% → 0pts

  Component 5: Transaction Consistency (10 pts)
    How many of the last 6 months have any activity
    6 months → 10pts | 5 → 8pts | 4 → 6pts | 3 → 4pts | 2 → 2pts | ≤ 1 → 1pt
  ─────────────────────────────────────────────────────
*/

function calcScore(transactions, debts) {
  if (!transactions || transactions.length === 0) return null;

  const now = new Date();

  // Helper: group transactions by month key "YYYY-MM"
  const byMonth = {};
  transactions.forEach((t) => {
    const key = t.date?.slice(0, 7);
    if (!key) return;
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(t);
  });

  // Current month totals
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentMonth = byMonth[currentKey] || [];
  const income = currentMonth.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
  const expense = currentMonth.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
  const debtPayments = currentMonth.filter(t => t.type === "debt").reduce((s, t) => s + Number(t.amount || 0), 0);

  // All-time income (average monthly)
  const allIncomeMonths = Object.values(byMonth).filter(arr => arr.some(t => t.type === "income"));
  const avgMonthlyIncome = allIncomeMonths.length > 0
    ? allIncomeMonths.reduce((s, arr) => s + arr.filter(t => t.type === "income").reduce((ss, t) => ss + Number(t.amount || 0), 0), 0) / allIncomeMonths.length
    : 0;

  const totalDebtRemaining = debts.reduce((s, d) => s + Number(d.remaining || 0), 0);

  // ── Component 1: Savings Rate ──
  let savingsScore = 0;
  let savingsRate = 0;
  if (income > 0) {
    savingsRate = (income - expense - debtPayments) / income;
    if (savingsRate >= 0.30) savingsScore = 30;
    else if (savingsRate >= 0.20) savingsScore = 22;
    else if (savingsRate >= 0.10) savingsScore = 14;
    else if (savingsRate >= 0) savingsScore = 6;
    else savingsScore = 0;
  }

  // ── Component 2: Debt-to-Income ──
  let dtiScore = 25;
  let dtiRatio = 0;
  if (avgMonthlyIncome > 0 && totalDebtRemaining > 0) {
    dtiRatio = totalDebtRemaining / (avgMonthlyIncome * 12);
    if (dtiRatio <= 0) dtiScore = 25;
    else if (dtiRatio <= 0.10) dtiScore = 22;
    else if (dtiRatio <= 0.20) dtiScore = 17;
    else if (dtiRatio <= 0.35) dtiScore = 11;
    else if (dtiRatio <= 0.50) dtiScore = 5;
    else dtiScore = 0;
  }

  // ── Component 3: Debt Repayment Consistency ──
  let repayScore = 20;
  if (debts.length > 0) {
    const monthsWithIncome = Object.keys(byMonth).filter(k => byMonth[k].some(t => t.type === "income")).length;
    const monthsWithDebtPayment = Object.keys(byMonth).filter(k => byMonth[k].some(t => t.type === "debt")).length;
    const consistency = monthsWithIncome > 0 ? monthsWithDebtPayment / monthsWithIncome : 0;
    if (consistency >= 0.90) repayScore = 20;
    else if (consistency >= 0.70) repayScore = 15;
    else if (consistency >= 0.50) repayScore = 9;
    else if (consistency > 0) repayScore = 4;
    else repayScore = 0;
  }

  // ── Component 4: Expense Control ──
  let expenseScore = 0;
  let expenseRatio = 0;
  if (income > 0) {
    expenseRatio = expense / income;
    if (expenseRatio <= 0.40) expenseScore = 15;
    else if (expenseRatio <= 0.55) expenseScore = 11;
    else if (expenseRatio <= 0.70) expenseScore = 7;
    else if (expenseRatio <= 0.85) expenseScore = 3;
    else expenseScore = 0;
  }

  // ── Component 5: Transaction Consistency (last 6 months) ──
  let consistencyScore = 1;
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const activeMonths = last6Months.filter(k => byMonth[k]?.length > 0).length;
  if (activeMonths >= 6) consistencyScore = 10;
  else if (activeMonths === 5) consistencyScore = 8;
  else if (activeMonths === 4) consistencyScore = 6;
  else if (activeMonths === 3) consistencyScore = 4;
  else if (activeMonths === 2) consistencyScore = 2;
  else consistencyScore = 1;

  const total = Math.min(100, Math.round(savingsScore + dtiScore + repayScore + expenseScore + consistencyScore));

  return {
    total,
    breakdown: [
      { label: "Savings Rate", score: savingsScore, max: 30, detail: `${Math.round(savingsRate * 100)}% of income saved` },
      { label: "Debt-to-Income", score: dtiScore, max: 25, detail: totalDebtRemaining === 0 ? "No outstanding debt" : `${Math.round(dtiRatio * 100)}% DTI ratio` },
      { label: "Debt Repayment", score: repayScore, max: 20, detail: debts.length === 0 ? "No debts to repay" : `${repayScore >= 15 ? "Consistent" : repayScore >= 9 ? "Moderate" : "Irregular"} repayment` },
      { label: "Expense Control", score: expenseScore, max: 15, detail: `${Math.round(expenseRatio * 100)}% of income spent` },
      { label: "Activity Streak", score: consistencyScore, max: 10, detail: `Active ${activeMonths} of last 6 months` },
    ],
    savingsRate,
    dtiRatio,
    income,
    expense,
    debtPayments,
  };
}

function scoreColor(score) {
  if (score >= 80) return "#1D9E75";
  if (score >= 60) return "#4caf50";
  if (score >= 40) return "#BA7517";
  if (score >= 20) return "#E24B4A";
  return "#c62828";
}

function scoreLabel(score) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  if (score >= 20) return "Needs Work";
  return "Critical";
}

function scoreIcon(score) {
  if (score >= 60) return <CheckCircleIcon sx={{ fontSize: 18 }} />;
  if (score >= 40) return <WarningIcon sx={{ fontSize: 18 }} />;
  return <ErrorIcon sx={{ fontSize: 18 }} />;
}

function InsightItem({ icon, text, color, dark }) {
  return (
    <Box display="flex" alignItems="flex-start" gap={1} mb={1}>
      <Box sx={{ color, mt: "1px", flexShrink: 0 }}>{icon}</Box>
      <Typography sx={{ fontSize: 13, color: dark ? "rgba(255,255,255,0.7)" : "#555", lineHeight: 1.5 }}>
        {text}
      </Typography>
    </Box>
  );
}

export default function FinScore({ transactions, debts, dark, compact }) {
  const result = useMemo(() => calcScore(transactions, debts), [transactions, debts]);

  if (compact) {
    if (!result) {
      return (
        <Typography sx={{ fontSize: 13, color: dark ? "rgba(255,255,255,0.35)" : "#bbb" }}>
          Add transactions to calculate
        </Typography>
      );
    }

    return (
      <Box>
      <Box sx={{display: "flex", alignItems: "center", justifyContent: 'flex-start', columnGap: 2}}>
        <Typography sx={{ fontSize: 20, fontWeight: 900, color: scoreColor(result.total), letterSpacing: "-1px", }}>
          {result.total}
        </Typography>
        <Typography sx={{ fontSize: 20, fontWeight: 700, color: scoreColor(result.total) }}>
            {scoreLabel(result.total)}
          </Typography>
          </Box>
        <Box>
          <Typography sx={{ fontSize: 14, color: dark ? "rgba(255,255,255,0.35)" : "#aaa" }}>
            out of 100
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!result) {
    return (
      <Box sx={{
        p: 3, borderRadius: 3, textAlign: "center",
        background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
        border: `1px dashed ${dark ? "rgba(255,255,255,0.1)" : "#e0e0e0"}`,
      }}>
        <Typography sx={{ fontSize: 14, color: dark ? "rgba(255,255,255,0.35)" : "#bbb" }}>
          Add some transactions to generate your FinManage Score.
        </Typography>
      </Box>
    );
  }

  const { total, breakdown, savingsRate, dtiRatio, income, expense, debtPayments } = result;
  const color = scoreColor(total);
  const label = scoreLabel(total);

  // Generate personalised insights
  const insights = [];
  if (savingsRate < 0.10 && income > 0) insights.push({ type: "warn", text: `You're saving only ${Math.round(savingsRate * 100)}% of your income this month. Aim for at least 20%.` });
  if (savingsRate >= 0.30) insights.push({ type: "good", text: `Great savings discipline! You're saving ${Math.round(savingsRate * 100)}% of your income.` });
  if (dtiRatio > 0.35) insights.push({ type: "warn", text: `Your total debt is ${Math.round(dtiRatio * 100)}% of your annual income. Try to bring this below 35%.` });
  if (debts.length === 0) insights.push({ type: "good", text: "You have no outstanding debts. Keep it that way!" });
  if (expense / income > 0.70 && income > 0) insights.push({ type: "bad", text: `You're spending ${Math.round((expense / income) * 100)}% of your income on expenses. Review your spending categories.` });
  if (breakdown[4].score <= 2) insights.push({ type: "warn", text: "Log transactions regularly to build a stronger financial history." });
  if (total >= 80) insights.push({ type: "good", text: "Outstanding financial management! You're in great shape." });

  const circumference = 2 * Math.PI * 44;
  const offset = circumference - (total / 100) * circumference;

  return (
    <Box>
      {/* Score ring + label */}
      <Box display="flex" alignItems="center" gap={3} mb={3}>
        <Box sx={{ position: "relative", width: 110, height: 110, flexShrink: 0 }}>
          <svg width="110" height="110" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="55" cy="55" r="44" fill="none"
              stroke={dark ? "rgba(255,255,255,0.06)" : "#f0f0f0"} strokeWidth="9" />
            <circle cx="55" cy="55" r="44" fill="none"
              stroke={color} strokeWidth="9"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s ease" }}
            />
          </svg>
          <Box sx={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}>
            <Typography sx={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{total}</Typography>
            <Typography sx={{ fontSize: 10, color: dark ? "rgba(255,255,255,0.4)" : "#aaa", fontWeight: 600 }}>/100</Typography>
          </Box>
        </Box>

        <Box>
          <Box display="flex" alignItems="center" gap={0.8} mb={0.5} sx={{ color }}>
            {scoreIcon(total)}
            <Typography sx={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px", color }}>
              {label}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 13, color: dark ? "rgba(255,255,255,0.45)" : "#888", maxWidth: 240, lineHeight: 1.5 }}>
            Your FinManage Score is based on savings, debt management, and spending habits.
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ opacity: 0.08, mb: 2.5 }} />

      {/* Breakdown bars */}
      <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: dark ? "rgba(255,255,255,0.4)" : "#aaa", mb: 1.5 }}>
        Score Breakdown
      </Typography>
      {breakdown.map((item) => (
        <Box key={item.label} mb={1.5}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.4}>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{item.label}</Typography>
              <Tooltip title={item.detail} arrow>
                <InfoIcon sx={{ fontSize: 13, color: dark ? "rgba(255,255,255,0.3)" : "#ccc", cursor: "help" }} />
              </Tooltip>
            </Box>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: scoreColor((item.score / item.max) * 100) }}>
              {item.score}/{item.max}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(item.score / item.max) * 100}
            sx={{
              height: 6, borderRadius: 3,
              bgcolor: dark ? "rgba(255,255,255,0.06)" : "#f0f0f0",
              "& .MuiLinearProgress-bar": {
                bgcolor: scoreColor((item.score / item.max) * 100),
                borderRadius: 3,
              },
            }}
          />
        </Box>
      ))}

      {/* Insights */}
      {insights.length > 0 && (
        <>
          <Divider sx={{ opacity: 0.08, my: 2 }} />
          <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: dark ? "rgba(255,255,255,0.4)" : "#aaa", mb: 1.5 }}>
            Personalised Insights
          </Typography>
          {insights.map((ins, i) => (
            <InsightItem key={i} dark={dark}
              icon={ins.type === "good" ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : ins.type === "warn" ? <WarningIcon sx={{ fontSize: 16 }} /> : <ErrorIcon sx={{ fontSize: 16 }} />}
              color={ins.type === "good" ? "#1D9E75" : ins.type === "warn" ? "#BA7517" : "#E24B4A"}
              text={ins.text}
            />
          ))}
        </>
      )}
    </Box>
  );
}