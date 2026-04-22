import { useEffect, useState } from "react";
import { db } from "../firebase/config";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Card, CardContent, Grid, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Chip, Tooltip, Divider, Button,
  Collapse, LinearProgress
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import LogoutIcon from "@mui/icons-material/Logout";
import PeopleIcon from "@mui/icons-material/People";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import RefreshIcon from "@mui/icons-material/Refresh";

const fmt = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

export default function AdminDashboard() {
  const { user, isAdmin, logout } = useAuth();
  const { resolved } = useThemeMode();
  const dark = resolved === "dark";
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isAdmin) {
      navigate("/admin-login");
      return;
    }
    fetchAllUsers();
  }, [user, isAdmin]);

  const fetchAllUsers = async () => {
    setLoading(true);
    try {
      // Get all documents in the users collection
      const usersSnap = await getDocs(collection(db, "users"));

      const userList = await Promise.all(
        usersSnap.docs.map(async (userDoc) => {
          const uid = userDoc.id;

          // Fetch transactions subcollection directly (matches your structure)
          let transactions = [];
          try {
            const txSnap = await getDocs(
              collection(db, "users", uid, "transactions")
            );
            transactions = txSnap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            }));
          } catch (_) {}

          // Fetch debts subcollection
          let debts = [];
          try {
            const debtSnap = await getDocs(
              collection(db, "users", uid, "debts")
            );
            debts = debtSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
          } catch (_) {}

          // Calculate totals
          const income = transactions
            .filter((t) => t.type === "income")
            .reduce((s, t) => s + Number(t.amount || 0), 0);
          const expense = transactions
            .filter((t) => t.type === "expense")
            .reduce((s, t) => s + Number(t.amount || 0), 0);
          const totalDebt = debts.reduce(
            (s, d) => s + Number(d.remaining || 0),
            0
          );

          // Get display name/email from the most recent transaction's data
          // or fall back to UID. The profile/info doc may or may not exist.
          let displayName = "";
          let email = "";
          try {
            const profileSnap = await getDocs(
              collection(db, "users", uid, "profile")
            );
            const infoDoc = profileSnap.docs.find(
              (d) => d.id === "info" || d.id === "settings"
            );
            if (infoDoc) {
              displayName = infoDoc.data().displayName || "";
              email = infoDoc.data().email || "";
            }
          } catch (_) {}

          return {
            uid,
            displayName,
            email,
            transactions: transactions.sort(
              (a, b) => new Date(b.date) - new Date(a.date)
            ),
            debts,
            income,
            expense,
            totalDebt,
          };
        })
      );

      setUsers(userList);
    } catch (e) {
      console.error("Error fetching users:", e);
    }
    setLoading(false);
  };

  const handleDeleteUserData = async (uid) => {
    if (
      !window.confirm(
        "Delete ALL data for this user? This cannot be undone."
      )
    )
      return;
    try {
      for (const col of ["transactions", "debts", "profile"]) {
        const snap = await getDocs(collection(db, "users", uid, col));
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      }
      await deleteDoc(doc(db, "users", uid));
      fetchAllUsers();
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  const totalUsers = users.length;
  const totalIncome = users.reduce((s, u) => s + u.income, 0);
  const totalDebt = users.reduce((s, u) => s + u.totalDebt, 0);

  const glassCard = {
    elevation: 0,
    sx: {
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      background: dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.7)",
      border: `1px solid ${
        dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.9)"
      }`,
      borderRadius: 3,
      boxShadow: dark
        ? "0 4px 24px rgba(0,0,0,0.3)"
        : "0 4px 24px rgba(0,0,0,0.06)",
    },
  };

  const mainBg = dark
    ? "radial-gradient(ellipse at top right, rgba(63,81,181,0.08) 0%, transparent 50%), #0f1117"
    : "radial-gradient(ellipse at top right, rgba(63,81,181,0.06) 0%, transparent 50%), #f0f2f8";

  const typeChipStyle = (type) => ({
    fontSize: 10,
    height: 18,
    fontWeight: 700,
    bgcolor:
      type === "income"
        ? dark ? "rgba(29,158,117,0.2)" : "#E1F5EE"
        : type === "expense"
        ? dark ? "rgba(226,75,74,0.2)" : "#FCEBEB"
        : dark ? "rgba(186,117,23,0.2)" : "#FAEEDA",
    color:
      type === "income" ? "#1D9E75" : type === "expense" ? "#E24B4A" : "#BA7517",
  });

  return (
    <Box sx={{ minHeight: "100vh", background: mainBg, p: { xs: 2, sm: 3 } }}>

      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={4}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box sx={{
            width: 40, height: 40, borderRadius: "12px",
            background: "linear-gradient(135deg, #3f51b5 0%, #1a237e 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <AdminPanelSettingsIcon sx={{ color: "white", fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.8px", lineHeight: 1 }}>
              Admin Dashboard
            </Typography>
            <Typography sx={{ fontSize: 12, color: dark ? "rgba(255,255,255,0.4)" : "#999", fontWeight: 500 }}>
              Signed in as {user?.email}
            </Typography>
          </Box>
        </Box>
        <Button
          variant="outlined" size="small" startIcon={<LogoutIcon />}
          onClick={() => { logout(); navigate("/login"); }}
          sx={{
            borderRadius: 2, textTransform: "none",
            borderColor: dark ? "rgba(255,255,255,0.15)" : "#ddd",
            color: dark ? "rgba(255,255,255,0.5)" : "#888",
          }}
        >
          Sign out
        </Button>
      </Box>

      {/* Summary cards */}
      <Grid container spacing={2} mb={4}>
        {[
          { label: "Total Users", value: totalUsers, icon: <PeopleIcon />, color: "#3f51b5", bg: dark ? "rgba(63,81,181,0.15)" : "rgba(63,81,181,0.1)" },
          { label: "Total Income Logged", value: fmt(totalIncome), icon: <TrendingUpIcon />, color: "#1D9E75", bg: dark ? "rgba(29,158,117,0.15)" : "rgba(29,158,117,0.1)" },
          { label: "Total Debt Outstanding", value: fmt(totalDebt), icon: <AccountBalanceIcon />, color: "#BA7517", bg: dark ? "rgba(186,117,23,0.15)" : "rgba(186,117,23,0.1)" },
        ].map((m) => (
          <Grid item xs={12} sm={4} key={m.label}>
            <Card {...glassCard}>
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box sx={{
                  width: 44, height: 44, borderRadius: 2.5,
                  bgcolor: m.bg, display: "flex", alignItems: "center",
                  justifyContent: "center", color: m.color,
                }}>
                  {m.icon}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11, color: dark ? "rgba(255,255,255,0.4)" : "#999", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>
                    {m.label}
                  </Typography>
                  <Typography sx={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px", color: m.color }}>
                    {m.value}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Users list */}
      <Card {...glassCard}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography sx={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.5px" }}>
              All User Accounts ({totalUsers})
            </Typography>
            <Button
              size="small" startIcon={<RefreshIcon />}
              onClick={fetchAllUsers} disabled={loading}
              sx={{
                borderRadius: 2, textTransform: "none", fontSize: 12,
                borderColor: dark ? "rgba(255,255,255,0.15)" : "#ddd",
                color: dark ? "rgba(255,255,255,0.5)" : "#888",
              }}
              variant="outlined"
            >
              Refresh
            </Button>
          </Box>

          {loading && (
            <LinearProgress sx={{ borderRadius: 2, mb: 2, bgcolor: dark ? "rgba(255,255,255,0.06)" : "#f0f0f0" }} />
          )}

          {!loading && users.length === 0 && (
            <Box sx={{
              py: 4, textAlign: "center",
              border: `1px dashed ${dark ? "rgba(255,255,255,0.1)" : "#e0e0e0"}`,
              borderRadius: 2,
            }}>
              <Typography sx={{ color: dark ? "rgba(255,255,255,0.3)" : "#bbb", fontSize: 14 }}>
                No users found in the database.
              </Typography>
              <Typography sx={{ color: dark ? "rgba(255,255,255,0.2)" : "#ccc", fontSize: 12, mt: 0.5 }}>
                Users appear here after they log in to FinTrack.
              </Typography>
            </Box>
          )}

          {users.map((u, i) => (
            <Box key={u.uid}>
              {i > 0 && <Divider sx={{ opacity: 0.08, my: 1 }} />}

              {/* User row */}
              <Box display="flex" alignItems="center" gap={2} py={1.5}>
                <Avatar sx={{
                  width: 40, height: 40, bgcolor: "#3f51b5",
                  fontSize: 15, fontWeight: 700, flexShrink: 0,
                }}>
                  {(u.displayName || u.email || u.uid)?.[0]?.toUpperCase() || "U"}
                </Avatar>

                <Box flex={1} minWidth={0}>
                  <Typography sx={{ fontSize: 14, fontWeight: 700 }} noWrap>
                    {u.displayName || u.email || "Unknown User"}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: dark ? "rgba(255,255,255,0.35)" : "#aaa" }} noWrap>
                    UID: {u.uid.slice(0, 20)}... · {u.transactions.length} transactions · {u.debts.length} debts
                  </Typography>
                </Box>

                {/* Stats chips — hidden on mobile */}
                <Box sx={{ display: { xs: "none", md: "flex" }, gap: 1, alignItems: "center" }}>
                  <Chip
                    label={`Income: ${fmt(u.income)}`} size="small"
                    sx={{ bgcolor: dark ? "rgba(29,158,117,0.15)" : "#E1F5EE", color: "#1D9E75", fontWeight: 700, fontSize: 11 }}
                  />
                  <Chip
                    label={`Expense: ${fmt(u.expense)}`} size="small"
                    sx={{ bgcolor: dark ? "rgba(226,75,74,0.15)" : "#FCEBEB", color: "#E24B4A", fontWeight: 700, fontSize: 11 }}
                  />
                  <Chip
                    label={`Debt: ${fmt(u.totalDebt)}`} size="small"
                    sx={{ bgcolor: dark ? "rgba(186,117,23,0.15)" : "#FAEEDA", color: "#BA7517", fontWeight: 700, fontSize: 11 }}
                  />
                </Box>

                <Tooltip title={expanded === u.uid ? "Collapse" : "View transactions"}>
                  <IconButton
                    size="small"
                    onClick={() => setExpanded(expanded === u.uid ? null : u.uid)}
                  >
                    {expanded === u.uid ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Tooltip>

                <Tooltip title="Delete all user data">
                  <IconButton size="small" onClick={() => handleDeleteUserData(u.uid)}>
                    <DeleteIcon fontSize="small" color="error" />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Mobile stats */}
              <Box sx={{ display: { xs: "flex", md: "none" }, gap: 1, pb: 1, flexWrap: "wrap" }}>
                <Chip label={`Income: ${fmt(u.income)}`} size="small" sx={{ bgcolor: dark ? "rgba(29,158,117,0.15)" : "#E1F5EE", color: "#1D9E75", fontWeight: 700, fontSize: 11 }} />
                <Chip label={`Expense: ${fmt(u.expense)}`} size="small" sx={{ bgcolor: dark ? "rgba(226,75,74,0.15)" : "#FCEBEB", color: "#E24B4A", fontWeight: 700, fontSize: 11 }} />
                <Chip label={`Debt: ${fmt(u.totalDebt)}`} size="small" sx={{ bgcolor: dark ? "rgba(186,117,23,0.15)" : "#FAEEDA", color: "#BA7517", fontWeight: 700, fontSize: 11 }} />
              </Box>

              {/* Expanded transactions */}
              <Collapse in={expanded === u.uid}>
                <Box sx={{
                  mt: 1, mb: 1, p: 2, borderRadius: 2,
                  background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                  border: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`,
                }}>
                  <Typography sx={{
                    fontSize: 12, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: 0.5, color: dark ? "rgba(255,255,255,0.4)" : "#aaa", mb: 1.5,
                  }}>
                    Transactions ({u.transactions.length})
                  </Typography>

                  {u.transactions.length === 0 ? (
                    <Typography sx={{ fontSize: 13, color: dark ? "rgba(255,255,255,0.3)" : "#ccc" }}>
                      No transactions yet.
                    </Typography>
                  ) : (
                    <>
                      <TableContainer sx={{ overflowX: "auto" }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              {["Date", "Type", "Category", "Amount", "Note"].map((h) => (
                                <TableCell key={h} sx={{
                                  fontSize: 11, fontWeight: 700,
                                  color: dark ? "rgba(255,255,255,0.4)" : "#aaa",
                                  borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "#f0f0f0"}`,
                                  whiteSpace: "nowrap",
                                }}>
                                  {h}
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {u.transactions.slice(0, 15).map((t) => (
                              <TableRow key={t.id} sx={{ "&:hover": { bgcolor: dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)" } }}>
                                <TableCell sx={{ fontSize: 12, borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.04)" : "#f5f5f5"}`, whiteSpace: "nowrap" }}>
                                  {t.date}
                                </TableCell>
                                <TableCell sx={{ borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.04)" : "#f5f5f5"}` }}>
                                  <Chip label={t.type} size="small" sx={typeChipStyle(t.type)} />
                                </TableCell>
                                <TableCell sx={{ fontSize: 12, borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.04)" : "#f5f5f5"}` }}>
                                  {t.category}
                                </TableCell>
                                <TableCell sx={{
                                  fontSize: 12, fontWeight: 700,
                                  borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.04)" : "#f5f5f5"}`,
                                  color: t.type === "income" ? "#1D9E75" : "#E24B4A",
                                  whiteSpace: "nowrap",
                                }}>
                                  {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                                </TableCell>
                                <TableCell sx={{
                                  fontSize: 12,
                                  color: dark ? "rgba(255,255,255,0.35)" : "#aaa",
                                  borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.04)" : "#f5f5f5"}`,
                                }}>
                                  {t.note || "—"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      {u.transactions.length > 15 && (
                        <Typography sx={{ fontSize: 11, color: dark ? "rgba(255,255,255,0.3)" : "#bbb", mt: 1 }}>
                          Showing 15 of {u.transactions.length} transactions
                        </Typography>
                      )}
                    </>
                  )}
                </Box>
              </Collapse>
            </Box>
          ))}
        </CardContent>
      </Card>
    </Box>
  );
}