import { useEffect, useState } from "react";
import { db } from "../firebase/config";
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, Timestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import {
  Box, Typography, Card, CardContent, TextField, Button,
  LinearProgress, IconButton, Grid, MenuItem, Dialog,
  DialogTitle, DialogContent, DialogActions, Chip, Tooltip
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleIcon from "@mui/icons-material/AddCircle";

const GOAL_EMOJIS = {
  "Emergency Fund": "🛡️", "Phone": "📱", "Laptop": "💻",
  "Vacation": "✈️", "Car": "🚗", "Home": "🏠",
  "Wedding": "💍", "Education": "📚", "Investment": "📈", "Custom": "🎯",
};

const GOAL_TYPES = Object.keys(GOAL_EMOJIS);

export default function Goals() {
  const { user } = useAuth();
  const { resolved } = useThemeMode();
  const dark = resolved === "dark";
  const [goals, setGoals] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [open, setOpen] = useState(false);
  const [addFundsGoal, setAddFundsGoal] = useState(null);
  const [addAmount, setAddAmount] = useState("");
  const [form, setForm] = useState({ name: "Emergency Fund", customName: "", target: "", monthly: "", notes: "" });

  useEffect(() => {
    if (!user) return;
    const u1 = onSnapshot(collection(db, "users", user.uid, "goals"), s =>
      setGoals(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(collection(db, "users", user.uid, "transactions"), s =>
      setTransactions(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); };
  }, [user]);

  // Average monthly savings
  const now = new Date();
  const last3 = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i - 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const monthlySavings = last3.map(m => {
    const txns = transactions.filter(t => t.date?.startsWith(m));
    const inc = txns.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
    const exp = txns.filter(t => t.type !== "income").reduce((s, t) => s + Number(t.amount || 0), 0);
    return Math.max(0, inc - exp);
  });
  const avgMonthlySavings = monthlySavings.reduce((s, v) => s + v, 0) / 3;

  const handleCreate = async () => {
    const name = form.name === "Custom" ? form.customName : form.name;
    if (!name || !form.target) return;
    await addDoc(collection(db, "users", user.uid, "goals"), {
      name,
      emoji: GOAL_EMOJIS[form.name] || "🎯",
      target: Number(form.target),
      saved: 0,
      monthly: Number(form.monthly) || 0,
      notes: form.notes,
      createdAt: Timestamp.now(),
    });
    setForm({ name: "Emergency Fund", customName: "", target: "", monthly: "", notes: "" });
    setOpen(false);
  };

  const handleAddFunds = async () => {
    if (!addAmount || !addFundsGoal) return;
    const newSaved = Math.min(Number(addFundsGoal.saved || 0) + Number(addAmount), addFundsGoal.target);
    await updateDoc(doc(db, "users", user.uid, "goals", addFundsGoal.id), { saved: newSaved });
    setAddFundsGoal(null);
    setAddAmount("");
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this goal?"))
      await deleteDoc(doc(db, "users", user.uid, "goals", id));
  };

  const fmt = n => "₹" + Number(n || 0).toLocaleString("en-IN");

  const glassCard = (extra = {}) => ({
    elevation: 0,
    sx: {
      backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      background: dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.7)",
      border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.9)"}`,
      borderRadius: 3,
      boxShadow: dark ? "0 4px 24px rgba(0,0,0,0.3)" : "0 4px 24px rgba(0,0,0,0.06)",
      ...extra,
    }
  });

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} mb={3}>
        <Box>
          <Typography sx={{ fontSize: { xs: 26, sm: 32 }, fontWeight: 800, letterSpacing: "-1px", mb: 0.3 }}>
            Goals
          </Typography>
          <Typography sx={{ color: dark ? "rgba(255,255,255,0.45)" : "#888", fontWeight: 500 }}>
            Save with purpose — track every rupee towards what matters
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}
          sx={{ bgcolor: "#1D9E75", "&:hover": { bgcolor: "#0F6E56" }, borderRadius: 2.5, textTransform: "none", fontWeight: 700, boxShadow: "none" }}>
          New Goal
        </Button>
      </Box>

      {/* Savings capacity card */}
      {avgMonthlySavings > 0 && (
        <Card {...glassCard({ mb: 3 })}>
          <CardContent>
            <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: dark ? "rgba(255,255,255,0.4)" : "#aaa", mb: 1 }}>
              Your Saving Capacity
            </Typography>
            <Typography sx={{ fontSize: 22, fontWeight: 800, color: "#1D9E75", letterSpacing: "-0.5px" }}>
              ~{fmt(Math.round(avgMonthlySavings))}/month
            </Typography>
            <Typography sx={{ fontSize: 12, color: dark ? "rgba(255,255,255,0.45)" : "#888", mt: 0.3 }}>
              Based on your last 3 months average savings
            </Typography>
          </CardContent>
        </Card>
      )}

      {goals.length === 0 && (
        <Card {...glassCard()}>
          <CardContent sx={{ textAlign: "center", py: 5 }}>
            <Typography sx={{ fontSize: 36, mb: 1 }}>🎯</Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 0.5 }}>No goals yet</Typography>
            <Typography sx={{ fontSize: 13, color: dark ? "rgba(255,255,255,0.4)" : "#aaa", mb: 2 }}>
              Set a goal and watch your savings build towards it
            </Typography>
            <Button variant="contained" onClick={() => setOpen(true)}
              sx={{ bgcolor: "#1D9E75", "&:hover": { bgcolor: "#0F6E56" }, borderRadius: 2.5, textTransform: "none", fontWeight: 700, boxShadow: "none" }}>
              Create your first goal
            </Button>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={2}>
        {goals.map(goal => {
          const pct = goal.target > 0 ? Math.min(100, Math.round((goal.saved / goal.target) * 100)) : 0;
          const remaining = goal.target - (goal.saved || 0);
          const monthsLeft = goal.monthly > 0 ? Math.ceil(remaining / goal.monthly) : null;
          const autoMonths = avgMonthlySavings > 0 && !goal.monthly ? Math.ceil(remaining / avgMonthlySavings) : null;
          const isComplete = pct >= 100;

          return (
            <Grid item xs={12} sm={6} key={goal.id}>
              <Card {...glassCard()}>
                <CardContent>
                  <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={1.5}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <Typography sx={{ fontSize: 28 }}>{goal.emoji || "🎯"}</Typography>
                      <Box>
                        <Typography sx={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>{goal.name}</Typography>
                        {isComplete && (
                          <Chip label="Completed! 🎉" size="small" sx={{ bgcolor: "rgba(29,158,117,0.15)", color: "#1D9E75", fontWeight: 700, fontSize: 10, mt: 0.3 }} />
                        )}
                      </Box>
                    </Box>
                    <IconButton size="small" onClick={() => handleDelete(goal.id)}>
                      <DeleteIcon sx={{ fontSize: 16, color: "#E24B4A" }} />
                    </IconButton>
                  </Box>

                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography sx={{ fontSize: 13, color: dark ? "rgba(255,255,255,0.5)" : "#888" }}>
                      {fmt(goal.saved || 0)} saved
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                      {fmt(goal.target)} goal
                    </Typography>
                  </Box>

                  <LinearProgress variant="determinate" value={pct}
                    sx={{ height: 8, borderRadius: 4, mb: 1,
                      bgcolor: dark ? "rgba(255,255,255,0.06)" : "#f0f0f0",
                      "& .MuiLinearProgress-bar": {
                        bgcolor: isComplete ? "#1D9E75" : pct > 60 ? "#4caf50" : pct > 30 ? "#BA7517" : "#378ADD",
                        borderRadius: 4,
                      }
                    }} />

                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography sx={{ fontSize: 12, color: dark ? "rgba(255,255,255,0.4)" : "#aaa" }}>
                        {pct}% · {fmt(remaining)} to go
                      </Typography>
                      {(monthsLeft || autoMonths) && !isComplete && (
                        <Typography sx={{ fontSize: 11, color: "#378ADD", fontWeight: 600 }}>
                          ~{monthsLeft || autoMonths} months to reach goal
                        </Typography>
                      )}
                    </Box>
                    {!isComplete && (
                      <Button size="small" startIcon={<AddCircleIcon sx={{ fontSize: 14 }} />}
                        onClick={() => { setAddFundsGoal(goal); setAddAmount(""); }}
                        sx={{ textTransform: "none", fontSize: 12, fontWeight: 700, color: "#1D9E75", borderRadius: 2 }}>
                        Add funds
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Create goal dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3, background: dark ? "#1a1f2e" : "white" } }}>
        <DialogTitle sx={{ fontWeight: 800, letterSpacing: "-0.5px" }}>New Goal</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
          <TextField select label="Goal type" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} fullWidth>
            {GOAL_TYPES.map(t => (
              <MenuItem key={t} value={t}>{GOAL_EMOJIS[t]} {t}</MenuItem>
            ))}
          </TextField>
          {form.name === "Custom" && (
            <TextField label="Goal name" value={form.customName} onChange={e => setForm({ ...form, customName: e.target.value })} fullWidth />
          )}
          <TextField label="Target amount (₹)" type="number" value={form.target} onChange={e => setForm({ ...form, target: e.target.value })} fullWidth />
          <TextField label="Monthly contribution (₹)" type="number" value={form.monthly} onChange={e => setForm({ ...form, monthly: e.target.value })} fullWidth
            helperText={form.target && form.monthly && Number(form.monthly) > 0
              ? `Done in ~${Math.ceil(Number(form.target) / Number(form.monthly))} months`
              : "How much can you set aside each month?"} />
          <TextField label="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} fullWidth multiline rows={2} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setOpen(false)} sx={{ textTransform: "none", color: dark ? "rgba(255,255,255,0.5)" : "#888" }}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}
            sx={{ bgcolor: "#1D9E75", "&:hover": { bgcolor: "#0F6E56" }, borderRadius: 2, textTransform: "none", fontWeight: 700, boxShadow: "none" }}>
            Create Goal
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add funds dialog */}
      <Dialog open={!!addFundsGoal} onClose={() => setAddFundsGoal(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3, background: dark ? "#1a1f2e" : "white" } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Add funds to {addFundsGoal?.name}</DialogTitle>
        <DialogContent sx={{ pt: "8px !important" }}>
          <TextField label="Amount (₹)" type="number" value={addAmount}
            onChange={e => setAddAmount(e.target.value)} fullWidth autoFocus />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setAddFundsGoal(null)} sx={{ textTransform: "none", color: dark ? "rgba(255,255,255,0.5)" : "#888" }}>Cancel</Button>
          <Button variant="contained" onClick={handleAddFunds}
            sx={{ bgcolor: "#1D9E75", "&:hover": { bgcolor: "#0F6E56" }, borderRadius: 2, textTransform: "none", fontWeight: 700, boxShadow: "none" }}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}