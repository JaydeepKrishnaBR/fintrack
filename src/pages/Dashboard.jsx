import { useEffect, useState } from "react";
import { db } from "../firebase/config";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { Box, Card, CardContent, Typography, LinearProgress, Grid, Chip, Divider } from "@mui/material";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function Dashboard() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "transactions"), orderBy("date", "desc"));
    const unsub = onSnapshot(q, snap => setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsub2 = onSnapshot(collection(db, "users", user.uid, "debts"), snap => setDebts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsub(); unsub2(); };
  }, [user]);

  const now = new Date();
  const last6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { month: MONTHS[d.getMonth()], year: d.getFullYear(), m: d.getMonth() };
  });

  const chartData = last6.map(({ month, year, m }) => {
    const filtered = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === m && d.getFullYear() === year;
    });
    return {
      month,
      Income: filtered.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0),
      Expense: filtered.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0),
    };
  });

  const thisMonth = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const income = thisMonth.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = thisMonth.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

  const fmt = (n) => "₹" + Number(n).toLocaleString("en-IN");

  return (
    <Box>
      <Typography sx={{ fontSize: { xs: 26, sm: 32 }, fontWeight: 800, letterSpacing: "-1px", mb: 0.5 }}>Dashboard</Typography>
      <Typography variant="h5" fontWeight={700} mb={0.5}>Your financial trends and debt progress</Typography>
      <br></br>

      <Grid container spacing={2} mb={3}>
        {[
          { label: "This Month Income", val: fmt(income), color: "#1D9E75" },
          { label: "This Month Expense", val: fmt(expense), color: "#E24B4A" },
          { label: "Savings Rate", val: savingsRate + "%", color: "#BA7517" },
        ].map(m => (
          <Grid item xs={12} sm={4} key={m.label}>
            <Card elevation={0} sx={{ border: "1px solid #eee", borderRadius: 3 }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>{m.label}</Typography>
                <Typography variant="h5" fontWeight={700} color={m.color} mt={0.5}>{m.val}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <br></br>

      <Card elevation={0} sx={{ border: "1px solid #eee", borderRadius: 3, mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" textTransform="uppercase" letterSpacing={0.5} mb={2}>
            Income vs Expenses (Last 6 Months)
          </Typography>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => "₹" + (v/1000) + "k"} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Legend />
              <Bar dataKey="Income" fill="#1D9E75" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expense" fill="#E24B4A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ border: "1px solid #eee", borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h5" fontWeight={700} mb={0.5} textTransform="uppercase" letterSpacing={0.5} mb={2}>
            Debt Paydown Progress
          </Typography> 
          {debts.length === 0 && <Typography color="text.secondary" fontSize={13}>No debts added yet. Use Add Entry → Debt to log your loans.</Typography>}
          {debts.map((debt, index) => {
  const pct = debt.total > 0 ? Math.round(((debt.total - debt.remaining) / debt.total) * 100) : 0;
  return (
    <Box key={debt.id}>
      <Box mb={2}>
        <Box display="flex" justifyContent="space-between" mb={2}>
          <Typography fontSize={13} fontWeight={600}>{debt.name}</Typography>
          <Chip label={pct + "% paid"} size="small" sx={{ bgcolor: "#E1F5EE", color: "#0F6E56", fontWeight: 600, fontSize: 11 }} />
        </Box>
        <LinearProgress variant="determinate" value={pct}
          sx={{ height: 8, borderRadius: 4, bgcolor: "#f0f0f0", "& .MuiLinearProgress-bar": { bgcolor: "#BA7517", borderRadius: 4 } }} />
        <Box display="flex" justifyContent="space-between" mt={0.5}>
          <Typography fontSize={11} color="text.secondary" mb={1}>{fmt(debt.remaining)} remaining</Typography>
          <Typography fontSize={11} color="text.secondary" mb={1}>{fmt(debt.monthly)}/mo</Typography>
        </Box>
      </Box>
      {index < debts.length - 1 && (
        <Divider sx={{ mt: 2, mb: 2, opacity: 2 }} />
      )}
    </Box>
  );
})}
        </CardContent>
      </Card>
    </Box>
  );
}