import { Box, TextField, MenuItem, Collapse } from "@mui/material";

const DATE_RANGES = [
  { label: "This month", value: "month" },
  { label: "All time", value: "all" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 6 months", value: "6m" },
  { label: "This year", value: "year" },
  { label: "Custom range", value: "custom" },
];

const SORT_OPTIONS = [
  { label: "Newest first", value: "date_desc" },
  { label: "Oldest first", value: "date_asc" },
  { label: "Highest amount", value: "amount_desc" },
  { label: "Lowest amount", value: "amount_asc" },
  { label: "Category A–Z", value: "category" },
];

export default function FilterBar({
  dateRange, setDateRange,
  customFrom, setCustomFrom,
  customTo, setCustomTo,
  sortBy, setSortBy,
  extraFilters,
}) {
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          select size="small" label="Period"
          value={dateRange} onChange={e => setDateRange(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          {DATE_RANGES.map(r => (
            <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
          ))}
        </TextField>

        <TextField
          select size="small" label="Sort by"
          value={sortBy} onChange={e => setSortBy(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          {SORT_OPTIONS.map(s => (
            <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
          ))}
        </TextField>

        {extraFilters}
      </Box>

      <Collapse in={dateRange === "custom"}>
        <Box sx={{ display: "flex", gap: 1.5, mt: 1.5, flexWrap: "wrap" }}>
          <TextField
            label="From" type="date" size="small"
            value={customFrom} onChange={e => setCustomFrom(e.target.value)}
            InputLabelProps={{ shrink: true }} sx={{ minWidth: 160 }}
          />
          <TextField
            label="To" type="date" size="small"
            value={customTo} onChange={e => setCustomTo(e.target.value)}
            InputLabelProps={{ shrink: true }} sx={{ minWidth: 160 }}
          />
        </Box>
      </Collapse>
    </Box>
  );
}