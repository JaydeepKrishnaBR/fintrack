import { useState } from "react";
import { db } from "../firebase/config";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import { COLORS, glassStyle } from "../brand/theme";
import {
  Box, Typography, Button, LinearProgress,
  TextField, MenuItem, Chip, Grid, InputAdornment
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowBackIcon   from "@mui/icons-material/ArrowBack";
import CheckIcon       from "@mui/icons-material/Check";

// ── Data ──────────────────────────────────────────────────────────────────────
const PERSONAS = [
  { id: "salaried",   label: "Salaried Employee", emoji: "💼", desc: "Fixed monthly income, track expenses and savings" },
  { id: "freelancer", label: "Freelancer / Side Hustle", emoji: "🚀", desc: "Variable income, project-based earnings" },
  { id: "business",   label: "Business Owner", emoji: "🏢", desc: "Revenue, expenses, tax — full business view" },
  { id: "student",    label: "Student", emoji: "🎓", desc: "Budget-focused, allowance or part-time income" },
  { id: "family",     label: "Family / Joint", emoji: "🏠", desc: "Household finances, shared budgets" },
];

const PAY_CYCLES = [
  { id: "monthly_1",  label: "1st of every month"  },
  { id: "monthly_5",  label: "5th of every month"  },
  { id: "monthly_10", label: "10th of every month" },
  { id: "monthly_25", label: "25th of every month" },
  { id: "monthly_30", label: "Last day of month"   },
  { id: "biweekly",   label: "Every 2 weeks"       },
  { id: "irregular",  label: "Irregular / Project-based" },
];

const TRACK_OPTIONS = [
  { id: "expenses",    label: "Expenses only",             emoji: "📊" },
  { id: "savings",     label: "Expenses + Savings goals",  emoji: "🎯" },
  { id: "full",        label: "Full financial health",     emoji: "💡", desc: "Tax, debt, investments" },
];

// Budget suggestion percentages based on income
function suggestBudgets(income) {
  if (!income || income <= 0) return {};
  return {
    Rent:          Math.round(income * 0.30),
    Groceries:     Math.round(income * 0.12),
    Transport:     Math.round(income * 0.08),
    Dining:        Math.round(income * 0.06),
    Utilities:     Math.round(income * 0.05),
    Entertainment: Math.round(income * 0.04),
    Health:        Math.round(income * 0.04),
    Savings:       Math.round(income * 0.20),
  };
}

const TOTAL_STEPS = 5;

export default function OnboardingFlow({ onComplete }) {
  const { user }            = useAuth();
  const { resolved }        = useThemeMode();
  const dark                = resolved === "dark";

  const [step, setStep]           = useState(1);
  const [saving, setSaving]       = useState(false);

  // Form state
  const [selectedPersona, setPersona]   = useState("");
  const [payCycle, setPayCycle]         = useState("monthly_1");
  const [primaryIncome, setPrimary]     = useState("");
  const [secondaryIncome, setSecondary] = useState("");
  const [trackMode, setTrackMode]       = useState("full");
  const [budgets, setBudgets]           = useState({});
  const [budgetsConfirmed, setConfirmed]= useState(false);

  const income = Number(primaryIncome) || 0;
  const suggested = suggestBudgets(income);

  const fmt = (n) => "₹" + Number(n).toLocaleString("en-IN");

  // Auto-fill budgets when income changes
  const handleIncomeChange = (val) => {
    setPrimary(val);
    if (Number(val) > 0) {
      setBudgets(suggestBudgets(Number(val)));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const onboardingData = {
        persona:         selectedPersona,
        payCycle,
        primaryIncome:   Number(primaryIncome) || 0,
        secondaryIncome: Number(secondaryIncome) || 0,
        trackMode,
        completedAt:     Timestamp.now(),
      };

      // Save onboarding profile
      await setDoc(
        doc(db, "users", user.uid, "profile", "onboarding"),
        onboardingData
      );

      // Save auto-generated budgets if income was entered
      if (income > 0 && Object.keys(budgets).length > 0) {
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const budgetData = {};
        Object.entries(budgets).forEach(([cat, amt]) => {
          if (Number(amt) > 0) budgetData[cat] = Number(amt);
        });
        await setDoc(
          doc(db, "users", user.uid, "budgets", monthKey),
          budgetData
        );
      }

      onComplete();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const glass = glassStyle(dark, { borderRadius: 4 });

  const selectionCard = (selected) => ({
    ...glass,
    cursor: "pointer",
    border: selected
      ? `2px solid ${COLORS.saffron}`
      : `1px solid ${dark ? "rgba(247,243,237,0.08)" : COLORS.rule}`,
    background: selected
      ? dark ? `rgba(232,120,10,0.12)` : COLORS.saffronLight
      : glass.background,
    transition: "all 0.15s",
    p: 2,
    "&:hover": {
      borderColor: COLORS.saffron,
      background: dark ? "rgba(232,120,10,0.08)" : COLORS.saffronLight,
    },
  });

  // ── Steps ──────────────────────────────────────────────────────────────────
  const steps = {
    1: (
      <Box>
        <StepLabel step={1} label="WHO ARE YOU?" />
        <Typography variant="h3" sx={{ mb: 0.5, fontSize: { xs: 28, sm: 38 } }}>
          Tell us about yourself
        </Typography>
        <Typography sx={{ color: "text.secondary", mb: 3 }}>
          FinTrack adapts to your financial life. Pick the one that fits best.
        </Typography>
        <Grid container spacing={1.5}>
          {PERSONAS.map(p => (
            <Grid item xs={12} sm={6} key={p.id}>
              <Box
                sx={selectionCard(selectedPersona === p.id)}
                onClick={() => setPersona(p.id)}
              >
                <Box display="flex" alignItems="center" gap={1.5}>
                  <Typography sx={{ fontSize: 28 }}>{p.emoji}</Typography>
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                      {p.label}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                      {p.desc}
                    </Typography>
                  </Box>
                  {selectedPersona === p.id && (
                    <CheckIcon sx={{ ml: "auto", color: COLORS.saffron, flexShrink: 0 }} />
                  )}
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>
    ),

    2: (
      <Box>
        <StepLabel step={2} label="PAY CYCLE" />
        <Typography variant="h3" sx={{ mb: 0.5, fontSize: { xs: 28, sm: 38 } }}>
          When do you get paid?
        </Typography>
        <Typography sx={{ color: "text.secondary", mb: 3 }}>
          This helps us calculate your Safe to Spend accurately.
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {PAY_CYCLES.map(c => (
            <Box
              key={c.id}
              sx={selectionCard(payCycle === c.id)}
              onClick={() => setPayCycle(c.id)}
            >
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{c.label}</Typography>
                {payCycle === c.id && (
                  <CheckIcon sx={{ color: COLORS.saffron, fontSize: 18 }} />
                )}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    ),

    3: (
      <Box>
        <StepLabel step={3} label="YOUR INCOME" />
        <Typography variant="h3" sx={{ mb: 0.5, fontSize: { xs: 28, sm: 38 } }}>
          How much do you earn?
        </Typography>
        <Typography sx={{ color: "text.secondary", mb: 3 }}>
          Used to calculate budgets and savings rate. You can skip this.
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Monthly income (₹)"
            type="number"
            value={primaryIncome}
            onChange={e => handleIncomeChange(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">₹</InputAdornment>
              ),
            }}
            helperText="Your salary, pension, or primary income"
          />
          <TextField
            label="Secondary income (₹) — optional"
            type="number"
            value={secondaryIncome}
            onChange={e => setSecondary(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">₹</InputAdornment>
              ),
            }}
            helperText="Freelance, rent, side hustle, etc."
          />
          {income > 0 && (
            <Box sx={{
              ...glass, p: 2,
              border: `1px solid ${COLORS.green}44`,
              background: dark ? "rgba(26,102,68,0.1)" : COLORS.greenLight,
            }}>
              <Typography sx={{
                fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: 2, color: COLORS.green, mb: 0.5,
              }}>
                Based on {fmt(income)}/month
              </Typography>
              <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                We'll suggest budgets in the next step.
                20% savings target = <strong>{fmt(income * 0.2)}/month</strong>
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    ),

    4: (
      <Box>
        <StepLabel step={4} label="WHAT TO TRACK" />
        <Typography variant="h3" sx={{ mb: 0.5, fontSize: { xs: 28, sm: 38 } }}>
          What matters to you?
        </Typography>
        <Typography sx={{ color: "text.secondary", mb: 3 }}>
          You can always change this later from your profile.
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {TRACK_OPTIONS.map(t => (
            <Box
              key={t.id}
              sx={selectionCard(trackMode === t.id)}
              onClick={() => setTrackMode(t.id)}
            >
              <Box display="flex" alignItems="center" gap={1.5}>
                <Typography sx={{ fontSize: 24 }}>{t.emoji}</Typography>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                    {t.label}
                  </Typography>
                  {t.desc && (
                    <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                      {t.desc}
                    </Typography>
                  )}
                </Box>
                {trackMode === t.id && (
                  <CheckIcon sx={{ ml: "auto", color: COLORS.saffron, flexShrink: 0 }} />
                )}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    ),

    5: (
      <Box>
        <StepLabel step={5} label="YOUR FIRST BUDGET" />
        <Typography variant="h3" sx={{ mb: 0.5, fontSize: { xs: 28, sm: 38 } }}>
          {income > 0
            ? "We've suggested budgets for you"
            : "Set your first budget"}
        </Typography>
        <Typography sx={{ color: "text.secondary", mb: 2 }}>
          {income > 0
            ? `Based on ₹${income.toLocaleString("en-IN")}/month income. Edit any amount.`
            : "Enter your monthly limits per category. You can skip this."}
        </Typography>

        {income > 0 && (
          <Box sx={{
            ...glass, p: 1.5, mb: 2,
            border: `1px solid ${COLORS.saffron}33`,
            background: dark ? "rgba(232,120,10,0.06)" : COLORS.saffronLight,
          }}>
            <Typography sx={{ fontSize: 12, color: COLORS.saffron, fontWeight: 600 }}>
              💡 These are suggestions based on common spending patterns.
              The 20% savings allocation is a recommended target.
            </Typography>
          </Box>
        )}

        <Grid container spacing={1.5}>
          {Object.entries(income > 0 ? suggested : {
            Rent: "", Groceries: "", Transport: "",
            Dining: "", Utilities: "", Entertainment: "",
          }).map(([cat, suggestion]) => (
            <Grid item xs={12} sm={6} key={cat}>
              <TextField
                label={cat}
                type="number"
                fullWidth
                value={budgets[cat] || ""}
                onChange={e => setBudgets(prev => ({
                  ...prev,
                  [cat]: e.target.value,
                }))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">₹</InputAdornment>
                  ),
                }}
                helperText={
                  income > 0 && suggestion
                    ? `Suggested: ${fmt(suggestion)}`
                    : undefined
                }
              />
            </Grid>
          ))}
        </Grid>
      </Box>
    ),
  };

  const canNext = () => {
    if (step === 1) return !!selectedPersona;
    return true;
  };

  return (
    <Box sx={{
      minHeight: "100vh",
      background: dark
        ? "radial-gradient(ellipse at top, rgba(232,120,10,0.08) 0%, #0F0E0C 60%)"
        : "radial-gradient(ellipse at top, rgba(232,120,10,0.06) 0%, #F7F3ED 60%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      p: { xs: 2, sm: 4 },
    }}>
      <Box sx={{ width: "100%", maxWidth: 640 }}>

        {/* Logo */}
        <Box display="flex" alignItems="center" gap={1.5} mb={4}>
          <Box sx={{
            width: 40, height: 40, borderRadius: 2,
            background: `linear-gradient(135deg, ${COLORS.saffron}, ${COLORS.saffronDark})`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Typography sx={{ fontSize: 18, color: "white", fontWeight: 900,
              fontFamily: "'DM Mono', monospace" }}>
              ₹
            </Typography>
          </Box>
          <Typography sx={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 22, fontWeight: 900,
            color: COLORS.saffron,
          }}>
            FinTrack
          </Typography>
        </Box>

        {/* Progress bar */}
        <Box mb={3}>
          <Box display="flex" justifyContent="space-between" mb={0.8}>
            <Typography sx={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10, letterSpacing: 2,
              textTransform: "uppercase",
              color: "text.secondary",
            }}>
              Step {step} of {TOTAL_STEPS}
            </Typography>
            <Typography sx={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10, letterSpacing: 2,
              textTransform: "uppercase",
              color: COLORS.saffron,
            }}>
              {Math.round((step / TOTAL_STEPS) * 100)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(step / TOTAL_STEPS) * 100}
            sx={{
              height: 3,
              borderRadius: 2,
              bgcolor: dark ? "rgba(247,243,237,0.08)" : COLORS.cream,
              "& .MuiLinearProgress-bar": {
                bgcolor: COLORS.saffron,
                borderRadius: 2,
              },
            }}
          />
        </Box>

        {/* Step content */}
        <Box sx={{ ...glass, p: { xs: 3, sm: 4 }, mb: 3, borderRadius: 3 }}>
          {steps[step]}
        </Box>

        {/* Navigation */}
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1}
            sx={{ color: "text.secondary" }}
          >
            Back
          </Button>

          <Button
            variant="text"
            onClick={() => {
              if (step < TOTAL_STEPS) setStep(s => s + 1);
              else handleSave();
            }}
            sx={{ color: "text.secondary", fontSize: 12 }}
          >
            {step === TOTAL_STEPS ? "Skip & finish" : "Skip"}
          </Button>

          {step < TOTAL_STEPS ? (
            <Button
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              sx={{
                bgcolor: COLORS.saffron,
                "&:hover": { bgcolor: COLORS.saffronDark },
                px: 3,
              }}
            >
              Continue
            </Button>
          ) : (
            <Button
              variant="contained"
              endIcon={<CheckIcon />}
              onClick={handleSave}
              disabled={saving}
              sx={{
                bgcolor: COLORS.green,
                "&:hover": { bgcolor: COLORS.greenDark },
                px: 3,
              }}
            >
              {saving ? "Saving..." : "Get started"}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}

// Small helper component
function StepLabel({ step, label }) {
  return (
    <Typography sx={{
      fontFamily: "'DM Mono', monospace",
      fontSize: 10, letterSpacing: 4,
      textTransform: "uppercase",
      color: COLORS.saffron,
      mb: 1.5,
    }}>
      {String(step).padStart(2, "0")} — {label}
    </Typography>
  );
}