import { useState } from "react";
import { db } from "../firebase/config";
import { collection, addDoc, Timestamp, getDocs } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import {
  Box, Card, CardContent, Typography, TextField, Button,
  ToggleButtonGroup, ToggleButton, MenuItem, Alert,
  Snackbar, Collapse, Divider, LinearProgress
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import ErrorIcon from "@mui/icons-material/Error";
import StatementUploader from "../components/StatementUploader";

const CATEGORIES = {
  income: ["Salary", "Freelance", "Business", "Investment", "Gift", "Other"],
  expense: ["Rent", "Groceries", "Transport", "Dining", "Utilities", "Shopping", "Health", "Education", "Entertainment", "Other"],
  debt: ["Car Loan", "Home Loan", "Credit Card", "Personal Loan", "Education Loan", "Other"],
};

function DebtFeasibility({ amount, monthly, dark }) {
  const amt = Number(amount);
  const emi = Number(monthly);
  if (!amt || !emi || amt <= 0 || emi <= 0) return null;

  const months = Math.ceil(amt / emi);
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  const timeStr = years > 0 ? `${years}y ${remMonths}m` : `${months} months`;
  const emiToDebtRatio = (emi / amt) * 100;

  let status, color, icon, message;
  if (emiToDebtRatio >= 5) {
    status = "Great"; color = "#1D9E75";
    icon = <CheckCircleIcon sx={{ fontSize: 16 }} />;
    message = `Aggressive repayment plan. You'll clear this debt in ${timeStr}.`;
  } else if (emiToDebtRatio >= 2) {
    status = "Manageable"; color = "#4caf50";
    icon = <CheckCircleIcon sx={{ fontSize: 16 }} />;
    message = `Solid repayment plan. Estimated payoff in ${timeStr}.`;
  } else if (emiToDebtRatio >= 1) {
    status = "Caution"; color = "#BA7517";
    icon = <WarningIcon sx={{ fontSize: 16 }} />;
    message = `Low monthly payment — will take ${timeStr} to clear. Consider paying more.`;
  } else {
    status = "Risk"; color = "#E24B4A";
    icon = <ErrorIcon sx={{ fontSize: 16 }} />;
    message = `Very low EMI relative to debt. At this rate it will take ${timeStr}. Increase your monthly payment.`;
  }

  return (
    <Box sx={{
      mt: 1, p: 2, borderRadius: 2,
      background: dark ? `${color}15` : `${color}10`,
      border: `1px solid ${color}40`,
    }}>
      <Box display="flex" alignItems="center" gap={1} mb={0.5} sx={{ color }}>
        {icon}
        <Typography sx={{ fontSize: 13, fontWeight: 700, color }}>{status}</Typography>
      </Box>
      <Typography sx={{ fontSize: 13, color: dark ? "rgba(255,255,255,0.65)" : "#555", lineHeight: 1.5 }}>
        {message}
      </Typography>
      <Box display="flex" gap={3} mt={1.5}>
        <Box>
          <Typography sx={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: dark ? "rgba(255,255,255,0.35)" : "#aaa", fontWeight: 700 }}>Payoff time</Typography>
          <Typography sx={{ fontSize: 15, fontWeight: 800, color }}>{timeStr}</Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: dark ? "rgba(255,255,255,0.35)" : "#aaa", fontWeight: 700 }}>Total payments</Typography>
          <Typography sx={{ fontSize: 15, fontWeight: 800 }}>₹{(emi * months).toLocaleString("en-IN")}</Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: dark ? "rgba(255,255,255,0.35)" : "#aaa", fontWeight: 700 }}>Monthly EMI</Typography>
          <Typography sx={{ fontSize: 15, fontWeight: 800 }}>₹{emi.toLocaleString("en-IN")}</Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default function AddEntry() {
  const { user } = useAuth();
  const { resolved } = useThemeMode();
  const dark = resolved === "dark";

  const [type, setType] = useState("income");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Salary");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [debtName, setDebtName] = useState("");
  const [debtMonthly, setDebtMonthly] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleTypeChange = (_, val) => {
    if (val) { setType(val); setCategory(CATEGORIES[val][0]); }
  };

  const handleSubmit = async () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setError("Please enter a valid amount."); return;
    }
    if (type === "debt" && !debtName.trim()) {
      setError("Please enter a name for this debt."); return;
    }
    try {
      // Save transaction
      await addDoc(collection(db, "users", user.uid, "transactions"), {
        type, amount: Number(amount), category, date, note,
        createdAt: Timestamp.now(),
      });

      // If debt, also save to debts collection
      if (type === "debt") {
        await addDoc(collection(db, "users", user.uid, "debts"), {
          name: debtName,
          total: Number(amount),
          remaining: Number(amount),
          monthly: Number(debtMonthly) || 0,
          createdAt: Timestamp.now(),
        });
      }

      setAmount(""); setNote(""); setDebtName(""); setDebtMonthly("");
      setSuccess(true);
    } catch (e) {
      setError("Failed to save. Try again.");
    }
  };

  const glassCard = {
    elevation: 0,
    sx: {
      backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      background: dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.7)",
      border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.9)"}`,
      borderRadius: 3,
      boxShadow: dark ? "0 4px 24px rgba(0,0,0,0.3)" : "0 4px 24px rgba(0,0,0,0.06)",
    },
  };

  const toggleColors = {
    income: { sel: "#1D9E75", bg: dark ? "rgba(29,158,117,0.15)" : "#E1F5EE" },
    expense: { sel: "#E24B4A", bg: dark ? "rgba(226,75,74,0.15)" : "#FCEBEB" },
    debt: { sel: "#BA7517", bg: dark ? "rgba(186,117,23,0.15)" : "#FAEEDA" },
  };

  return (
    <Box maxWidth={500}>
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} mb={1}>
        <Typography sx={{ fontSize: { xs: 26, sm: 32 }, fontWeight: 800, letterSpacing: "-1px", mb: 2 }}>
          Add Entry
        </Typography>
      </Box>
      <Typography sx={{ color: dark ? "rgba(255,255,255,0.45)" : "#888", mt: 2, mb: 3, fontWeight: 500 }}>
        Log manually or import from your bank statement
      </Typography>

      <Card {...glassCard} sx={{p:2}} >
        <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <StatementUploader />
        </Box>
      </Card>

      <ToggleButtonGroup value={type} exclusive onChange={handleTypeChange} fullWidth sx={{ mt: 3, mb: 3 }}>
        {["income", "expense", "debt"].map((t) => (
          <ToggleButton key={t} value={t} sx={{
            textTransform: "none", fontWeight: 700, fontSize: 14,
            "&.Mui-selected": {
              bgcolor: toggleColors[t].bg,
              color: toggleColors[t].sel,
              borderColor: `${toggleColors[t].sel}60`,
            },
          }}>
            {t === "income" ? "+ Income" : t === "expense" ? "– Expense" : "⚠ Debt"}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Card {...glassCard} >
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>

          {type === "debt" && (
            <TextField label="Debt name (e.g. Car Loan, HDFC Card)" value={debtName}
              onChange={e => setDebtName(e.target.value)} fullWidth />
          )}

          <TextField label="Amount (₹)" type="number" value={amount}
            onChange={e => setAmount(e.target.value)} fullWidth
            InputProps={{ inputProps: { min: 0 } }} />

          {type === "debt" && (
            <>
              <TextField label="Planned monthly payment / EMI (₹)" type="number"
                value={debtMonthly} onChange={e => setDebtMonthly(e.target.value)} fullWidth
                helperText="Enter how much you plan to pay each month" />
              <DebtFeasibility amount={amount} monthly={debtMonthly} dark={dark} />
            </>
          )}

          <TextField label="Category" select value={category}
            onChange={e => setCategory(e.target.value)} fullWidth>
            {CATEGORIES[type].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>

          <TextField label="Date" type="date" value={date}
            onChange={e => setDate(e.target.value)} fullWidth
            InputLabelProps={{ shrink: true }} />

          <TextField label="Note (optional)" value={note}
            onChange={e => setNote(e.target.value)} fullWidth
            placeholder={type === "debt" ? "e.g. Bank name, interest rate" : "e.g. April salary"} />

          {error && <Alert severity="error" onClose={() => setError("")} sx={{ borderRadius: 2 }}>{error}</Alert>}

          <Button variant="contained" size="large" onClick={handleSubmit} sx={{
            bgcolor: type === "income" ? "#1D9E75" : type === "expense" ? "#E24B4A" : "#BA7517",
            "&:hover": { filter: "brightness(0.88)" },
            borderRadius: 2.5, fontWeight: 700, fontSize: 15,
            textTransform: "none", py: 1.4,
            boxShadow: "none",
          }}>
            Save Entry
          </Button>
        </CardContent>
      </Card>
      <Snackbar open={success} autoHideDuration={3000} onClose={() => setSuccess(false)}
        message="Entry saved successfully!" />
    </Box>
  );
}