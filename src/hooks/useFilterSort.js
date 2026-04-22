import { useState, useMemo } from "react";

export function useFilterSort(items, dateField = "date") {
  const [dateRange, setDateRange] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");

  function getDateBounds(range) {
    const now = new Date();
    if (range === "7d") {
      const f = new Date(); f.setDate(now.getDate() - 7);
      return { from: f, to: now };
    }
    if (range === "month") return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    if (range === "6m") {
      const f = new Date(); f.setMonth(now.getMonth() - 6);
      return { from: f, to: now };
    }
    if (range === "year") return { from: new Date(now.getFullYear(), 0, 1), to: now };
    return null;
  }

  const filtered = useMemo(() => {
    let result = [...(items || [])];

    // Date filter
    if (dateRange !== "all") {
      if (dateRange === "custom") {
        result = result.filter(item => {
          const d = new Date(item[dateField]);
          if (customFrom && d < new Date(customFrom)) return false;
          if (customTo && d > new Date(customTo + "T23:59:59")) return false;
          return true;
        });
      } else {
        const bounds = getDateBounds(dateRange);
        if (bounds) {
          result = result.filter(item => {
            const d = new Date(item[dateField]);
            return d >= bounds.from && d <= bounds.to;
          });
        }
      }
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "date_desc") return new Date(b[dateField]) - new Date(a[dateField]);
      if (sortBy === "date_asc") return new Date(a[dateField]) - new Date(b[dateField]);
      if (sortBy === "amount_desc") return Number(b.amount || 0) - Number(a.amount || 0);
      if (sortBy === "amount_asc") return Number(a.amount || 0) - Number(b.amount || 0);
      if (sortBy === "category") return (a.category || "").localeCompare(b.category || "");
      return 0;
    });

    return result;
  }, [items, dateRange, customFrom, customTo, sortBy]);

  return {
    filtered,
    dateRange, setDateRange,
    customFrom, setCustomFrom,
    customTo, setCustomTo,
    sortBy, setSortBy,
  };
}