import { useEffect, useState } from "react";
import { db } from "../firebase/config";
import {
  collection, onSnapshot, query, orderBy, deleteDoc, doc
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import {
  Box, Typography, List, ListItem, ListItemText, ListItemAvatar,
  Avatar, IconButton, Chip, TextField, MenuItem, Select,
  FormControl, Button, Pagination, Checkbox, Tooltip
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ClearIcon from "@mui/icons-material/Clear";
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
  const [selected, setSelected] = useState(new Set());
  const [hiddenIds, setHiddenIds] = useState(new Set());

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "transactions"),
      orderBy("date", "desc")
    );
    return onSnapshot(q, s =>
      setTransactions(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [user]);

  const {
    filtered, dateRange, setDateRange,
    customFrom, setCustomFrom,
    customTo, setCustomTo,
    sortBy, setSortBy,
  } = useFilterSort(transactions);

  const typeFiltered = typeFilter === "all"
    ? filtered
    : filtered.filter(t => t.type === typeFilter);

  const visibleRows = typeFiltered.filter(t => !hiddenIds.has(t.id));
  const hiddenCount = hiddenIds.size;
  const totalPages = Math.ceil(visibleRows.length / pageSize);
  const paginated = visibleRows.slice((page - 1) * pageSize, page * pageSize);
  const currentPageIds = paginated.map(t => t.id);
  const allCurrentSelected = currentPageIds.length > 0 &&
    currentPageIds.every(id => selected.has(id));
  const someSelected = selected.size > 0;

  const handleSelectAll = (e) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (e.target.checked) {
        currentPageIds.forEach(id => next.add(id));
      } else {
        currentPageIds.forEach(id => next.delete(id));
      }
      return next;
    });
  };

  const handleSelectOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleClear = () => setSelected(new Set());

  const handleHide = () => {
    setHiddenIds(prev => {
      const next = new Set(prev);
      selected.forEach(id => next.add(id));
      return next;
    });
    setSelected(new Set());
  };

  const handleUnhideAll = () => setHiddenIds(new Set());

  const handleDelete = async () => {
    if (!window.confirm(
      `Permanently delete ${selected.size} transaction${selected.size > 1 ? "s" : ""}? This cannot be undone.`
    )) return;
    await Promise.all(
      [...selected].map(id =>
        deleteDoc(doc(db, "users", user.uid, "transactions", id))
      )
    );
    setSelected(new Set());
  };

  const handleDeleteSingle = async (id) => {
    if (window.confirm("Delete this entry?"))
      await deleteDoc(doc(db, "users", user.uid, "transactions", id));
  };

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setPage(1);
    setSelected(new Set());
  };

  const typeConfig = {
    income:  { color: "#1D9E75", bg: dark ? "rgba(29,158,117,0.2)"  : "#E1F5EE", icon: <TrendingUpIcon  fontSize="small" />, prefix: "+" },
    expense: { color: "#E24B4A", bg: dark ? "rgba(226,75,74,0.2)"   : "#FCEBEB", icon: <TrendingDownIcon fontSize="small" />, prefix: "-" },
    debt:    { color: "#BA7517", bg: dark ? "rgba(186,117,23,0.2)"  : "#FAEEDA", icon: <CreditCardIcon   fontSize="small" />, prefix: "-" },
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
      {/* Header */}
      <Typography sx={{
        fontSize: { xs: 26, sm: 32 }, fontWeight: 800,
        letterSpacing: "-1px", mb: 0.5,
      }}>
        Transactions
      </Typography>
      <Typography sx={{
        color: dark ? "rgba(255,255,255,0.45)" : "#888",
        mb: 2.5, fontWeight: 500,
      }}>
        {visibleRows.length} {visibleRows.length === 1 ? "entry" : "entries"} found
      </Typography>

      {/* Filter bar + action buttons row */}
      <Box sx={{
        display: "flex", alignItems: "flex-start",
        justifyContent: "space-between", gap: 2,
        flexWrap: "wrap", mb: 0.5,
      }}>
        {/* Left — filters */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <FilterBar
            dateRange={dateRange} setDateRange={setDateRange}
            customFrom={customFrom} setCustomFrom={setCustomFrom}
            customTo={customTo} setCustomTo={setCustomTo}
            sortBy={sortBy} setSortBy={setSortBy}
            extraFilters={
              <TextField
                select size="small" label="Type"
                value={typeFilter}
                onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
                sx={{ minWidth: 120 }}
              >
                <MenuItem value="all">All types</MenuItem>
                <MenuItem value="income">Income</MenuItem>
                <MenuItem value="expense">Expense</MenuItem>
                <MenuItem value="debt">Debt</MenuItem>
              </TextField>
            }
          />
        </Box>

        {/* Right — action buttons */}
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", pt: 0.5, flexShrink: 0 }}>
          <Tooltip title="Clear selection">
            <span>
              <Button
                size="small" startIcon={<ClearIcon />}
                onClick={handleClear} disabled={!someSelected}
                variant="outlined"
                sx={{
                  textTransform: "none", fontWeight: 600,
                  borderRadius: 2, fontSize: 13,
                  borderColor: dark ? "rgba(255,255,255,0.15)" : "#ddd",
                  color: dark ? "rgba(255,255,255,0.5)" : "#888",
                  "&:disabled": { opacity: 0.35 },
                }}
              >
                Clear
              </Button>
            </span>
          </Tooltip>

          <Tooltip title="Hide selected rows (resets on refresh)">
            <span>
              <Button
                size="small" startIcon={<VisibilityOffIcon />}
                onClick={handleHide} disabled={!someSelected}
                variant="outlined"
                sx={{
                  textTransform: "none", fontWeight: 600,
                  borderRadius: 2, fontSize: 13,
                  borderColor: someSelected
                    ? "rgba(55,138,221,0.5)" : dark ? "rgba(255,255,255,0.15)" : "#ddd",
                  color: someSelected ? "#378ADD" : dark ? "rgba(255,255,255,0.35)" : "#aaa",
                  "&:disabled": { opacity: 0.35 },
                }}
              >
                Hide{someSelected ? ` (${selected.size})` : ""}
              </Button>
            </span>
          </Tooltip>

          <Tooltip title="Permanently delete selected">
            <span>
              <Button
                size="small" startIcon={<DeleteIcon />}
                onClick={handleDelete} disabled={!someSelected}
                variant="outlined"
                sx={{
                  textTransform: "none", fontWeight: 600,
                  borderRadius: 2, fontSize: 13,
                  borderColor: someSelected
                    ? "rgba(226,75,74,0.5)" : dark ? "rgba(255,255,255,0.15)" : "#ddd",
                  color: someSelected ? "#E24B4A" : dark ? "rgba(255,255,255,0.35)" : "#aaa",
                  "&:disabled": { opacity: 0.35 },
                }}
              >
                Delete{someSelected ? ` (${selected.size})` : ""}
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Hidden rows banner */}
      {hiddenCount > 0 && (
        <Box sx={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          px: 2, py: 1, mb: 1.5, borderRadius: 2,
          background: dark ? "rgba(55,138,221,0.1)" : "rgba(55,138,221,0.08)",
          border: "1px solid rgba(55,138,221,0.25)",
        }}>
          <Box display="flex" alignItems="center" gap={1}>
            <VisibilityOffIcon sx={{ fontSize: 16, color: "#378ADD" }} />
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#378ADD" }}>
              {hiddenCount} row{hiddenCount > 1 ? "s" : ""} hidden
            </Typography>
          </Box>
          <Button
            size="small" startIcon={<VisibilityIcon />}
            onClick={handleUnhideAll}
            sx={{
              textTransform: "none", fontWeight: 700,
              fontSize: 12, color: "#378ADD", borderRadius: 2,
            }}
          >
            Unhide all
          </Button>
        </Box>
      )}

      {/* Rows per page + count */}
      <Box display="flex" alignItems="center" gap={1.5} mb={2}>
        <Typography sx={{ fontSize: 13, color: dark ? "rgba(255,255,255,0.45)" : "#888" }}>
          Show
        </Typography>
        <FormControl size="small">
          <Select
            value={pageSize} onChange={handlePageSizeChange}
            sx={{ fontSize: 13, height: 34, minWidth: 70 }}
          >
            {PAGE_SIZE_OPTIONS.map(s => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography sx={{ fontSize: 13, color: dark ? "rgba(255,255,255,0.45)" : "#888" }}>
          per page · {Math.min((page - 1) * pageSize + 1, visibleRows.length)}–{Math.min(page * pageSize, visibleRows.length)} of {visibleRows.length}
        </Typography>
      </Box>

      {/* Table */}
      <Box sx={{ ...glass, overflow: "hidden" }}>

        {/* Select all header row */}
        <Box sx={{
          display: "flex", alignItems: "center", gap: 1.5,
          px: 2, py: 1.2,
          borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "#f0f0f0"}`,
          background: dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
        }}>
          <Checkbox
            size="small"
            checked={allCurrentSelected}
            indeterminate={!allCurrentSelected && currentPageIds.some(id => selected.has(id))}
            onChange={handleSelectAll}
            sx={{ color: dark ? "rgba(255,255,255,0.3)" : "#ccc", p: 0,
              "&.Mui-checked, &.MuiCheckbox-indeterminate": { color: "#1D9E75" } }}
          />
          <Typography sx={{
            fontSize: 11, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: 0.5, color: dark ? "rgba(255,255,255,0.35)" : "#bbb",
          }}>
            {allCurrentSelected
              ? `All ${currentPageIds.length} on this page selected`
              : someSelected
              ? `${selected.size} selected`
              : `Select all on this page`}
          </Typography>
        </Box>

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
            const isSelected = selected.has(t.id);

            return (
              <ListItem
                key={t.id}
                divider={i < paginated.length - 1}
                sx={{
                  background: isSelected
                    ? dark ? "rgba(29,158,117,0.08)" : "rgba(29,158,117,0.05)"
                    : "transparent",
                  transition: "background 0.15s",
                  pr: 7,
                }}
                secondaryAction={
                  <IconButton
                    edge="end" size="small"
                    onClick={() => handleDeleteSingle(t.id)}
                  >
                    <DeleteIcon fontSize="small" color="error" />
                  </IconButton>
                }
              >
                {/* Checkbox */}
                <Checkbox
                  size="small"
                  checked={isSelected}
                  onChange={() => handleSelectOne(t.id)}
                  sx={{
                    mr: 1, p: 0, flexShrink: 0,
                    color: dark ? "rgba(255,255,255,0.25)" : "#ccc",
                    "&.Mui-checked": { color: "#1D9E75" },
                  }}
                />

                <ListItemAvatar sx={{ minWidth: 46 }}>
                  <Avatar sx={{
                    bgcolor: cfg.bg, color: cfg.color,
                    width: 34, height: 34,
                  }}>
                    {cfg.icon}
                  </Avatar>
                </ListItemAvatar>

                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                      <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                        {t.category}
                      </Typography>
                      <Chip
                        label={t.type} size="small"
                        sx={{
                          bgcolor: cfg.bg, color: cfg.color,
                          fontSize: 10, height: 18, fontWeight: 700,
                        }}
                      />
                    </Box>
                  }
                  secondary={t.note ? `${t.date} · ${t.note}` : t.date}
                  secondaryTypographyProps={{ sx: { fontSize: 11 } }}
                />

                <Typography sx={{
                  fontWeight: 800, color: cfg.color,
                  fontSize: 14, mr: 1, whiteSpace: "nowrap", flexShrink: 0,
                }}>
                  {cfg.prefix}{fmt(t.amount)}
                </Typography>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={2.5}>
          <Pagination
            count={totalPages} page={page}
            onChange={(_, v) => { setPage(v); setSelected(new Set()); }}
            sx={{
              "& .MuiPaginationItem-root": { fontWeight: 600 },
              "& .Mui-selected": {
                bgcolor: "rgba(29,158,117,0.2) !important",
                color: "#1D9E75",
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
}