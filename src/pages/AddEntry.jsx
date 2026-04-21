import { useState } from "react";
import { db } from "../firebase/config";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import {
  Box, Card, CardContent, Typography, TextField, Button,
  ToggleButtonGroup, ToggleButton, MenuItem, Alert, Snackbar
} from "@mui/material";

const CATEGORIES = {
  income: ["Salary", "Freelance", "Business", "Investment", "Gift", "Other"],
  expense: ["Rent", "Groceries", "Transport", "Dining", "Utilities", "Shopping", "Health", "Education", "Entertainment", "Other"],
  debt: ["Car Loan EMI", "Home Loan EMI", "Credit Card", "Personal Loan", "Other"],
};

export default function AddEntry() {
  const { user } = useAuth();
  const [type, setType] = useState("income");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Salary");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleTypeChange = (_, val) => {
    if (val) { setType(val); setCategory(CATEGORIES[val][0]); }
  };

  const handleSubmit = async () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) { setError("Please enter a valid amount."); return; }
    try {
      await addDoc(collection(db, "users", user.uid, "transactions"), {
        type, amount: Number(amount), category, date, note,
        createdAt: Timestamp.now()
      });
      setAmount(""); setNote(""); setSuccess(true);
    } catch (e) { setError("Failed to save. Try again."); }
  };

  const typeColors = { income: "#1D9E75", expense: "#E24B4A", debt: "#BA7517" };
  const typeBg = { income: "#E1F5EE", expense: "#FCEBEB", debt: "#FAEEDA" };

  return (
    <Box maxWidth={500}>
      <Typography sx={{ fontSize: { xs: 26, sm: 32 }, fontWeight: 800, letterSpacing: "-1px", mb: 0.5 }}>
            Add Entry
      </Typography>
      <Typography variant="h5" fontWeight={700} mb={0.5}>Log your income, expense or debt payment</Typography>
      <br></br>

      <ToggleButtonGroup value={type} exclusive onChange={handleTypeChange} fullWidth sx={{ mb: 3 }}>
        {["income", "expense", "debt"].map((t) => (
          <ToggleButton key={t} value={t} sx={{
            textTransform: "capitalize", fontWeight: 600,
            "&.Mui-selected": { bgcolor: typeBg[t], color: typeColors[t], borderColor: typeColors[t] }
          }}>
            {t === "income" ? "+ Income" : t === "expense" ? "– Expense" : "Debt"}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Card elevation={0} sx={{ border: "1px solid #eee", borderRadius: 3 }}>
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField label="Amount (₹)" type="number" value={amount}
            onChange={(e) => setAmount(e.target.value)} fullWidth
            InputProps={{ inputProps: { min: 0 } }} />

          <TextField label="Category" select value={category}
            onChange={(e) => setCategory(e.target.value)} fullWidth>
            {CATEGORIES[type].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>

          <TextField label="Date" type="date" value={date}
            onChange={(e) => setDate(e.target.value)} fullWidth
            InputLabelProps={{ shrink: true }} />

          <TextField label="Note (optional)" value={note}
            onChange={(e) => setNote(e.target.value)} fullWidth
            placeholder="e.g. April salary" />

          {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}

          <Button variant="contained" size="large" onClick={handleSubmit}
            sx={{ bgcolor: "#1D9E75", "&:hover": { bgcolor: "#0F6E56" }, borderRadius: 2, fontWeight: 600 }}>
            Save Entry
          </Button>
        </CardContent>
      </Card>

      <Snackbar open={success} autoHideDuration={3000} onClose={() => setSuccess(false)}
        message="Entry saved successfully!" />
    </Box>
  );
}