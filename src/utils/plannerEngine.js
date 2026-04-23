// ── Daily Spending Limit ─────────────────────────────────────────────────────
export function getDailyLimit(transactions, plannedExpenses, currentBalance) {
  const now = new Date();
  const todayKey = now.toISOString().split("T")[0];
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - now.getDate() + 1;

  // What's already spent today
  const spentToday = transactions
    .filter(t => t.date === todayKey && t.type === "expense")
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  // Upcoming planned expenses this month
  const plannedTotal = plannedExpenses
    .filter(p => !p.paid && p.dueDay >= now.getDate())
    .reduce((s, p) => s + Number(p.amount || 0), 0);

  const availableAfterPlanned = currentBalance - plannedTotal;
  const safeDaily = daysLeft > 0
    ? Math.max(0, Math.round(availableAfterPlanned / daysLeft))
    : 0;
  const remainingToday = Math.max(0, safeDaily - spentToday);

  return { safeDaily, spentToday, remainingToday, plannedTotal, daysLeft };
}

// ── Weekly Digest ────────────────────────────────────────────────────────────
export function getWeeklyDigest(transactions) {
  const now = new Date();

  const getWeekStart = (offset = 0) => {
    const d = new Date(now);
    d.setDate(now.getDate() - now.getDay() - offset * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const thisWeekStart = getWeekStart(0);
  const lastWeekStart = getWeekStart(1);

  const thisWeek = transactions.filter(t => {
    const d = new Date(t.date);
    return d >= thisWeekStart && d <= now && t.type === "expense";
  });

  const lastWeek = transactions.filter(t => {
    const d = new Date(t.date);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
    return d >= lastWeekStart && d <= lastWeekEnd && t.type === "expense";
  });

  const catMap = (arr) => {
    const m = {};
    arr.forEach(t => {
      m[t.category] = (m[t.category] || 0) + Number(t.amount || 0);
    });
    return m;
  };

  const thisMap = catMap(thisWeek);
  const lastMap = catMap(lastWeek);
  const allCats = [...new Set([...Object.keys(thisMap), ...Object.keys(lastMap)])];

  const categories = allCats.map(cat => {
    const cur = thisMap[cat] || 0;
    const prev = lastMap[cat] || 0;
    const pct = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;
    return { cat, cur: Math.round(cur), prev: Math.round(prev), pct };
  }).sort((a, b) => b.cur - a.cur);

  const thisTotal = thisWeek.reduce((s, t) => s + Number(t.amount || 0), 0);
  const lastTotal = lastWeek.reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalPct = lastTotal > 0 ? Math.round(((thisTotal - lastTotal) / lastTotal) * 100) : null;

  return {
    categories,
    thisTotal: Math.round(thisTotal),
    lastTotal: Math.round(lastTotal),
    totalPct,
  };
}

// ── Smart Suggestions ────────────────────────────────────────────────────────
export function getSmartSuggestions(transactions, budgets) {
  const suggestions = [];
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastKey = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}`;

  const thisMonth = transactions.filter(t => t.date?.startsWith(currentKey));
  const lastMonth = transactions.filter(t => t.date?.startsWith(lastKey));

  const catTotals = {};
  thisMonth.filter(t => t.type === "expense").forEach(t => {
    catTotals[t.category] = (catTotals[t.category] || 0) + Number(t.amount || 0);
  });

  // Dining frequency
  const diningTxns = thisMonth.filter(t =>
    t.type === "expense" && ["Dining", "Entertainment"].includes(t.category)
  );
  if (diningTxns.length >= 8) {
    const total = diningTxns.reduce((s, t) => s + Number(t.amount || 0), 0);
    suggestions.push({
      icon: "🍔",
      text: `You've eaten out ${diningTxns.length} times this month — ₹${Math.round(total).toLocaleString("en-IN")} total. Cooking just 3 more meals at home could save ₹${Math.round(total * 0.2).toLocaleString("en-IN")}.`,
      type: "saving",
    });
  }

  // ATM cash usage
  const atmTxns = thisMonth.filter(t => t.category === "ATM Withdrawal");
  if (atmTxns.length > 0) {
    const atmTotal = atmTxns.reduce((s, t) => s + Number(t.amount || 0), 0);
    suggestions.push({
      icon: "🏧",
      text: `₹${Math.round(atmTotal).toLocaleString("en-IN")} withdrawn as cash this month. Cash is hard to track — use UPI to get full visibility.`,
      type: "awareness",
    });
  }

  // Budget overrun
  Object.entries(budgets).forEach(([cat, budget]) => {
    const spent = catTotals[cat] || 0;
    if (spent > budget * 0.9) {
      suggestions.push({
        icon: "⚠️",
        text: `${cat} budget is ${Math.round((spent / budget) * 100)}% used. You have ₹${Math.round(budget - spent).toLocaleString("en-IN")} left.`,
        type: "warning",
      });
    }
  });

  // Consistent overspend category
  const lastCatTotals = {};
  lastMonth.filter(t => t.type === "expense").forEach(t => {
    lastCatTotals[t.category] = (lastCatTotals[t.category] || 0) + Number(t.amount || 0);
  });

  Object.entries(catTotals).forEach(([cat, amt]) => {
    const lastAmt = lastCatTotals[cat] || 0;
    if (lastAmt > 0 && amt > lastAmt * 1.3 && amt > 1000) {
      suggestions.push({
        icon: "📈",
        text: `${cat} spending is up ${Math.round(((amt - lastAmt) / lastAmt) * 100)}% vs last month. Worth reviewing.`,
        type: "awareness",
      });
    }
  });

  // Positive reinforcement
  const income = thisMonth.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalExp = thisMonth.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
  if (income > 0 && totalExp / income < 0.5) {
    suggestions.push({
      icon: "🎉",
      text: `You're spending less than 50% of your income this month. Excellent financial discipline!`,
      type: "positive",
    });
  }

  return suggestions.slice(0, 4);
}

// ── No-Spend Days ────────────────────────────────────────────────────────────
export function getNoSpendDays(transactions) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const spendDays = new Set(
    transactions
      .filter(t => {
        const d = new Date(t.date);
        return t.type === "expense" &&
          d.getMonth() === month && d.getFullYear() === year;
      })
      .map(t => new Date(t.date).getDate())
  );

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const isFuture = day > now.getDate();
    const isNoSpend = !spendDays.has(day) && !isFuture;
    return { day, isNoSpend, isSpend: spendDays.has(day), isFuture };
  });

  // Current streak — count backwards from today
  let streak = 0;
  for (let d = now.getDate(); d >= 1; d--) {
    if (!spendDays.has(d)) streak++;
    else break;
  }

  const noSpendCount = days.filter(d => d.isNoSpend).length;
  return { days, streak, noSpendCount };
}

// ── Afford Calculator ────────────────────────────────────────────────────────
export function canAfford(amount, transactions, currentBalance, debts) {
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonth = transactions.filter(t => t.date?.startsWith(currentKey));
  const income = thisMonth.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
  const expense = thisMonth.filter(t => t.type !== "income").reduce((s, t) => s + Number(t.amount || 0), 0);
  const monthlySavings = Math.max(0, income - expense);
  const totalDebt = debts.reduce((s, d) => s + Number(d.remaining || 0), 0);
  const amt = Number(amount);

  const canAffordNow = currentBalance >= amt;
  const monthsToSave = monthlySavings > 0 ? Math.ceil(amt / monthlySavings) : null;
  const emi6 = Math.round(amt / 6);
  const emi12 = Math.round(amt / 12);
  const emiImpact6 = income > 0 ? Math.round(((expense + emi6) / income) * 100) : null;

  let verdict = "no";
  if (canAffordNow && (totalDebt === 0 || totalDebt < income * 3)) verdict = "yes";
  else if (monthsToSave && monthsToSave <= 3) verdict = "caution";

  return {
    canAffordNow, monthsToSave, emi6, emi12,
    emiImpact6, verdict, monthlySavings, currentBalance,
    income, totalDebt,
  };
}