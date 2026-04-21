import { useEffect, useState } from "react";
import { db } from "../firebase/config";
import { doc, getDoc, setDoc, collection, onSnapshot, addDoc, deleteDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import {
  Box, Card, CardContent, Typography, TextField, Button,
  Avatar, Grid, Snackbar, Divider, IconButton, List,
  ListItem, ListItemText, MenuItem
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ incomeTarget: "", savingsGoal: "", currency: "INR" });
  const [debts, setDebts] = useState([]);
  const [newDebt, setNewDebt] = useState({ name: "", total: "", remaining: "", monthly: "" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid, "profile", "settings")).then(d => {
      if (d.exists()) setProfile(d.data());
    });
    return onSnapshot(collection(db, "users", user.uid, "debts"), snap => {
      setDebts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  const saveProfile = async () => {
    await setDoc(doc(db, "users", user.uid, "profile", "settings"), profile);
    setSaved(true);
  };

  const addDebt = async () => {
    if (!newDebt.name || !newDebt.total) return;
    await addDoc(collection(db, "users", user.uid, "debts"), {
      ...newDebt, total: Number(newDebt.total),
      remaining: Number(newDebt.remaining || newDebt.total),
      monthly: Number(newDebt.monthly || 0)
    });
    setNewDebt({ name: "", total: "", remaining: "", monthly: "" });
  };

  const deleteDebt = async (id) => {
    if (window.confirm("Remove this debt?"))
      await deleteDoc(doc(db, "users", user.uid, "debts", id));
  };

  const fmt = (n) => "₹" + Number(n).toLocaleString("en-IN");

  return (
    <Box maxWidth={600}>
      <Typography sx={{ fontSize: { xs: 26, sm: 32 }, fontWeight: 800, letterSpacing: "-1px", mb: 1 }}>
      Profile</Typography>
      <Typography variant="h6" fontWeight={700} sx={{mb: 2}}> Your settings and debt management</Typography>

      <Card elevation={0} sx={{ border: "1px solid #eee", borderRadius: 3, mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} sx={{mb: 3}}>
            <Box>
            <Avatar src={user?.photoURL} sx={{ width: 70, height: 70, bgcolor: "#1D9E75", mb: 2 }}>
              {user?.displayName?.[0]}
            </Avatar>
            
              <Typography fontWeight={700} sx={{ fontSize: { xs: 26, sm: 32 }, fontWeight: 800, letterSpacing: "-1px", lineHeight: 1.1, mb: 0.5, color: "#9d3f3f"  }}>{user?.displayName}</Typography>
              <Typography fontSize={13} color="text.secondary">{user?.email}</Typography>
            </Box>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField label="Monthly Income Target (₹)" type="number" fullWidth
                value={profile.incomeTarget} onChange={e => setProfile({ ...profile, incomeTarget: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Savings Goal (%)" type="number" fullWidth
                value={profile.savingsGoal} onChange={e => setProfile({ ...profile, savingsGoal: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Currency" select fullWidth value={profile.currency}
                onChange={e => setProfile({ ...profile, currency: e.target.value })}>
                <MenuItem value="INR">INR (₹)</MenuItem>
                <MenuItem value="USD">USD ($)</MenuItem>
                <MenuItem value="EUR">EUR (€)</MenuItem>
              </TextField>
            </Grid>
          </Grid>
          <Button variant="contained" sx={{ mt: 2, bgcolor: "#1D9E75", "&:hover": { bgcolor: "#0F6E56" }, borderRadius: 2 }}
            onClick={saveProfile}>Save Profile</Button>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ border: "1px solid #eee", borderRadius: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>Debt Management</Typography>
          <Grid container spacing={1.5} mb={2}>
            <Grid item xs={12} sm={6}><TextField label="Debt name" fullWidth size="small" value={newDebt.name} onChange={e => setNewDebt({ ...newDebt, name: e.target.value })} /></Grid>
            <Grid item xs={6} sm={3}><TextField label="Total (₹)" type="number" fullWidth size="small" value={newDebt.total} onChange={e => setNewDebt({ ...newDebt, total: e.target.value })} /></Grid>
            <Grid item xs={6} sm={3}><TextField label="Remaining (₹)" type="number" fullWidth size="small" value={newDebt.remaining} onChange={e => setNewDebt({ ...newDebt, remaining: e.target.value })} /></Grid>
            <Grid item xs={6} sm={3}><TextField label="Monthly EMI (₹)" type="number" fullWidth size="small" value={newDebt.monthly} onChange={e => setNewDebt({ ...newDebt, monthly: e.target.value })} /></Grid>
            <Grid item xs={6} sm={3}>
              <Button fullWidth variant="outlined" sx={{ height: "100%", borderColor: "#1D9E75", color: "#1D9E75" }} onClick={addDebt}>Add Debt</Button>
            </Grid>
          </Grid>
          <Divider sx={{ mb: 1 }} />
          {debts.length === 0 && <Typography fontSize={13} color="text.secondary">No debts added yet.</Typography>}
          <List disablePadding>
            {debts.map(d => (
              <ListItem key={d.id} disablePadding sx={{ py: 0.5 }}
                secondaryAction={<IconButton size="small" onClick={() => deleteDebt(d.id)}><DeleteIcon fontSize="small" color="error" /></IconButton>}>
                <ListItemText
                  primary={<Typography fontSize={14} fontWeight={600}>{d.name}</Typography>}
                  secondary={`Total: ${fmt(d.total)} · Remaining: ${fmt(d.remaining)} · EMI: ${fmt(d.monthly)}/mo`}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
      <Snackbar open={saved} autoHideDuration={3000} onClose={() => setSaved(false)} message="Profile saved!" />
    </Box>
  );
}