import { useState, useEffect } from "react";
import { db }           from "../firebase/config";
import { collection, onSnapshot, addDoc, deleteDoc, doc, Timestamp } from "firebase/firestore";
import { useAuth }      from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import { usePersona }   from "../context/PersonaContext";
import { COLORS, glassStyle } from "../brand/theme";
import { calculateTax, calcTDSStatus, INDIAN_FESTIVALS, amortiseAnnualExpense } from "../utils/taxEngine";
import {
  Box, Typography, Grid, TextField, Button, ToggleButton,
  ToggleButtonGroup, Divider, LinearProgress, Chip,
  MenuItem, IconButton, Accordion, AccordionSummary,
  AccordionDetails, InputAdornment, Table, TableBody,
  TableCell, TableHead, TableRow,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteIcon     from "@mui/icons-material/Delete";
import AddIcon        from "@mui/icons-material/Add";

const FY_OPTIONS = [
  { label: "FY 2024-25", value: "2024-25" },
  { label: "FY 2025-26", value: "2025-26" },
];

export default function TaxEngine() {
  const { user }     = useAuth();
  const { resolved } = useThemeMode();
  const { persona }  = usePersona();
  const dark         = resolved === "dark";

  // Tax inputs
  const [annualIncome, setAnnualIncome] = useState(
    persona?.primaryIncome ? String(persona.primaryIncome * 12) : ""
  );
  const [regime, setRegime]       = useState("new");
  const [fy, setFy]               = useState("2024-25");
  const [deductions, setDeductions] = useState({
    section80C: "", section80D: "", hra: "",
    nps: "", homeLoanInt: "", otherDeductions: "",
  });

  // TDS
  const [tdsEntries, setTdsEntries] = useState([]);
  const [newTds, setNewTds]         = useState({ employer: "", amount: "", month: "" });

  // Annual/Festival expenses
  const [annualExpenses, setAnnualExpenses] = useState([]);
  const [newAnnual, setNewAnnual]           = useState({
    name: "", amount: "", category: "Festival", month: "10",
  });

  useEffect(() => {
    if (!user) return;
    const u1 = onSnapshot(
      collection(db, "users", user.uid, "tdsEntries"),
      s => setTdsEntries(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const u2 = onSnapshot(
      collection(db, "users", user.uid, "annualExpenses"),
      s => setAnnualExpenses(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => { u1(); u2(); };
  }, [user]);

  const income     = Number(annualIncome) || 0;
  const deductNums = Object.fromEntries(
    Object.entries(deductions).map(([k, v]) => [k, Number(v) || 0])
  );
  const taxResult  = income > 0
    ? calculateTax(income, regime, deductNums)
    : null;

  const totalTdsDeducted = tdsEntries.reduce(
    (s, t) => s + Number(t.amount || 0), 0
  );
  const tdsStatus = taxResult
    ? calcTDSStatus(totalTdsDeducted, taxResult.totalTax)
    : null;

  const fmt     = n => "₹" + Number(Math.abs(n || 0)).toLocaleString("en-IN");
  const fmtLakh = n => {
    const abs = Math.abs(n || 0);
    if (abs >= 100000) return `₹${(abs / 100000).toFixed(2)}L`;
    return fmt(abs);
  };

  const glass = (extra = {}) => ({
    ...glassStyle(dark), borderRadius: 3, p: 2.5, ...extra,
  });

  const addTds = async () => {
    if (!newTds.employer || !newTds.amount) return;
    await addDoc(collection(db, "users", user.uid, "tdsEntries"), {
      ...newTds, amount: Number(newTds.amount),
      createdAt: Timestamp.now(),
    });
    setNewTds({ employer: "", amount: "", month: "" });
  };

  const deleteTds = async (id) =>
    deleteDoc(doc(db, "users", user.uid, "tdsEntries", id));

  const addAnnual = async () => {
    if (!newAnnual.name || !newAnnual.amount) return;
    await addDoc(collection(db, "users", user.uid, "annualExpenses"), {
      ...newAnnual, amount: Number(newAnnual.amount),
      createdAt: Timestamp.now(),
    });
    setNewAnnual({ name: "", amount: "", category: "Festival", month: "10" });
  };

  const deleteAnnual = async (id) =>
    deleteDoc(doc(db, "users", user.uid, "annualExpenses", id));

  const now = new Date();
  const monthsLeft = 12 - now.getMonth();

  return (
    <Box>
      <Typography sx={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: { xs: 28, sm: 38 }, fontWeight: 900,
        letterSpacing: "-1px", mb: 0.5,
      }}>
        India Tax Engine
      </Typography>
      <Typography sx={{ color: "text.secondary", mb: 3 }}>
        Calculate your tax liability, track TDS, and plan for festivals
      </Typography>

      <Grid container spacing={2}>

        {/* ── Tax Calculator ── */}
        <Grid item xs={12} md={7}>
          <Box sx={glass()}>
            {/* FY + Regime */}
            <Box display="flex" gap={2} flexWrap="wrap" mb={2.5}>
              <TextField
                select label="Financial Year"
                value={fy} onChange={e => setFy(e.target.value)}
                sx={{ minWidth: 150 }}
              >
                {FY_OPTIONS.map(f => (
                  <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                ))}
              </TextField>

              <ToggleButtonGroup
                value={regime} exclusive
                onChange={(_, v) => v && setRegime(v)}
                size="small"
              >
                <ToggleButton value="new" sx={{
                  textTransform: "none", fontWeight: 600, px: 2,
                  "&.Mui-selected": {
                    bgcolor: dark
                      ? "rgba(232,120,10,0.15)" : COLORS.saffronLight,
                    color: COLORS.saffron,
                    borderColor: COLORS.saffron + "44",
                  },
                }}>
                  New Regime
                </ToggleButton>
                <ToggleButton value="old" sx={{
                  textTransform: "none", fontWeight: 600, px: 2,
                  "&.Mui-selected": {
                    bgcolor: dark
                      ? "rgba(232,120,10,0.15)" : COLORS.saffronLight,
                    color: COLORS.saffron,
                    borderColor: COLORS.saffron + "44",
                  },
                }}>
                  Old Regime
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <TextField
              label="Annual Income (₹)"
              type="number" fullWidth
              value={annualIncome}
              onChange={e => setAnnualIncome(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">₹</InputAdornment>
                ),
              }}
              helperText={
                persona?.primaryIncome
                  ? `Based on your profile: ${fmt(persona.primaryIncome * 12)}/year`
                  : "Enter your total annual income"
              }
              sx={{ mb: 2 }}
            />

            {/* Old regime deductions */}
            {regime === "old" && (
              <Box>
                <Typography sx={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 10, letterSpacing: 2,
                  textTransform: "uppercase",
                  color: "text.secondary", mb: 1.5,
                }}>
                  Deductions
                </Typography>
                <Grid container spacing={1.5}>
                  {[
                    { key: "section80C",       label: "80C (PF/PPF/ELSS)",  max: "₹1.5L cap" },
                    { key: "section80D",       label: "80D (Health Ins.)",  max: "₹25K cap"  },
                    { key: "hra",              label: "HRA Exemption",       max: ""          },
                    { key: "nps",              label: "NPS (80CCD1B)",       max: "₹50K cap"  },
                    { key: "homeLoanInt",      label: "Home Loan Interest",  max: "₹2L cap"   },
                    { key: "otherDeductions",  label: "Other Deductions",    max: ""          },
                  ].map(d => (
                    <Grid item xs={12} sm={6} key={d.key}>
                      <TextField
                        label={d.label}
                        type="number" fullWidth
                        value={deductions[d.key]}
                        onChange={e => setDeductions(prev => ({
                          ...prev, [d.key]: e.target.value,
                        }))}
                        helperText={d.max}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">₹</InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* NPS for new regime */}
            {regime === "new" && (
              <TextField
                label="NPS Contribution (80CCD1B)"
                type="number" fullWidth
                value={deductions.nps}
                onChange={e => setDeductions(prev => ({
                  ...prev, nps: e.target.value,
                }))}
                helperText="Up to ₹50,000 deductible under new regime"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">₹</InputAdornment>
                  ),
                }}
              />
            )}
          </Box>
        </Grid>

        {/* ── Tax Result ── */}
        <Grid item xs={12} md={5}>
          {taxResult ? (
            <Box sx={glass()}>
              <Typography sx={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10, letterSpacing: 3,
                textTransform: "uppercase",
                color: COLORS.saffron, mb: 2,
              }}>
                {fy} · {regime === "new" ? "New" : "Old"} Regime
              </Typography>

              {/* Big number */}
              <Box sx={{
                p: 2, borderRadius: 2, mb: 2,
                background: dark
                  ? "rgba(232,120,10,0.08)" : COLORS.saffronLight,
                border: `1px solid ${COLORS.saffron}33`,
              }}>
                <Typography sx={{
                  fontSize: 11, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: 1,
                  color: COLORS.saffron, mb: 0.3,
                }}>
                  Total tax payable
                </Typography>
                <Typography sx={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 40, fontWeight: 900,
                  letterSpacing: "-2px", color: COLORS.saffron,
                  lineHeight: 1,
                }}>
                  {fmtLakh(taxResult.totalTax)}
                </Typography>
                <Typography sx={{
                  fontSize: 12, color: "text.secondary", mt: 0.5,
                }}>
                  Set aside{" "}
                  <Box component="span" sx={{
                    fontWeight: 700, color: COLORS.saffron,
                  }}>
                    {fmt(taxResult.monthlyReserve)}/month
                  </Box>
                </Typography>
              </Box>

              {/* Breakdown */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.8 }}>
                {[
                  { label: "Annual Income",       val: fmtLakh(taxResult.annualIncome)  },
                  { label: "Standard Deduction",  val: `- ${fmt(taxResult.stdDeduction)}` },
                  { label: "Taxable Income",       val: fmtLakh(taxResult.taxableIncome) },
                  { label: "Base Tax",             val: fmt(taxResult.baseTax)           },
                  taxResult.surcharge > 0 && { label: "Surcharge", val: fmt(taxResult.surcharge) },
                  { label: "Cess (4%)",            val: fmt(taxResult.cess)              },
                  { label: "Effective Rate",       val: taxResult.effectiveRate + "%"    },
                ].filter(Boolean).map(r => (
                  <Box
                    key={r.label}
                    display="flex"
                    justifyContent="space-between"
                    sx={{
                      py: 0.5,
                      borderBottom: `1px solid ${dark
                        ? "rgba(247,243,237,0.04)" : COLORS.rule}`,
                    }}
                  >
                    <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                      {r.label}
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                      {r.val}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          ) : (
            <Box sx={{
              ...glass(),
              display: "flex", alignItems: "center",
              justifyContent: "center", minHeight: 200,
            }}>
              <Typography sx={{
                color: "text.secondary", fontSize: 13, textAlign: "center",
              }}>
                Enter your annual income to calculate tax
              </Typography>
            </Box>
          )}
        </Grid>

        {/* ── TDS Tracker ── */}
        <Grid item xs={12} md={6}>
          <Box sx={glass()}>
            <Typography sx={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10, letterSpacing: 3,
              textTransform: "uppercase",
              color: COLORS.saffron, mb: 2,
            }}>
              TDS Tracker
            </Typography>

            {/* TDS status */}
            {tdsStatus && (
              <Box sx={{
                p: 1.5, borderRadius: 2, mb: 2,
                background: tdsStatus.status === "refund"
                  ? dark ? "rgba(26,102,68,0.12)" : COLORS.greenLight
                  : dark ? "rgba(184,58,30,0.12)" : "#FDECEA",
                border: `1px solid ${tdsStatus.status === "refund"
                  ? COLORS.green + "44" : COLORS.rust + "44"}`,
              }}>
                <Typography sx={{
                  fontSize: 13, fontWeight: 700,
                  color: tdsStatus.status === "refund"
                    ? COLORS.green : COLORS.rust,
                }}>
                  {tdsStatus.status === "refund"
                    ? `🎉 Estimated Refund: ${fmt(tdsStatus.amount)}`
                    : `⚠️ Tax Payable: ${fmt(tdsStatus.amount)}`}
                </Typography>
                <Typography sx={{
                  fontSize: 11, color: "text.secondary", mt: 0.3,
                }}>
                  TDS deducted {fmt(totalTdsDeducted)} vs
                  estimated tax {taxResult ? fmt(taxResult.totalTax) : "—"}
                </Typography>
              </Box>
            )}

            {/* Add TDS entry */}
            <Box display="flex" gap={1.5} flexWrap="wrap" mb={2}>
              <TextField
                label="Employer / Source"
                value={newTds.employer}
                onChange={e => setNewTds(p => ({
                  ...p, employer: e.target.value,
                }))}
                sx={{ flex: 1, minWidth: 120 }}
              />
              <TextField
                label="TDS Amount (₹)" type="number"
                value={newTds.amount}
                onChange={e => setNewTds(p => ({
                  ...p, amount: e.target.value,
                }))}
                sx={{ width: 140 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">₹</InputAdornment>
                  ),
                }}
              />
              <Button
                variant="outlined" startIcon={<AddIcon />}
                onClick={addTds}
                sx={{
                  borderColor: COLORS.saffron,
                  color: COLORS.saffron,
                  "&:hover": { bgcolor: COLORS.saffronLight },
                }}
              >
                Add
              </Button>
            </Box>

            {tdsEntries.length === 0 ? (
              <Typography sx={{
                fontSize: 13, color: "text.secondary",
              }}>
                No TDS entries yet. Add TDS deducted by your employer.
              </Typography>
            ) : (
              <Box>
                {tdsEntries.map((t, i) => (
                  <Box key={t.id}>
                    {i > 0 && <Divider sx={{ opacity: 0.5 }} />}
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
                          {t.employer}
                        </Typography>
                        {t.month && (
                          <Typography sx={{
                            fontSize: 11, color: "text.secondary",
                          }}>
                            {t.month}
                          </Typography>
                        )}
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography sx={{
                          fontSize: 14, fontWeight: 700,
                          color: COLORS.green,
                        }}>
                          {fmt(t.amount)}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => deleteTds(t.id)}
                        >
                          <DeleteIcon
                            sx={{ fontSize: 14, color: COLORS.rust }}
                          />
                        </IconButton>
                      </Box>
                    </Box>
                  </Box>
                ))}
                <Divider sx={{ opacity: 0.5 }} />
                <Box
                  display="flex"
                  justifyContent="space-between"
                  pt={1}
                >
                  <Typography sx={{
                    fontSize: 13, fontWeight: 700,
                  }}>
                    Total TDS deducted
                  </Typography>
                  <Typography sx={{
                    fontSize: 14, fontWeight: 800,
                    color: COLORS.green,
                  }}>
                    {fmt(totalTdsDeducted)}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        </Grid>

        {/* ── Festival & Annual Expenses ── */}
        <Grid item xs={12} md={6}>
          <Box sx={glass()}>
            <Typography sx={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10, letterSpacing: 3,
              textTransform: "uppercase",
              color: COLORS.saffron, mb: 2,
            }}>
              Festival & Annual Expenses
            </Typography>

            <Typography sx={{
              fontSize: 13, color: "text.secondary", mb: 2,
            }}>
              Add large annual or festival expenses to spread the cost
              across months — so they don't wreck your budget.
            </Typography>

            {/* Quick festival chips */}
            <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
              {INDIAN_FESTIVALS.slice(0, 5).map(f => (
                <Chip
                  key={f.name}
                  label={f.name}
                  size="small"
                  onClick={() => setNewAnnual(p => ({
                    ...p,
                    name: f.name,
                    month: String(f.month),
                  }))}
                  sx={{
                    cursor: "pointer",
                    bgcolor: dark
                      ? "rgba(232,120,10,0.1)" : COLORS.saffronLight,
                    color: COLORS.saffron,
                    border: `1px solid ${COLORS.saffron}33`,
                    fontWeight: 600, fontSize: 11,
                    "&:hover": { bgcolor: COLORS.saffronLight },
                  }}
                />
              ))}
            </Box>

            {/* Add form */}
            <Box
              display="flex"
              flexDirection="column"
              gap={1.5} mb={2}
            >
              <Box display="flex" gap={1.5} flexWrap="wrap">
                <TextField
                  label="Name (e.g. Diwali)"
                  value={newAnnual.name}
                  onChange={e => setNewAnnual(p => ({
                    ...p, name: e.target.value,
                  }))}
                  sx={{ flex: 1, minWidth: 120 }}
                />
                <TextField
                  label="Total Amount (₹)"
                  type="number"
                  value={newAnnual.amount}
                  onChange={e => setNewAnnual(p => ({
                    ...p, amount: e.target.value,
                  }))}
                  sx={{ width: 140 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">₹</InputAdornment>
                    ),
                  }}
                />
              </Box>
              <Box display="flex" gap={1.5} flexWrap="wrap">
                <TextField
                  select label="Category"
                  value={newAnnual.category}
                  onChange={e => setNewAnnual(p => ({
                    ...p, category: e.target.value,
                  }))}
                  sx={{ minWidth: 130 }}
                >
                  {["Festival","Annual","Insurance","Subscription","Other"].map(c => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  select label="Month of expense"
                  value={newAnnual.month}
                  onChange={e => setNewAnnual(p => ({
                    ...p, month: e.target.value,
                  }))}
                  sx={{ minWidth: 140 }}
                >
                  {[
                    "1","2","3","4","5","6",
                    "7","8","9","10","11","12",
                  ].map(m => (
                    <MenuItem key={m} value={m}>
                      {new Date(2024, Number(m) - 1, 1)
                        .toLocaleString("en-IN", { month: "long" })}
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={addAnnual}
                  sx={{
                    borderColor: COLORS.saffron,
                    color: COLORS.saffron,
                  }}
                >
                  Add
                </Button>
              </Box>
            </Box>

            {/* Annual expenses list */}
            {annualExpenses.length === 0 ? (
              <Typography sx={{
                fontSize: 13, color: "text.secondary",
              }}>
                No annual expenses yet.
              </Typography>
            ) : (
              <Box>
                {annualExpenses.map((exp, i) => {
                  const amort = amortiseAnnualExpense(
                    exp.amount, monthsLeft
                  );
                  return (
                    <Box key={exp.id}>
                      {i > 0 && <Divider sx={{ opacity: 0.5 }} />}
                      <Box py={1.2}>
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="flex-start"
                        >
                          <Box>
                            <Typography sx={{
                              fontSize: 13, fontWeight: 700,
                            }}>
                              {exp.name}
                            </Typography>
                            <Typography sx={{
                              fontSize: 11, color: "text.secondary",
                            }}>
                              {exp.category} · Month {exp.month}
                            </Typography>
                          </Box>
                          <Box
                            display="flex"
                            alignItems="center"
                            gap={1}
                          >
                            <Box textAlign="right">
                              <Typography sx={{
                                fontSize: 14, fontWeight: 800,
                                color: COLORS.rust,
                              }}>
                                {fmt(exp.amount)}
                              </Typography>
                              <Typography sx={{
                                fontSize: 11,
                                color: COLORS.saffron,
                                fontWeight: 600,
                              }}>
                                {fmt(amort.monthly)}/mo to save
                              </Typography>
                            </Box>
                            <IconButton
                              size="small"
                              onClick={() => deleteAnnual(exp.id)}
                            >
                              <DeleteIcon sx={{
                                fontSize: 14, color: COLORS.rust,
                              }} />
                            </IconButton>
                          </Box>
                        </Box>
                        <Box
                          sx={{
                            mt: 1, p: 1, borderRadius: 1.5,
                            background: dark
                              ? "rgba(232,120,10,0.06)"
                              : COLORS.saffronLight,
                            fontSize: 11,
                            color: "text.secondary",
                          }}
                        >
                          Spread over {amort.months} months →{" "}
                          <Box component="span" sx={{
                            fontWeight: 700,
                            color: COLORS.saffron,
                          }}>
                            {fmt(amort.monthly)}/month
                          </Box>
                          {" "}· {fmt(amort.perDay)}/day
                        </Box>
                      </Box>
                    </Box>
                  );
                })}

                {/* Total monthly reserve */}
                <Divider sx={{ mt: 1, opacity: 0.5 }} />
                <Box
                  display="flex"
                  justifyContent="space-between"
                  pt={1.5}
                >
                  <Box>
                    <Typography sx={{
                      fontSize: 13, fontWeight: 700,
                    }}>
                      Total monthly reserve needed
                    </Typography>
                    <Typography sx={{
                      fontSize: 11, color: "text.secondary",
                    }}>
                      To cover all annual expenses
                    </Typography>
                  </Box>
                  <Typography sx={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 22, fontWeight: 800,
                    color: COLORS.saffron,
                  }}>
                    {fmt(annualExpenses.reduce((s, exp) => {
                      const a = amortiseAnnualExpense(
                        exp.amount, monthsLeft
                      );
                      return s + a.monthly;
                    }, 0))}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        </Grid>

        {/* ── Tax Slab Breakdown ── */}
        {taxResult && taxResult.slabs.length > 0 && (
          <Grid item xs={12}>
            <Box sx={glass()}>
              <Typography sx={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10, letterSpacing: 3,
                textTransform: "uppercase",
                color: COLORS.saffron, mb: 2,
              }}>
                Slab Breakdown
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {["Income Slab","Rate","Tax on Slab"].map(h => (
                      <TableCell key={h} sx={{
                        fontSize: 11, fontWeight: 700,
                        fontFamily: "'DM Mono', monospace",
                        letterSpacing: 0.5,
                        color: "text.secondary",
                        borderBottom: `1px solid ${dark
                          ? "rgba(247,243,237,0.08)" : COLORS.rule}`,
                      }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {taxResult.slabs.map((slab, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{
                        fontSize: 13,
                        borderBottom: `1px solid ${dark
                          ? "rgba(247,243,237,0.04)" : "#f5f5f5"}`,
                      }}>
                        {fmt(slab.min)} –{" "}
                        {slab.max === Infinity
                          ? "Above" : fmt(slab.max)}
                      </TableCell>
                      <TableCell sx={{
                        fontSize: 13, fontWeight: 700,
                        color: COLORS.saffron,
                        borderBottom: `1px solid ${dark
                          ? "rgba(247,243,237,0.04)" : "#f5f5f5"}`,
                      }}>
                        {(slab.rate * 100).toFixed(0)}%
                      </TableCell>
                      <TableCell sx={{
                        fontSize: 13, fontWeight: 700,
                        borderBottom: `1px solid ${dark
                          ? "rgba(247,243,237,0.04)" : "#f5f5f5"}`,
                      }}>
                        {fmt(slab.taxOnSlab)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Grid>
        )}

      </Grid>
    </Box>
  );
}