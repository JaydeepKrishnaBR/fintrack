import { useState, useRef } from "react";
import { db } from "../firebase/config";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import { parseBankStatement } from "../utils/parseStatement";
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, LinearProgress, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Alert,
  IconButton, MenuItem, Select, Tooltip
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

const ALL_CATEGORIES = [
  "Salary","Freelance","Business","Investment","Gift",
  "Rent","Groceries","Transport","Dining","Utilities",
  "Shopping","Health","Education","Entertainment","ATM Withdrawal",
  "Transfer","Personal Loan","Other"
];

const TYPE_COLORS = {
  income: { color: "#1D9E75", bg: "rgba(29,158,117,0.12)" },
  expense: { color: "#E24B4A", bg: "rgba(226,75,74,0.12)" },
  debt:    { color: "#BA7517", bg: "rgba(186,117,23,0.12)" },
};

export default function StatementUploader() {
  const { user } = useAuth();
  const { resolved } = useThemeMode();
  const dark = resolved === "dark";
  const fileRef = useRef();

  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsed, setParsed] = useState([]);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".pdf")) { setError("Please upload a PDF bank statement."); return; }

    setError("");
    setParsing(true);
    setParsed([]);
    setDone(false);

    try {
      const txns = await parseBankStatement(file);
      if (txns.length === 0) {
        setError("No transactions found. Make sure this is a valid bank statement PDF.");
      } else {
        setParsed(txns.map((t, i) => ({ ...t, id: i, selected: true })));
      }
    } catch (err) {
      console.error(err);
      setError("Failed to parse the PDF. Try a different statement.");
    }
    setParsing(false);
  };

  const updateTxn = (id, field, value) => {
    setParsed(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const toggleSelect = (id) => {
    setParsed(prev => prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t));
  };

  const removeTxn = (id) => {
    setParsed(prev => prev.filter(t => t.id !== id));
  };

  const handleImport = async () => {
    const toImport = parsed.filter(t => t.selected);
    if (toImport.length === 0) { setError("Select at least one transaction to import."); return; }

    setImporting(true);
    setProgress(0);

    try {
      for (let i = 0; i < toImport.length; i++) {
        const t = toImport[i];
        await addDoc(collection(db, "users", user.uid, "transactions"), {
          type: t.type,
          amount: Number(t.amount),
          category: t.category,
          date: t.date,
          note: t.note || t.description,
          source: "bank_statement",
          createdAt: Timestamp.now(),
        });
        setProgress(Math.round(((i + 1) / toImport.length) * 100));
      }
      setDone(true);
    } catch (err) {
      setError("Import failed partway. Some transactions may have been saved.");
    }
    setImporting(false);
  };

  const handleClose = () => {
    setOpen(false);
    setParsed([]);
    setError("");
    setDone(false);
    setProgress(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  const selectedCount = parsed.filter(t => t.selected).length;
  const incomeCount = parsed.filter(t => t.selected && t.type === "income").length;
  const expenseCount = parsed.filter(t => t.selected && t.type === "expense").length;

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<UploadFileIcon />}
        onClick={() => setOpen(true)}
        sx={{
          borderRadius: 2.5,
          textTransform: "none",
          fontWeight: 600,
          fontSize: 14,
          borderColor: dark ? "rgba(29,158,117,0.4)" : "rgba(29,158,117,0.5)",
          color: "#1D9E75",
          "&:hover": {
            borderColor: "#1D9E75",
            bgcolor: dark ? "rgba(29,158,117,0.08)" : "rgba(29,158,117,0.05)",
          },
        }}
      >
        Upload Statement
      </Button>

      <Dialog open={open} onClose={!importing ? handleClose : undefined}
        maxWidth="lg" fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            backdropFilter: "blur(20px)",
            background: dark ? "rgba(20,25,38,0.97)" : "rgba(255,255,255,0.98)",
            border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
          }
        }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.5px" }}>
              Import Bank Statement
            </Typography>
            <Typography sx={{ fontSize: 12, color: dark ? "rgba(255,255,255,0.4)" : "#aaa", mt: 0.3 }}>
              Supports Kotak, HDFC, SBI, ICICI — PDF format
            </Typography>
          </Box>
          {!importing && (
            <IconButton onClick={handleClose} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>

          {/* Upload zone */}
          {!done && (
            <Box
              onClick={() => fileRef.current?.click()}
              sx={{
                border: `2px dashed ${dark ? "rgba(29,158,117,0.3)" : "rgba(29,158,117,0.35)"}`,
                borderRadius: 3, p: 3, textAlign: "center",
                cursor: "pointer", mb: 2,
                transition: "all 0.2s",
                "&:hover": {
                  borderColor: "#1D9E75",
                  bgcolor: dark ? "rgba(29,158,117,0.05)" : "rgba(29,158,117,0.03)",
                },
              }}
            >
              <UploadFileIcon sx={{ fontSize: 36, color: "#1D9E75", opacity: 0.7, mb: 1 }} />
              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                Click to upload your bank statement PDF
              </Typography>
              <Typography sx={{ fontSize: 12, color: dark ? "rgba(255,255,255,0.35)" : "#aaa", mt: 0.5 }}>
                Your data stays private — processed locally in your browser
              </Typography>
              <input ref={fileRef} type="file" accept=".pdf" hidden onChange={handleFile} />
            </Box>
          )}

          {parsing && (
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: 13, mb: 1, color: dark ? "rgba(255,255,255,0.6)" : "#666" }}>
                Reading your statement...
              </Typography>
              <LinearProgress sx={{ borderRadius: 2 }} />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          {done && (
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} icon={<CheckCircleIcon />}>
              <Typography sx={{ fontWeight: 700 }}>
                Successfully imported {selectedCount} transactions!
              </Typography>
              <Typography sx={{ fontSize: 12, mt: 0.3 }}>
                Go to Transactions or Home to see your updated data.
              </Typography>
            </Alert>
          )}

          {/* Summary chips */}
          {parsed.length > 0 && !done && (
            <Box display="flex" gap={1} flexWrap="wrap" mb={2} alignItems="center">
              <Typography sx={{ fontSize: 13, fontWeight: 700, mr: 0.5 }}>
                {parsed.length} transactions found
              </Typography>
              <Chip label={`${selectedCount} selected`} size="small" sx={{ fontWeight: 700, fontSize: 11 }} />
              <Chip label={`${incomeCount} income`} size="small" sx={{ bgcolor: "rgba(29,158,117,0.12)", color: "#1D9E75", fontWeight: 700, fontSize: 11 }} />
              <Chip label={`${expenseCount} expenses`} size="small" sx={{ bgcolor: "rgba(226,75,74,0.12)", color: "#E24B4A", fontWeight: 700, fontSize: 11 }} />
              <Button size="small" sx={{ ml: "auto", textTransform: "none", fontSize: 11 }}
                onClick={() => setParsed(p => p.map(t => ({ ...t, selected: true })))}>
                Select all
              </Button>
              <Button size="small" sx={{ textTransform: "none", fontSize: 11 }}
                onClick={() => setParsed(p => p.map(t => ({ ...t, selected: false })))}>
                Deselect all
              </Button>
            </Box>
          )}

          {/* Transactions table */}
          {parsed.length > 0 && !done && (
            <TableContainer sx={{
              maxHeight: 400,
              borderRadius: 2,
              border: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "#f0f0f0"}`,
            }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {["✓", "Date", "Description", "Type", "Category", "Amount", ""].map(h => (
                      <TableCell key={h} sx={{
                        fontSize: 11, fontWeight: 700,
                        bgcolor: dark ? "#1a1f2e" : "#fafafa",
                        color: dark ? "rgba(255,255,255,0.5)" : "#aaa",
                        borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "#eee"}`,
                        whiteSpace: "nowrap",
                        textTransform: "uppercase", letterSpacing: 0.5,
                      }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parsed.map((t) => (
                    <TableRow key={t.id} sx={{
                      opacity: t.selected ? 1 : 0.35,
                      "&:hover": { bgcolor: dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)" },
                    }}>
                      <TableCell sx={{ borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.04)" : "#f5f5f5"}` }}>
                        <input type="checkbox" checked={t.selected}
                          onChange={() => toggleSelect(t.id)}
                          style={{ cursor: "pointer", accentColor: "#1D9E75", width: 15, height: 15 }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, whiteSpace: "nowrap", borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.04)" : "#f5f5f5"}` }}>
                        {t.date}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, maxWidth: 220, borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.04)" : "#f5f5f5"}` }}>
                        <Tooltip title={t.note || t.description} arrow>
                          <Typography sx={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
                            {t.description}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.04)" : "#f5f5f5"}` }}>
                        <Select size="small" value={t.type}
                          onChange={e => updateTxn(t.id, "type", e.target.value)}
                          sx={{
                            fontSize: 11, fontWeight: 700, height: 26,
                            color: TYPE_COLORS[t.type]?.color,
                            ".MuiOutlinedInput-notchedOutline": { border: "none" },
                            bgcolor: TYPE_COLORS[t.type]?.bg,
                            borderRadius: 2,
                          }}>
                          <MenuItem value="income" sx={{ fontSize: 12 }}>income</MenuItem>
                          <MenuItem value="expense" sx={{ fontSize: 12 }}>expense</MenuItem>
                          <MenuItem value="debt" sx={{ fontSize: 12 }}>debt</MenuItem>
                        </Select>
                      </TableCell>
                      <TableCell sx={{ borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.04)" : "#f5f5f5"}` }}>
                        <Select size="small" value={t.category}
                          onChange={e => updateTxn(t.id, "category", e.target.value)}
                          sx={{
                            fontSize: 11, height: 26, minWidth: 120,
                            ".MuiOutlinedInput-notchedOutline": { borderColor: dark ? "rgba(255,255,255,0.08)" : "#eee" },
                          }}>
                          {ALL_CATEGORIES.map(c => (
                            <MenuItem key={c} value={c} sx={{ fontSize: 12 }}>{c}</MenuItem>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell sx={{
                        fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
                        color: TYPE_COLORS[t.type]?.color,
                        borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.04)" : "#f5f5f5"}`,
                      }}>
                        {t.type === "income" ? "+" : "-"}₹{Number(t.amount).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell sx={{ borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.04)" : "#f5f5f5"}` }}>
                        <IconButton size="small" onClick={() => removeTxn(t.id)}>
                          <DeleteIcon sx={{ fontSize: 14, color: "#E24B4A" }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Import progress */}
          {importing && (
            <Box sx={{ mt: 2 }}>
              <Box display="flex" justifyContent="space-between" mb={0.5}>
                <Typography sx={{ fontSize: 13 }}>Saving to Firebase...</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#1D9E75" }}>{progress}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={progress}
                sx={{ borderRadius: 2, "& .MuiLinearProgress-bar": { bgcolor: "#1D9E75" } }} />
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1 }}>
          {!done ? (
            <>
              <Button onClick={handleClose} disabled={importing}
                sx={{ textTransform: "none", borderRadius: 2, color: dark ? "rgba(255,255,255,0.5)" : "#888" }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleImport}
                disabled={importing || parsed.filter(t => t.selected).length === 0}
                sx={{
                  bgcolor: "#1D9E75", "&:hover": { bgcolor: "#0F6E56" },
                  borderRadius: 2.5, textTransform: "none", fontWeight: 700,
                  px: 3, boxShadow: "none",
                }}
              >
                {importing ? "Importing..." : `Import ${selectedCount} Transactions`}
              </Button>
            </>
          ) : (
            <Button variant="contained" onClick={handleClose}
              sx={{
                bgcolor: "#1D9E75", "&:hover": { bgcolor: "#0F6E56" },
                borderRadius: 2.5, textTransform: "none", fontWeight: 700, px: 3, boxShadow: "none",
              }}>
              Done
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}