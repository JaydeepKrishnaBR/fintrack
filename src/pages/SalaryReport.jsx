import { useEffect, useState, useRef } from "react";
import { db } from "../firebase/config";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import { getSalaryReport } from "../utils/insightEngine";
import {
  Box, Typography, Card, CardContent, LinearProgress,
  Button, Divider, CircularProgress
} from "@mui/material";
import ShareIcon from "@mui/icons-material/Share";
import DownloadIcon from "@mui/icons-material/Download";
import html2canvas from "html2canvas";

const CATEGORY_EMOJI = {
  Salary: "💼", Rent: "🏠", Groceries: "🛒", Transport: "🚂",
  Dining: "🍔", Utilities: "📱", Shopping: "🛍️", Health: "💊",
  Education: "📚", Entertainment: "🎮", "ATM Withdrawal": "🏧",
  Transfer: "💸", "Personal Loan": "🏦", Other: "📦",
};

const BAR_COLORS = [
  "#E24B4A", "#BA7517", "#378ADD", "#9c27b0",
  "#e91e63", "#ff5722", "#795548", "#607d8b",
];

export default function SalaryReport() {
  const { user } = useAuth();
  const { resolved } = useThemeMode();
  const dark = resolved === "dark";
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showAllCats, setShowAllCats] = useState(false);
  const reportRef = useRef();

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "transactions"), orderBy("date", "desc"));
    return onSnapshot(q, s => {
      setTransactions(s.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [user]);

  const report = getSalaryReport(transactions);
  const fmt = n => "₹" + Number(Math.abs(n)).toLocaleString("en-IN");
  const name = user?.displayName?.split(" ")[0] || "You";

  const handleExport = async () => {
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: dark ? "#0f1117" : "#ffffff",
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `fintrack-report-${report.month}-${report.year}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error(e);
    }
    setExporting(false);
  };

  const glassCard = {
    elevation: 0,
    sx: {
      backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      background: dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.7)",
      border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.9)"}`,
      borderRadius: 3,
      boxShadow: dark ? "0 4px 24px rgba(0,0,0,0.3)" : "0 4px 24px rgba(0,0,0,0.06)",
      mb: 2,
    }
  };

  if (loading) return (
    <Box display="flex" alignItems="center" justifyContent="center" minHeight="60vh">
      <CircularProgress sx={{ color: "#1D9E75" }} />
    </Box>
  );

  return (
    <Box maxWidth={640}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} mb={3}>
        <Box>
          <Typography sx={{ fontSize: { xs: 26, sm: 32 }, fontWeight: 800, letterSpacing: "-1px", mb: 0.3 }}>
            Salary Report
          </Typography>
          <Typography sx={{ color: dark ? "rgba(255,255,255,0.45)" : "#888", fontWeight: 500, mb: 2 }}>
            Where did your money go in {report.month}?
          </Typography>
        </Box>
        <Button
          variant="outlined" startIcon={exporting ? <CircularProgress size={14} /> : <DownloadIcon />}
          onClick={handleExport} disabled={exporting}
          sx={{
            borderRadius: 2.5, textTransform: "none", fontWeight: 600,
            borderColor: dark ? "rgba(29,158,117,0.4)" : "rgba(29,158,117,0.5)",
            color: "#1D9E75", mb: 2,
          }}
        >
          {exporting ? "Exporting..." : "Download Card"}
        </Button>
      </Box>

      {/* Shareable report card */}
      <Box ref={reportRef}>

        {/* Hero summary */}
        <Card {...glassCard}>
          <CardContent sx={{ p: 3 }}>
            <Typography sx={{ fontSize: 13, color: dark ? "rgba(255,255,255,0.4)" : "#aaa", fontWeight: 600, mb: 0.5 }}>
              {report.month.toUpperCase()} {report.year} · {report.txnCount} TRANSACTIONS
            </Typography>
            <Typography sx={{ fontSize: 28, fontWeight: 800, letterSpacing: "-1px", mb: 2, color: "#1D9E75" }}>
              {fmt(report.income)} earned
            </Typography>

            {/* Visual breakdown bar */}
            <Box sx={{ height: 12, borderRadius: 6, overflow: "hidden", display: "flex", mb: 1.5, bgcolor: dark ? "rgba(255,255,255,0.06)" : "#f0f0f0" }}>
              {report.categories.slice(0, 6).map((cat, i) => (
                <Box key={cat.name} sx={{
                  width: `${cat.pct}%`, height: "100%",
                  bgcolor: BAR_COLORS[i % BAR_COLORS.length],
                  transition: "width 0.5s ease",
                }} />
              ))}
              {report.remaining > 0 && (
                <Box sx={{ width: `${report.remainingPct}%`, height: "100%", bgcolor: "#1D9E75" }} />
              )}
            </Box>

            <Box display="flex" gap={2} flexWrap="wrap">
              {report.categories.slice(0, 4).map((cat, i) => (
                <Box key={cat.name} display="flex" alignItems="center" gap={0.5}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: BAR_COLORS[i] }} />
                  <Typography sx={{ fontSize: 11, color: dark ? "rgba(255,255,255,0.5)" : "#888" }}>
                    {cat.name}
                  </Typography>
                </Box>
              ))}
              <Box display="flex" alignItems="center" gap={0.5}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#1D9E75" }} />
                <Typography sx={{ fontSize: 11, color: dark ? "rgba(255,255,255,0.5)" : "#888" }}>Saved</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Category breakdown */}
        <Card {...glassCard}>
          <CardContent sx={{ p: 3 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: dark ? "rgba(255,255,255,0.4)" : "#aaa", mb: 2 }}>
              Breakdown
            </Typography>

            {report.categories.length === 0 && (
              <Typography sx={{ color: dark ? "rgba(255,255,255,0.35)" : "#bbb", fontSize: 14 }}>
                No expenses logged this month yet.
              </Typography>
            )}

            {(showAllCats ? report.categories : report.categories.slice(0, 3)).map((cat, i) => (
  <Box key={cat.name} mb={1.5}>
    <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
      <Box display="flex" alignItems="center" gap={1}>
        <Typography sx={{ fontSize: 16 }}>{CATEGORY_EMOJI[cat.name] || "📦"}</Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{cat.name}</Typography>
      </Box>
      <Box textAlign="right">
        <Typography sx={{ fontSize: 13, fontWeight: 800 }}>{fmt(cat.amount)}</Typography>
        <Typography sx={{ fontSize: 11, color: dark ? "rgba(255,255,255,0.35)" : "#aaa" }}>
          {cat.pct}% of income
        </Typography>
      </Box>
    </Box>
    <LinearProgress variant="determinate" value={Math.min(cat.pct, 100)}
      sx={{ height: 5, borderRadius: 3,
        bgcolor: dark ? "rgba(255,255,255,0.06)" : "#f5f5f5",
        "& .MuiLinearProgress-bar": { bgcolor: BAR_COLORS[i % BAR_COLORS.length], borderRadius: 3 } }} />
  </Box>
))}

{/* View more button */}
{report.categories.length > 3 && (
  <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 3,}}>
  <Button
    size="meduim" onClick={() => setShowAllCats(!showAllCats)}
    sx={{ textTransform: "none", fontWeight: 600, color: "#609c64", fontSize: 13, mb: 1, p: 1, bgcolor: dark ? "rgba(89, 91, 89, 0.25)" : "#4f504f49", }}
  >
    {showAllCats
      ? "Show less ▲"
      : `View ${report.categories.length - 3} more categories ▼`}
  </Button>
  </Box>
)}

            {report.totalDebt > 0 && (
              <Box mb={1.5}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography sx={{ fontSize: 16 }}>💳</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Debt Payments</Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography sx={{ fontSize: 13, fontWeight: 800 }}>{fmt(report.totalDebt)}</Typography>
                    <Typography sx={{ fontSize: 11, color: dark ? "rgba(255,255,255,0.35)" : "#aaa" }}>
                      {report.income > 0 ? Math.round((report.totalDebt / report.income) * 100) : 0}% of income
                    </Typography>
                  </Box>
                </Box>
                <LinearProgress variant="determinate"
                  value={Math.min(report.income > 0 ? (report.totalDebt / report.income) * 100 : 0, 100)}
                  sx={{ height: 5, borderRadius: 3, bgcolor: dark ? "rgba(255,255,255,0.06)" : "#f5f5f5",
                    "& .MuiLinearProgress-bar": { bgcolor: "#BA7517", borderRadius: 3 } }} />
              </Box>
            )}

            <Divider sx={{ opacity: 0.08, my: 2 }} />

            {/* The gut punch line */}
            <Box sx={{
              p: 2, borderRadius: 2.5,
              background: report.remaining <= 0
                ? "rgba(226,75,74,0.1)" : report.remainingPct < 10
                ? "rgba(186,117,23,0.1)" : "rgba(29,158,117,0.1)",
              border: `1px solid ${report.remaining <= 0 ? "rgba(226,75,74,0.3)" : report.remainingPct < 10 ? "rgba(186,117,23,0.3)" : "rgba(29,158,117,0.3)"}`,
            }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: dark ? "rgba(255,255,255,0.5)" : "#888" }}>
                    {report.remaining <= 0 ? "OVERSPENT" : "REMAINING"}
                  </Typography>
                  <Typography sx={{
                    fontSize: 28, fontWeight: 800, letterSpacing: "-1px",
                    color: report.remaining <= 0 ? "#E24B4A" : report.remainingPct < 10 ? "#BA7517" : "#1D9E75",
                  }}>
                    {fmt(report.remaining)}
                  </Typography>
                </Box>
                <Box textAlign="right">
                  <Typography sx={{
                    fontSize: 48, fontWeight: 900, letterSpacing: "-2px", lineHeight: 1,
                    color: report.remaining <= 0 ? "#E24B4A" : report.remainingPct < 10 ? "#BA7517" : "#1D9E75",
                    opacity: 0.3,
                  }}>
                    {Math.abs(report.remainingPct)}%
                  </Typography>
                </Box>
              </Box>
              <Typography sx={{ fontSize: 12, color: dark ? "rgba(255,255,255,0.45)" : "#777", mt: 0.5 }}>
                {report.remaining <= 0
                  ? `You've overspent by ${fmt(Math.abs(report.remaining))} this month.`
                  : report.remainingPct < 5
                  ? `Only ${report.remainingPct}% of your salary is left. This is the moment to act.`
                  : `${report.remainingPct}% of your ${report.month} salary is still with you.`}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Share footer — only on exported card */}
        <Box sx={{
          textAlign: "center", py: 1.5,
          borderTop: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "#eee"}`,
        }}>
          <Typography sx={{ fontSize: 12, color: dark ? "rgba(255,255,255,0.25)" : "#ccc", fontWeight: 600 }}>
            Track yours at FinTrack · fintrack-01.netlify.app
          </Typography>
        </Box>

      </Box>
    </Box>
  );
}