import { useEffect, useState } from "react";
import { db }           from "../firebase/config";
import { collection, onSnapshot, addDoc, deleteDoc, doc, Timestamp } from "firebase/firestore";
import { useAuth }      from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import { COLORS, glassStyle } from "../brand/theme";
import {
  Box, Typography, Grid, TextField, Button,
  IconButton, Divider, LinearProgress,
  MenuItem, Chip, InputAdornment,
} from "@mui/material";
import AddIcon    from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import TrendingUpIcon   from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";

const ASSET_CATEGORIES = [
  "Bank Account", "Fixed Deposit", "Mutual Funds",
  "Stocks / Equity", "PPF / NPS", "Gold / Jewellery",
  "Real Estate", "Crypto", "Other Assets",
];

const LIABILITY_CATEGORIES = [
  "Home Loan", "Car Loan", "Personal Loan",
  "Credit Card", "Education Loan", "Other Debt",
];

export default function NetWorth() {
  const { user }     = useAuth();
  const { resolved } = useThemeMode();
  const dark         = resolved === "dark";

  const [assets,      setAssets]      = useState([]);
  const [liabilities, setLiabilities] = useState([]);
  const [newAsset,    setNewAsset]     = useState({
    name: "", amount: "", category: "Bank Account",
  });
  const [newLiability, setNewLiability] = useState({
    name: "", amount: "", category: "Personal Loan",
  });

  useEffect(() => {
    if (!user) return;
    const u1 = onSnapshot(
      collection(db, "users", user.uid, "assets"),
      s => setAssets(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const u2 = onSnapshot(
      collection(db, "users", user.uid, "liabilities"),
      s => setLiabilities(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => { u1(); u2(); };
  }, [user]);

  const totalAssets      = assets.reduce(
    (s, a) => s + Number(a.amount || 0), 0
  );
  const totalLiabilities = liabilities.reduce(
    (s, l) => s + Number(l.amount || 0), 0
  );
  const netWorth         = totalAssets - totalLiabilities;
  const debtRatio        = totalAssets > 0
    ? Math.round((totalLiabilities / totalAssets) * 100) : 0;

  const fmt = n => "₹" + Number(Math.abs(n || 0)).toLocaleString("en-IN");
  const fmtLakh = n => {
    const abs = Math.abs(n || 0);
    if (abs >= 10000000) return `₹${(abs / 10000000).toFixed(2)}Cr`;
    if (abs >= 100000)   return `₹${(abs / 100000).toFixed(2)}L`;
    return fmt(abs);
  };

  const addAsset = async () => {
    if (!newAsset.name || !newAsset.amount) return;
    await addDoc(collection(db, "users", user.uid, "assets"), {
      ...newAsset,
      amount: Number(newAsset.amount),
      createdAt: Timestamp.now(),
    });
    setNewAsset({ name: "", amount: "", category: "Bank Account" });
  };

  const addLiability = async () => {
    if (!newLiability.name || !newLiability.amount) return;
    await addDoc(collection(db, "users", user.uid, "liabilities"), {
      ...newLiability,
      amount: Number(newLiability.amount),
      createdAt: Timestamp.now(),
    });
    setNewLiability({ name: "", amount: "", category: "Personal Loan" });
  };

  const deleteItem = async (collection_name, id) =>
    deleteDoc(doc(db, "users", user.uid, collection_name, id));

  const glass = (extra = {}) => ({
    ...glassStyle(dark), borderRadius: 3, p: 2.5, ...extra,
  });

  // Group assets by category
  const assetsByCategory = {};
  assets.forEach(a => {
    if (!assetsByCategory[a.category])
      assetsByCategory[a.category] = 0;
    assetsByCategory[a.category] += Number(a.amount || 0);
  });

  return (
    <Box>
      <Typography sx={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: { xs: 28, sm: 38 }, fontWeight: 900,
        letterSpacing: "-1px", mb: 0.5,
      }}>
        Net Worth
      </Typography>
      <Typography sx={{ color: "text.secondary", mb: 3 }}>
        Assets − Liabilities = Your true financial position
      </Typography>

      {/* ── Summary ── */}
      <Box sx={{
        ...glass({ mb: 2 }),
        border: `1px solid ${netWorth >= 0
          ? COLORS.green + "33"
          : COLORS.rust + "33"}`,
        background: dark
          ? netWorth >= 0
            ? "rgba(26,102,68,0.08)"
            : "rgba(184,58,30,0.08)"
          : netWorth >= 0
            ? COLORS.greenLight
            : "#FDECEA",
      }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4} textAlign={{ xs: "left", sm: "center" }}>
            <Typography sx={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10, letterSpacing: 3,
              textTransform: "uppercase",
              color: "text.secondary", mb: 0.5,
            }}>
              Net Worth
            </Typography>
            <Typography sx={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 40, fontWeight: 900,
              letterSpacing: "-2px", lineHeight: 1,
              color: netWorth >= 0 ? COLORS.green : COLORS.rust,
            }}>
              {netWorth < 0 ? "−" : ""}{fmtLakh(netWorth)}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={4} textAlign="center">
            <Typography sx={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10, letterSpacing: 2,
              textTransform: "uppercase",
              color: "text.secondary", mb: 0.5,
            }}>
              Total Assets
            </Typography>
            <Typography sx={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 24, fontWeight: 800,
              color: COLORS.green,
            }}>
              {fmtLakh(totalAssets)}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={4} textAlign="center">
            <Typography sx={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10, letterSpacing: 2,
              textTransform: "uppercase",
              color: "text.secondary", mb: 0.5,
            }}>
              Total Liabilities
            </Typography>
            <Typography sx={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 24, fontWeight: 800,
              color: COLORS.rust,
            }}>
              {fmtLakh(totalLiabilities)}
            </Typography>
          </Grid>
        </Grid>

        {/* Debt ratio bar */}
        {totalAssets > 0 && (
          <Box sx={{ mt: 2 }}>
            <Box
              display="flex"
              justifyContent="space-between"
              mb={0.5}
            >
              <Typography sx={{
                fontSize: 12, color: "text.secondary",
              }}>
                Debt-to-assets ratio
              </Typography>
              <Typography sx={{
                fontSize: 12, fontWeight: 700,
                color: debtRatio > 50
                  ? COLORS.rust : debtRatio > 30
                  ? COLORS.saffron : COLORS.green,
              }}>
                {debtRatio}%
              </Typography>
            </Box>
            <Box sx={{
              height: 6, borderRadius: 3,
              bgcolor: dark
                ? "rgba(247,243,237,0.06)"
                : COLORS.cream,
              overflow: "hidden",
            }}>
              <Box sx={{
                height: "100%",
                width: `${Math.min(debtRatio, 100)}%`,
                bgcolor: debtRatio > 50
                  ? COLORS.rust : debtRatio > 30
                  ? COLORS.saffron : COLORS.green,
                borderRadius: 3,
                transition: "width 0.5s ease",
              }} />
            </Box>
          </Box>
        )}
      </Box>

      <Grid container spacing={2}>

        {/* ── Assets ── */}
        <Grid item xs={12} md={6}>
          <Box sx={glass()}>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              mb={2}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <TrendingUpIcon sx={{
                  color: COLORS.green, fontSize: 20,
                }} />
                <Typography sx={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 10, letterSpacing: 3,
                  textTransform: "uppercase",
                  color: COLORS.green,
                }}>
                  Assets
                </Typography>
              </Box>
              <Typography sx={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 20, fontWeight: 800,
                color: COLORS.green,
              }}>
                {fmtLakh(totalAssets)}
              </Typography>
            </Box>

            {/* Add asset */}
            <Box
              display="flex"
              flexDirection="column"
              gap={1.5} mb={2}
            >
              <Box display="flex" gap={1.5} flexWrap="wrap">
                <TextField
                  label="Asset name"
                  value={newAsset.name}
                  onChange={e => setNewAsset(p => ({
                    ...p, name: e.target.value,
                  }))}
                  sx={{ flex: 1, minWidth: 120 }}
                />
                <TextField
                  label="Value (₹)" type="number"
                  value={newAsset.amount}
                  onChange={e => setNewAsset(p => ({
                    ...p, amount: e.target.value,
                  }))}
                  sx={{ width: 130 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">₹</InputAdornment>
                    ),
                  }}
                />
              </Box>
              <Box display="flex" gap={1.5}>
                <TextField
                  select label="Category"
                  value={newAsset.category}
                  onChange={e => setNewAsset(p => ({
                    ...p, category: e.target.value,
                  }))}
                  sx={{ flex: 1 }}
                >
                  {ASSET_CATEGORIES.map(c => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </TextField>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={addAsset}
                  sx={{
                    borderColor: COLORS.green,
                    color: COLORS.green,
                    "&:hover": {
                      bgcolor: COLORS.greenLight,
                    },
                  }}
                >
                  Add
                </Button>
              </Box>
            </Box>

            {assets.length === 0 ? (
              <Typography sx={{
                fontSize: 13, color: "text.secondary",
              }}>
                No assets added yet. Add your bank balance, FDs,
                investments, and property.
              </Typography>
            ) : (
              <Box>
                {assets.map((a, i) => (
                  <Box key={a.id}>
                    {i > 0 && <Divider sx={{ opacity: 0.4 }} />}
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      py={1}
                    >
                      <Box>
                        <Typography sx={{
                          fontSize: 13, fontWeight: 600,
                        }}>
                          {a.name}
                        </Typography>
                        <Typography sx={{
                          fontSize: 11, color: "text.secondary",
                        }}>
                          {a.category}
                        </Typography>
                      </Box>
                      <Box
                        display="flex"
                        alignItems="center"
                        gap={1}
                      >
                        <Typography sx={{
                          fontSize: 14, fontWeight: 800,
                          color: COLORS.green,
                        }}>
                          {fmt(a.amount)}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => deleteItem("assets", a.id)}
                        >
                          <DeleteIcon sx={{
                            fontSize: 14, color: COLORS.rust,
                          }} />
                        </IconButton>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Grid>

        {/* ── Liabilities ── */}
        <Grid item xs={12} md={6}>
          <Box sx={glass()}>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              mb={2}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <TrendingDownIcon sx={{
                  color: COLORS.rust, fontSize: 20,
                }} />
                <Typography sx={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 10, letterSpacing: 3,
                  textTransform: "uppercase",
                  color: COLORS.rust,
                }}>
                  Liabilities
                </Typography>
              </Box>
              <Typography sx={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 20, fontWeight: 800,
                color: COLORS.rust,
              }}>
                {fmtLakh(totalLiabilities)}
              </Typography>
            </Box>

            {/* Add liability */}
            <Box
              display="flex"
              flexDirection="column"
              gap={1.5} mb={2}
            >
              <Box display="flex" gap={1.5} flexWrap="wrap">
                <TextField
                  label="Liability name"
                  value={newLiability.name}
                  onChange={e => setNewLiability(p => ({
                    ...p, name: e.target.value,
                  }))}
                  sx={{ flex: 1, minWidth: 120 }}
                />
                <TextField
                  label="Amount (₹)" type="number"
                  value={newLiability.amount}
                  onChange={e => setNewLiability(p => ({
                    ...p, amount: e.target.value,
                  }))}
                  sx={{ width: 130 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">₹</InputAdornment>
                    ),
                  }}
                />
              </Box>
              <Box display="flex" gap={1.5}>
                <TextField
                  select label="Category"
                  value={newLiability.category}
                  onChange={e => setNewLiability(p => ({
                    ...p, category: e.target.value,
                  }))}
                  sx={{ flex: 1 }}
                >
                  {LIABILITY_CATEGORIES.map(c => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </TextField>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={addLiability}
                  sx={{
                    borderColor: COLORS.rust,
                    color: COLORS.rust,
                    "&:hover": { bgcolor: "#FDECEA" },
                  }}
                >
                  Add
                </Button>
              </Box>
            </Box>

            {liabilities.length === 0 ? (
              <Typography sx={{
                fontSize: 13, color: "text.secondary",
              }}>
                No liabilities added yet. Add loans, credit card
                balances, and other debts.
              </Typography>
            ) : (
              <Box>
                {liabilities.map((l, i) => (
                  <Box key={l.id}>
                    {i > 0 && <Divider sx={{ opacity: 0.4 }} />}
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      py={1}
                    >
                      <Box>
                        <Typography sx={{
                          fontSize: 13, fontWeight: 600,
                        }}>
                          {l.name}
                        </Typography>
                        <Typography sx={{
                          fontSize: 11, color: "text.secondary",
                        }}>
                          {l.category}
                        </Typography>
                      </Box>
                      <Box
                        display="flex"
                        alignItems="center"
                        gap={1}
                      >
                        <Typography sx={{
                          fontSize: 14, fontWeight: 800,
                          color: COLORS.rust,
                        }}>
                          {fmt(l.amount)}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => deleteItem("liabilities", l.id)}
                        >
                          <DeleteIcon sx={{
                            fontSize: 14, color: COLORS.rust,
                          }} />
                        </IconButton>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Grid>

      </Grid>
    </Box>
  );
}