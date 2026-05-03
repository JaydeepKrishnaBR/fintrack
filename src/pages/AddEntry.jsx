import { useState }    from "react";
import { db }          from "../firebase/config";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { useAuth }     from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import { COLORS, glassStyle } from "../brand/theme";
import { parseNL, QUICK_CHIPS } from "../utils/nlParser";
import StatementUploader from "../components/StatementUploader";
import {
  Box, Typography, TextField, Button, ToggleButtonGroup,
  ToggleButton, MenuItem, Alert, Snackbar, Chip, Divider,
  InputAdornment,
} from "@mui/material";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import SendIcon        from "@mui/icons-material/Send";

const CATEGORIES = {
  income:  ["Salary","Freelance","Business","Investment","Bonus","Rent Received","Gift","Other Income"],
  expense: ["Rent","Groceries","Transport","Dining","Utilities","Shopping","Health","Education","Entertainment","ATM Withdrawal","Transfer","Tax","Insurance","Investment","Other"],
  debt:    ["Car Loan","Home Loan","Credit Card","Personal Loan","Education Loan","Other"],
};

function DebtFeasibility({ amount, monthly, dark }) {
  const amt = Number(amount);
  const emi = Number(monthly);
  if (!amt || !emi || amt <= 0 || emi <= 0) return null;
  const months = Math.ceil(amt / emi);
  const years  = Math.floor(months / 12);
  const rem    = months % 12;
  const timeStr = years > 0 ? `${years}y ${rem}m` : `${months} months`;
  const ratio   = (emi / amt) * 100;
  let color, msg;
  if (ratio >= 5)      { color = COLORS.green;   msg = `Aggressive plan — debt-free in ${timeStr}`; }
  else if (ratio >= 2) { color = COLORS.green;   msg = `Solid plan — payoff in ${timeStr}`; }
  else if (ratio >= 1) { color = COLORS.saffron; msg = `Low EMI — will take ${timeStr}. Consider paying more.`; }
  else                 { color = COLORS.rust;    msg = `Very low EMI — ${timeStr} to clear. Increase your payment.`; }
  return (
    <Box sx={{
      mt: 1, p: 1.5, borderRadius: 2,
      background: color + "15",
      border: `1px solid ${color}40`,
    }}>
      <Typography sx={{ fontSize: 13, fontWeight: 600, color }}>
        {msg}
      </Typography>
      <Box display="flex" gap={3} mt={1}>
        {[
          { l: "Payoff time",      v: timeStr },
          { l: "Total payments",   v: "₹" + (emi * months).toLocaleString("en-IN") },
          { l: "Monthly EMI",      v: "₹" + emi.toLocaleString("en-IN") },
        ].map(r => (
          <Box key={r.l}>
            <Typography sx={{
              fontSize: 10, textTransform: "uppercase",
              letterSpacing: 0.5, color: "text.secondary",
              fontFamily: "'DM Mono', monospace", fontWeight: 700,
            }}>
              {r.l}
            </Typography>
            <Typography sx={{
              fontSize: 15, fontWeight: 800, color,
            }}>
              {r.v}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default function AddEntry() {
  const { user }     = useAuth();
  const { resolved } = useThemeMode();
  const dark         = resolved === "dark";

  // NL input
  const [nlInput, setNlInput]     = useState("");
  const [nlParsed, setNlParsed]   = useState(null);
  const [nlMode, setNlMode]       = useState(true);

  // Manual form
  const [type, setType]           = useState("expense");
  const [amount, setAmount]       = useState("");
  const [category, setCategory]   = useState("Groceries");
  const [date, setDate]           = useState(
    new Date().toISOString().split("T")[0]
  );
  const [note, setNote]           = useState("");
  const [debtName, setDebtName]   = useState("");
  const [debtMonthly, setDebtMonthly] = useState("");
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState("");

  const glass = (extra = {}) => ({
    ...glassStyle(dark), borderRadius: 3, ...extra,
  });

  // ── NL parse ─────────────────────────────────────────────────────────────
  const handleNLParse = () => {
    if (!nlInput.trim()) return;
    const result = parseNL(nlInput);
    if (result) {
      setNlParsed(result);
      // Pre-fill the form
      if (result.amount) setAmount(String(result.amount));
      if (result.type)   setType(result.type);
      if (result.category) setCategory(result.category);
      if (result.date)   setDate(result.date);
      if (result.note)   setNote(result.note);
    }
  };

  const handleNLKeyDown = (e) => {
    if (e.key === "Enter") handleNLParse();
  };

  const handleQuickChip = (text) => {
    setNlInput(text);
    const result = parseNL(text);
    if (result) {
      setNlParsed(result);
      if (result.amount)   setAmount(String(result.amount));
      if (result.type)     setType(result.type);
      if (result.category) setCategory(result.category);
      if (result.date)     setDate(result.date);
      if (result.note)     setNote(result.note);
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setError("Please enter a valid amount."); return;
    }
    if (type === "debt" && !debtName.trim()) {
      setError("Please enter a name for this debt."); return;
    }
    try {
      await addDoc(
        collection(db, "users", user.uid, "transactions"),
        {
          type, amount: Number(amount), category, date, note,
          createdAt: Timestamp.now(),
        }
      );
      if (type === "debt") {
        await addDoc(
          collection(db, "users", user.uid, "debts"),
          {
            name:    debtName,
            total:   Number(amount),
            remaining: Number(amount),
            monthly: Number(debtMonthly) || 0,
            createdAt: Timestamp.now(),
          }
        );
      }
      // Reset
      setAmount(""); setNote(""); setDebtName("");
      setDebtMonthly(""); setNlInput(""); setNlParsed(null);
      setSuccess(true);
    } catch (e) {
      setError("Failed to save. Try again.");
    }
  };

  const typeColor = {
    income:  COLORS.green,
    expense: COLORS.rust,
    debt:    COLORS.saffron,
  };

  return (
    <Box maxWidth={560}>

      {/* ── Header ── */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap" gap={1} mb={3}
      >
        <Box>
          <Typography sx={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: { xs: 28, sm: 38 }, fontWeight: 900,
            letterSpacing: "-1px", mb: 0.3,
          }}>
            Add Entry
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
            Type it naturally or fill the form below
          </Typography>
        </Box>
        <StatementUploader />
      </Box>

      {/* ── NL Logger ── */}
      <Box sx={{ ...glass({ p: 2.5 }), mb: 2 }}>
        <Typography sx={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10, letterSpacing: 3,
          textTransform: "uppercase",
          color: COLORS.saffron, mb: 1.5,
          display: "flex", alignItems: "center", gap: 0.8,
        }}>
          <AutoFixHighIcon sx={{ fontSize: 14 }} />
          Natural Language Logger
        </Typography>

        <Box display="flex" gap={1.5}>
          <TextField
            fullWidth
            placeholder='Try: "spent 200 petrol yesterday" or "received 37000 salary"'
            value={nlInput}
            onChange={e => setNlInput(e.target.value)}
            onKeyDown={handleNLKeyDown}
            sx={{
              "& .MuiOutlinedInput-root": {
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
              },
            }}
          />
          <Button
            variant="contained"
            endIcon={<SendIcon />}
            onClick={handleNLParse}
            disabled={!nlInput.trim()}
            sx={{
              bgcolor: COLORS.saffron,
              "&:hover": { bgcolor: COLORS.saffronDark },
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Parse
          </Button>
        </Box>

        {/* Quick chips */}
        <Box display="flex" gap={1} flexWrap="wrap" mt={1.5}>
          {QUICK_CHIPS.map(chip => (
            <Chip
              key={chip.label}
              label={chip.label}
              size="small"
              onClick={() => handleQuickChip(chip.text)}
              sx={{
                cursor: "pointer",
                fontSize: 11, fontWeight: 500,
                bgcolor: dark
                  ? "rgba(247,243,237,0.06)" : COLORS.cream,
                color: "text.secondary",
                border: `1px solid ${dark
                  ? "rgba(247,243,237,0.1)" : COLORS.rule}`,
                "&:hover": {
                  bgcolor: dark
                    ? "rgba(232,120,10,0.1)" : COLORS.saffronLight,
                  color: COLORS.saffron,
                  borderColor: COLORS.saffron + "44",
                },
              }}
            />
          ))}
        </Box>

        {/* Parse result */}
        {nlParsed && nlParsed.amount && (
          <Box sx={{
            mt: 1.5, p: 1.5, borderRadius: 2,
            background: dark
              ? "rgba(26,102,68,0.1)" : COLORS.greenLight,
            border: `1px solid ${COLORS.green}33`,
          }}>
            <Typography sx={{
              fontSize: 12, color: COLORS.green,
              fontWeight: 700, mb: 0.5,
            }}>
              ✅ Parsed — review and confirm below
            </Typography>
            <Box display="flex" gap={1.5} flexWrap="wrap">
              {[
                { l: "Amount",   v: "₹" + nlParsed.amount.toLocaleString("en-IN") },
                { l: "Type",     v: nlParsed.type     },
                { l: "Category", v: nlParsed.category  },
                { l: "Date",     v: nlParsed.date      },
              ].map(r => (
                <Box key={r.l}>
                  <Typography sx={{
                    fontSize: 9, textTransform: "uppercase",
                    letterSpacing: 1, color: "text.secondary",
                    fontFamily: "'DM Mono', monospace",
                  }}>
                    {r.l}
                  </Typography>
                  <Typography sx={{
                    fontSize: 13, fontWeight: 700,
                    color: COLORS.green,
                  }}>
                    {r.v}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>

      <Divider sx={{ mb: 2, opacity: 0.5 }}>
        <Typography sx={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10, letterSpacing: 2,
          textTransform: "uppercase",
          color: "text.secondary",
          px: 1,
        }}>
          or fill manually
        </Typography>
      </Divider>

      {/* ── Type toggle ── */}
      <ToggleButtonGroup
        value={type} exclusive
        onChange={(_, v) => {
          if (v) {
            setType(v);
            setCategory(CATEGORIES[v][0]);
          }
        }}
        fullWidth sx={{ mb: 2.5 }}
      >
        {["income","expense","debt"].map(t => (
          <ToggleButton key={t} value={t} sx={{
            textTransform: "capitalize",
            fontWeight: 600, fontSize: 14,
            "&.Mui-selected": {
              bgcolor: typeColor[t] + "15",
              color: typeColor[t],
              borderColor: typeColor[t] + "44",
            },
          }}>
            {t === "income" ? "+ Income"
              : t === "expense" ? "− Expense"
              : "⚠ Debt"}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {/* ── Form ── */}
      <Box sx={{ ...glass({ p: 2.5 }) }}>
        <Box
          display="flex"
          flexDirection="column"
          gap={2}
        >
          {type === "debt" && (
            <TextField
              label="Debt name (e.g. HDFC Car Loan)"
              value={debtName}
              onChange={e => setDebtName(e.target.value)}
              fullWidth
            />
          )}

          <TextField
            label="Amount (₹)" type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">₹</InputAdornment>
              ),
            }}
          />

          {type === "debt" && (
            <>
              <TextField
                label="Planned monthly payment / EMI (₹)"
                type="number"
                value={debtMonthly}
                onChange={e => setDebtMonthly(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">₹</InputAdornment>
                  ),
                }}
                helperText="How much will you pay each month?"
              />
              <DebtFeasibility
                amount={amount}
                monthly={debtMonthly}
                dark={dark}
              />
            </>
          )}

          <TextField
            label="Category" select
            value={category}
            onChange={e => setCategory(e.target.value)}
            fullWidth
          >
            {CATEGORIES[type].map(c => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </TextField>

          <TextField
            label="Date" type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            label="Note (optional)"
            value={note}
            onChange={e => setNote(e.target.value)}
            fullWidth
            placeholder={
              type === "debt"
                ? "Bank name, interest rate, tenure..."
                : "Any details..."
            }
          />

          {error && (
            <Alert
              severity="error"
              onClose={() => setError("")}
              sx={{ borderRadius: 2 }}
            >
              {error}
            </Alert>
          )}

          <Button
            variant="contained" size="large"
            onClick={handleSubmit}
            sx={{
              bgcolor: typeColor[type],
              "&:hover": { filter: "brightness(0.88)" },
              py: 1.4, fontSize: 15, fontWeight: 700,
              boxShadow: "none",
            }}
          >
            Save Entry
          </Button>
        </Box>
      </Box>

      <Snackbar
        open={success}
        autoHideDuration={3000}
        onClose={() => setSuccess(false)}
        message="Entry saved ✓"
      />
    </Box>
  );
}