import { useEffect, useState } from "react";
import { db } from "../firebase/config";
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import {
  Box, Card, Typography, List, ListItem, ListItemText,
  ListItemAvatar, Avatar, IconButton, Chip, TextField,
  MenuItem, Select, FormControl, InputLabel, Divider,
  Button, Pagination
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import FilterBar from "../components/FilterBar";
import { useFilterSort } from "../hooks/useFilterSort";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function Transactions() {
  const { user } = useAuth();
  const { resolved } = useThemeMode();
  const dark = resolved === "dark";
  const [transactions, setTransactions] = useState([]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "transactions"), orderBy("date", "desc"));
    return onSnapshot(q, s => setTransactions(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);

  const { filtered, dateRange, setDateRange, customFrom, setCustomFrom, customTo, setCustomTo, sortBy, setSortBy } = useFilterSort(transactions);

  const handleDelete = async (id) => {
    if (window.confirm("Delete this entry?"))
      await deleteDoc(doc(db, "users", user.uid, "transactions", id));
  };

  // Type filter on top of date/sort filter
  const typeFiltered = typeFilter === "all" ? filtered : filtered.filter(t => t.type === typeFilter);

  // Pagination
  const totalPages = Math.ceil(typeFiltered.length / pageSize);
  const paginated = typeFiltered.slice((page - 1) * pageSize, page * pageSize);

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

  const typeConfig = {
    income: { color: "#1D9E75", bg: dark ? "rgba(29,158,117,0.2)" : "#E1F5EE", icon: <TrendingUpIcon fontSize="small" />, prefix: "+" },
    expense: { color: "#E24B4A", bg: dark ? "rgba(226,75,74,0.2)" : "#FCEBEB", icon: <TrendingDownIcon fontSize="small" />, prefix: "-" },
    debt: { color: "#BA7517", bg: dark ? "rgba(186,117,23,0.2)" : "#FAEEDA", icon: <CreditCardIcon fontSize="small" />, prefix: "-" },
  };

  const fmt = n => "₹" + Number(n).toLocaleString("en-IN");

  const glass = {
    backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
    background: dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.65)",
    border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.9)"}`,
    borderRadius: 3,
    boxShadow: dark ? "0 4px 24px rgba(0,0,0,0.3)" : "0 4px 24px rgba(0,0,0,0.06)",
  };

  return (
    <Box>
      <Typography sx={{ fontSize: { xs: 26, sm: 32 }, fontWeight: 800, letterSpacing: "-1px", mb: 0.5 }}>
        Transactions
      </Typography>
      <Typography sx={{ color: dark ? "rgba(255,255,255,0.45)" : "#888", mb: 2.5, fontWeight: 500 }}>
        {typeFiltered.length} {typeFiltered.length === 1 ? "entry" : "entries"} found
      </Typography>

      <FilterBar
        dateRange={dateRange} setDateRange={setDateRange}
        customFrom={customFrom} setCustomFrom={setCustomFrom}
        customTo={customTo} setCustomTo={setCustomTo}
        sortBy={sortBy} setSortBy={setSortBy}
        extraFilters={
          <TextField select size="small" label="Type" value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
            sx={{ minWidth: 120 }}>
            <MenuItem value="all">All types</MenuItem>
            <MenuItem value="income">Income</MenuItem>
            <MenuItem value="expense">Expense</MenuItem>
            <MenuItem value="debt">Debt</MenuItem>
          </TextField>
        }
      />

      {/* Rows per page */}
      <Box display="flex" alignItems="center" gap={1.5} mb={2}>
        <Typography sx={{ fontSize: 13, color: dark ? "rgba(255,255,255,0.45)" : "#888" }}>
          Show
        </Typography>
        <FormControl size="small">
          <Select value={pageSize} onChange={handlePageSizeChange}
            sx={{ fontSize: 13, height: 36, minWidth: 70 }}>
            {PAGE_SIZE_OPTIONS.map(s => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography sx={{ fontSize: 13, color: dark ? "rgba(255,255,255,0.45)" : "#888" }}>
          per page · showing {Math.min((page - 1) * pageSize + 1, typeFiltered.length)}–{Math.min(page * pageSize, typeFiltered.length)} of {typeFiltered.length}
        </Typography>
      </Box>

      <Card elevation={0} sx={glass}>
        {paginated.length === 0 && (
          <Box p={3}>
            <Typography sx={{ color: dark ? "rgba(255,255,255,0.35)" : "#bbb", fontSize: 14 }}>
              No entries match your filters.
            </Typography>
          </Box>
        )}
        <List disablePadding>
          {paginated.map((t, i) => {
            const cfg = typeConfig[t.type] || typeConfig.expense;
            return (
              <ListItem key={t.id} divider={i < paginated.length - 1}
                secondaryAction={
                  <IconButton edge="end" size="small" onClick={() => handleDelete(t.id)}>
                    <DeleteIcon fontSize="small" color="error" />
                  </IconButton>
                }>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: cfg.bg, color: cfg.color, width: 36, height: 36 }}>
                    {cfg.icon}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                      <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{t.category}</Typography>
                      <Chip label={t.type} size="small"
                        sx={{ bgcolor: cfg.bg, color: cfg.color, fontSize: 10, height: 18, fontWeight: 700 }} />
                    </Box>
                  }
                  secondary={t.note ? `${t.date} · ${t.note}` : t.date}
                  secondaryTypographyProps={{ sx: { fontSize: 11 } }}
                />
                <Typography sx={{ fontWeight: 800, color: cfg.color, fontSize: 14, mr: 4, whiteSpace: "nowrap" }}>
                  {cfg.prefix}{fmt(t.amount)}
                </Typography>
              </ListItem>
            );
          })}
        </List>
      </Card>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={2.5}>
          <Pagination
            count={totalPages} page={page} onChange={(_, v) => setPage(v)}
            color="primary"
            sx={{
              "& .MuiPaginationItem-root": { fontWeight: 600 },
              "& .Mui-selected": { bgcolor: "rgba(29,158,117,0.2) !important", color: "#1D9E75" },
            }}
          />
        </Box>
      )}
    </Box>
  );
}