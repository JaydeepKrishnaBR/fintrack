import { useState } from "react";
import { Box, Typography, LinearProgress, TextField, InputAdornment, Tooltip } from "@mui/material";
import { getBurnRate } from "../utils/insightEngine";

export default function BurnRate({ transactions, dark }) {
  const [balance, setBalance] = useState("");
  const bal = Number(balance) || 0;
  const data = getBurnRate(transactions, bal);
  const fmt = n => "₹" + Math.abs(Number(n)).toLocaleString("en-IN");

  const progressPct = Math.min(100, Math.round((data.totalSpent / Math.max(data.totalIncome, 1)) * 100));
  const isRunningOut = data.daysUntilZero < data.daysLeft && bal > 0;
  const barColor = progressPct > 85 ? "#E24B4A" : progressPct > 60 ? "#BA7517" : "#1D9E75";

  return (
    <Box>
      <Typography sx={{
        fontSize: 11, fontWeight: 700, textTransform: "uppercase",
        letterSpacing: 0.8, color: dark ? "rgba(255,255,255,0.4)" : "#aaa", mb: 1.5,
      }}>
        Burn Rate Predictor
      </Typography>

      <TextField
        size="small" fullWidth
        label="Enter your current bank balance (₹)"
        type="number"
        value={balance}
        onChange={e => setBalance(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
      />

      <Box sx={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 1.5, mb: 2,
      }}>
        {[
          { label: "Daily burn", value: fmt(data.dailyBurn), color: "#E24B4A" },
          { label: "Days left", value: data.daysLeft, color: "#378ADD" },
          { label: "Safe/day", value: fmt(data.safeDaily), color: "#1D9E75" },
        ].map(m => (
          <Box key={m.label} sx={{
            p: 1.5, borderRadius: 2,
            background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
            textAlign: "center",
          }}>
            <Typography sx={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: dark ? "rgba(255,255,255,0.4)" : "#aaa", fontWeight: 700 }}>
              {m.label}
            </Typography>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: m.color, letterSpacing: "-0.5px" }}>
              {m.value}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box mb={1}>
        <Box display="flex" justifyContent="space-between" mb={0.5}>
          <Typography sx={{ fontSize: 12, color: dark ? "rgba(255,255,255,0.5)" : "#777" }}>
            Month progress ({data.daysElapsed}/{data.daysInMonth} days)
          </Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: barColor }}>
            {progressPct}% spent
          </Typography>
        </Box>
        <LinearProgress variant="determinate" value={progressPct}
          sx={{ height: 8, borderRadius: 4, bgcolor: dark ? "rgba(255,255,255,0.06)" : "#f0f0f0",
            "& .MuiLinearProgress-bar": { bgcolor: barColor, borderRadius: 4 } }} />
      </Box>

      {bal > 0 && (
        <Box sx={{
          mt: 1.5, p: 1.5, borderRadius: 2,
          background: isRunningOut
            ? "rgba(226,75,74,0.1)" : "rgba(29,158,117,0.1)",
          border: `1px solid ${isRunningOut ? "rgba(226,75,74,0.3)" : "rgba(29,158,117,0.3)"}`,
        }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: isRunningOut ? "#E24B4A" : "#1D9E75" }}>
            {isRunningOut
              ? `⚠️ Balance runs out in ~${data.daysUntilZero} days`
              : `✅ You're on track — ${fmt(data.projectedRemaining)} projected remaining`}
          </Typography>
          <Typography sx={{ fontSize: 12, color: dark ? "rgba(255,255,255,0.5)" : "#666", mt: 0.3 }}>
            {isRunningOut
              ? `Spend max ${fmt(data.safeDaily)}/day to last the month.`
              : `Keep spending under ${fmt(data.safeDaily)}/day to stay safe.`}
          </Typography>
        </Box>
      )}
    </Box>
  );
}