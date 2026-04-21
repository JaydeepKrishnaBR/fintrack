import { useEffect, useState } from "react";
import { db } from "../firebase/config";
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import {
  Box, Card, Typography, List, ListItem, ListItemText,
  ListItemAvatar, Avatar, IconButton, Chip, TextField,
  MenuItem, Grid, Collapse
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import CreditCardIcon from "@mui/icons-material/CreditCard";

const DATE_RANGES = [
  { label: "All time", value: "all" },
  { label: "Last 7 days", value: "7d" },
  { label: "This month", value: "month" },
  { label: "Last 6 months", value: "6m" },
  { label: "This year", value: "year" },
  { label: "Custom range", value: "custom" },
];

function getDateBounds(range) {
  const now = new Date();
  if (range === "7d") {
    const from = new Date(); from.setDate(now.getDate() - 7);
    return { from, to: now };
  }
  if (range === "month") {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
  }
  if (range === "6m") {
    const from = new Date(); from.setMonth(now.getMonth() - 6);
    return { from, to: now };
  }
  if (range === "year") {
    return { from: new Date(now.getFullYear(), 0, 1), to: now };
  }
  return null;
}

export default function Transactions() {
  const { user } = useAuth();
  const { resolved } = useThemeMode();
  const dark = resolved === "dark";
  const [transactions, setTransactions] = useState([]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "transactions"), orderBy("date", "desc"));
    return onSnapshot(q, s => setTransactions(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);

  const handleDelete = async (id) => {
    if (window.confirm("Delete this entry?"))
      await deleteDoc(doc(db, "users", user.uid, "transactions", id));
  };

  const filtered = transactions.filter(t => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (dateRange === "all") return true;
    const tDate = new Date(t.date);
    if (dateRange === "custom") {
      if (customFrom && tDate < new Date(customFrom)) return false;
      if (customTo && tDate > new Date(customTo + "T23:59:59")) return false;
      return true;
    }
    const bounds = getDateBounds(dateRange);
    if (!bounds) return true;
    return tDate >= bounds.from && tDate <= bounds.to;
  });

  const typeConfig = {
    income: { color: "#1D9E75", bg: dark ? "rgba(29,158,117,0.2)" : "#E1F5EE", icon: <TrendingUpIcon fontSize="small" />, prefix: "+" },
    expense: { color: "#E24B4A", bg: dark ? "rgba(226,75,74,0.2)" : "#FCEBEB", icon: <TrendingDownIcon fontSize="small" />, prefix: "-" },
    debt: { color: "#BA7517", bg: dark ? "rgba(186,117,23,0.2)" : "#FAEEDA", icon: <CreditCardIcon fontSize="small" />, prefix: "-" },
  };

  const fmt = (n) => "₹" + Number(n).toLocaleString("en-IN");

  const glassCard = {
    elevation: 0,
    sx: {
      backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      background: dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.7)",
      border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.9)"}`,
      borderRadius: 3,
      boxShadow: dark ? "0 4px 24px rgba(0,0,0,0.3)" : "0 4px 24px rgba(0,0,0,0.06)",
    }
  };

  return (
    <Box>
      <Typography sx={{ fontSize: { xs: 26, sm: 32 }, fontWeight: 800, letterSpacing: "-1px", mb: 0.5 }}>
        Transactions
      </Typography>
      <Typography sx={{ color: dark ? "rgba(255,255,255,0.45)" : "#888", mb: 3, fontWeight: 500 }}>
        {filtered.length} {filtered.length === 1 ? "entry" : "entries"} found
      </Typography>

      <Card {...glassCard} sx={{ ...glassCard.sx, mb: 2, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField select label="Type" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} fullWidth size="small">
              <MenuItem value="all">All types</MenuItem>
              <MenuItem value="income">Income</MenuItem>
              <MenuItem value="expense">Expense</MenuItem>
              <MenuItem value="debt">Debt</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField select label="Date range" value={dateRange} onChange={e => setDateRange(e.target.value)} fullWidth size="small">
              {DATE_RANGES.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
            </TextField>
          </Grid>
        </Grid>

        <Collapse in={dateRange === "custom"}>
          <Grid container spacing={2} mt={0.5}>
            <Grid item xs={12} sm={4}>
              <TextField label="From" type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                fullWidth size="small" InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="To" type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                fullWidth size="small" InputLabelProps={{ shrink: true }} />
            </Grid>
          </Grid>
        </Collapse>
      </Card>

      <Card {...glassCard}>
        {filtered.length === 0 && (
          <Box p={3}><Typography sx={{ color: dark ? "rgba(255,255,255,0.35)" : "#bbb", fontSize: 14 }}>No entries match your filters.</Typography></Box>
        )}
        <List disablePadding>
          {filtered.map((t, i) => {
            const cfg = typeConfig[t.type];
            return (
              <ListItem key={t.id} divider={i < filtered.length - 1}
                secondaryAction={
                  <IconButton edge="end" size="small" onClick={() => handleDelete(t.id)}>
                    <DeleteIcon fontSize="small" color="error" />
                  </IconButton>
                }>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: cfg.bg, color: cfg.color, width: 36, height: 36 }}>{cfg.icon}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{t.category}</Typography>
                      <Chip label={t.type} size="small" sx={{ bgcolor: cfg.bg, color: cfg.color, fontSize: 10, height: 18, fontWeight: 700 }} />
                    </Box>
                  }
                  secondary={t.note ? `${t.date} · ${t.note}` : t.date}
                />
                <Typography sx={{ fontWeight: 800, color: cfg.color, fontSize: 14, mr: 4 }}>
                  {cfg.prefix}{fmt(t.amount)}
                </Typography>
              </ListItem>
            );
          })}
        </List>
      </Card>
    </Box>
  );
}