// ── LAYER 1: Insight Engine ──────────────────────────────────────────────────

export function generateInsights(transactions, debts, profile) {
  const insights = [];
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

  const byMonth = {};
  transactions.forEach(t => {
    const key = t.date?.slice(0, 7);
    if (!key) return;
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(t);
  });

  const current = byMonth[currentMonthKey] || [];
  const last = byMonth[lastMonthKey] || [];

  const sum = (arr, type) => arr.filter(t => t.type === type).reduce((s, t) => s + Number(t.amount || 0), 0);
  const fmt = n => "₹" + Number(n).toLocaleString("en-IN");

  const curIncome = sum(current, "income");
  const curExpense = sum(current, "expense");
  const curDebt = sum(current, "debt");
  const lastExpense = sum(last, "expense");
  const lastIncome = sum(last, "income");

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysElapsed = now.getDate();
  const daysLeft = daysInMonth - daysElapsed;

  // ── Spending vs last month ──
  if (lastExpense > 0 && curExpense > 0) {
    const pct = Math.round(((curExpense - lastExpense) / lastExpense) * 100);
    if (pct > 20) {
      insights.push({
        type: "warning",
        icon: "📈",
        title: "Spending up this month",
        message: `You've spent ${fmt(curExpense)} so far — that's ${pct}% more than last month's ${fmt(lastExpense)}.`,
        priority: 1,
      });
    } else if (pct < -15) {
      insights.push({
        type: "success",
        icon: "📉",
        title: "Great spending control!",
        message: `You've reduced expenses by ${Math.abs(pct)}% vs last month. You're saving ${fmt(lastExpense - curExpense)} more.`,
        priority: 2,
      });
    }
  }

  // ── Savings rate ──
  if (curIncome > 0) {
    const saved = curIncome - curExpense - curDebt;
    const rate = Math.round((saved / curIncome) * 100);
    if (rate < 0) {
      insights.push({
        type: "danger",
        icon: "🚨",
        title: "Spending more than you earn!",
        message: `You've spent ${fmt(Math.abs(saved))} more than your income this month. Review your expenses immediately.`,
        priority: 0,
      });
    } else if (rate < 10) {
      insights.push({
        type: "warning",
        icon: "⚠️",
        title: "Very low savings rate",
        message: `You're only saving ${rate}% of your income. Aim for at least 20% — that's ${fmt(curIncome * 0.2)} this month.`,
        priority: 1,
      });
    } else if (rate >= 30) {
      insights.push({
        type: "success",
        icon: "🎉",
        title: `Excellent! You're saving ${rate}%`,
        message: `You've saved ${fmt(saved)} this month. Keep it up — that's ${fmt(saved * 12)} annually if consistent.`,
        priority: 2,
      });
    }
  }

  // ── Category spike detection ──
  const curCatMap = {};
  const lastCatMap = {};
  current.filter(t => t.type === "expense").forEach(t => {
    curCatMap[t.category] = (curCatMap[t.category] || 0) + Number(t.amount || 0);
  });
  last.filter(t => t.type === "expense").forEach(t => {
    lastCatMap[t.category] = (lastCatMap[t.category] || 0) + Number(t.amount || 0);
  });

  Object.entries(curCatMap).forEach(([cat, amt]) => {
    const lastAmt = lastCatMap[cat] || 0;
    if (lastAmt > 0) {
      const pct = Math.round(((amt - lastAmt) / lastAmt) * 100);
      if (pct > 50 && amt > 500) {
        insights.push({
          type: "warning",
          icon: "🔍",
          title: `${cat} spending jumped ${pct}%`,
          message: `You spent ${fmt(amt)} on ${cat} this month vs ${fmt(lastAmt)} last month.`,
          priority: 1,
        });
      }
    }
  });

  // ── Daily burn rate warning ──
  if (curExpense > 0 && daysElapsed > 5) {
    const dailyBurn = curExpense / daysElapsed;
    const projectedMonthly = dailyBurn * daysInMonth;
    if (curIncome > 0 && projectedMonthly > curIncome * 0.8) {
      insights.push({
        type: "warning",
        icon: "🔥",
        title: "High burn rate",
        message: `At ${fmt(Math.round(dailyBurn))}/day, you're projected to spend ${fmt(Math.round(projectedMonthly))} this month — ${Math.round((projectedMonthly / curIncome) * 100)}% of income.`,
        priority: 1,
      });
    }
  }

  // ── Debt alert ──
  const totalDebt = debts.reduce((s, d) => s + Number(d.remaining || 0), 0);
  if (totalDebt > 0 && curIncome > 0) {
    const dti = totalDebt / (curIncome * 12);
    if (dti > 0.5) {
      insights.push({
        type: "danger",
        icon: "💳",
        title: "High debt burden",
        message: `Your total debt (${fmt(totalDebt)}) is ${Math.round(dti * 100)}% of your annual income. Focus on reducing high-interest debt first.`,
        priority: 0,
      });
    }
  }

  // ── No income logged ──
  if (curIncome === 0 && daysElapsed > 5) {
    insights.push({
      type: "info",
      icon: "💡",
      title: "No income logged yet",
      message: "Haven't logged your salary this month? Add it to get accurate insights and savings rate.",
      priority: 3,
    });
  }

  // ── Frequent small transactions ──
  const smallTxns = current.filter(t => t.type === "expense" && Number(t.amount) < 200);
  if (smallTxns.length >= 10) {
    const smallTotal = smallTxns.reduce((s, t) => s + Number(t.amount), 0);
    insights.push({
      type: "info",
      icon: "☕",
      title: `${smallTxns.length} micro-transactions this month`,
      message: `Small expenses under ₹200 add up to ${fmt(Math.round(smallTotal))}. These are easy to overlook but hard to stop.`,
      priority: 3,
    });
  }

  return insights.sort((a, b) => a.priority - b.priority);
}

// ── LAYER 3: Burn Rate Predictor ─────────────────────────────────────────────

export function getBurnRate(transactions, currentBalance) {
  const now = new Date();
  const daysElapsed = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - daysElapsed;

  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonth = transactions.filter(t => t.date?.startsWith(currentMonthKey));
  const totalSpent = thisMonth.filter(t => t.type === "expense" || t.type === "debt")
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalIncome = thisMonth.filter(t => t.type === "income")
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const dailyBurn = daysElapsed > 0 ? totalSpent / daysElapsed : 0;
  const projectedTotal = dailyBurn * daysInMonth;
  const projectedRemaining = currentBalance - (dailyBurn * daysLeft);
  const daysUntilZero = dailyBurn > 0 ? Math.floor(currentBalance / dailyBurn) : 999;
  const safeDaily = daysLeft > 0 ? currentBalance / daysLeft : 0;

  return {
    dailyBurn: Math.round(dailyBurn),
    projectedTotal: Math.round(projectedTotal),
    projectedRemaining: Math.round(projectedRemaining),
    daysUntilZero,
    daysLeft,
    safeDaily: Math.round(safeDaily),
    totalSpent,
    totalIncome,
    daysElapsed,
    daysInMonth,
  };
}

// ── LAYER 6: Subscription Leak Detector ─────────────────────────────────────

export function detectSubscriptions(transactions) {
  const now = new Date();
  const last3Months = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // Group by merchant (simplified from description/category)
  const merchantMonths = {};

  transactions
    .filter(t => t.type === "expense" && last3Months.some(m => t.date?.startsWith(m)))
    .forEach(t => {
      const key = (t.note || t.category || "").slice(0, 30).trim();
      if (!merchantMonths[key]) merchantMonths[key] = {};
      const monthKey = t.date?.slice(0, 7);
      if (!merchantMonths[key][monthKey]) merchantMonths[key][monthKey] = [];
      merchantMonths[key][monthKey].push(Number(t.amount || 0));
    });

  const subscriptions = [];

  Object.entries(merchantMonths).forEach(([merchant, months]) => {
    const monthKeys = Object.keys(months).filter(m => last3Months.includes(m));
    if (monthKeys.length >= 2) {
      const amounts = monthKeys.map(m => months[m][0]);
      const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;
      const variance = amounts.every(a => Math.abs(a - avgAmount) < avgAmount * 0.1);

      if (variance && avgAmount >= 50 && avgAmount <= 5000) {
        subscriptions.push({
          merchant,
          amount: Math.round(avgAmount),
          months: monthKeys.length,
          lastCharged: monthKeys.sort().reverse()[0],
          annual: Math.round(avgAmount * 12),
        });
      }
    }
  });

  return subscriptions.sort((a, b) => b.amount - a.amount);
}

// ── LAYER 2: Salary Report Helper ───────────────────────────────────────────

export function getSalaryReport(transactions) {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const thisMonth = transactions.filter(t => t.date?.startsWith(currentMonthKey));
  const income = thisMonth.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalExpense = thisMonth.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalDebt = thisMonth.filter(t => t.type === "debt").reduce((s, t) => s + Number(t.amount || 0), 0);

  // Group expenses by category
  const catMap = {};
  thisMonth.filter(t => t.type === "expense").forEach(t => {
    catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount || 0);
  });

  const categories = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => ({
      name,
      amount: Math.round(amount),
      pct: income > 0 ? Math.round((amount / income) * 100) : 0,
    }));

  const remaining = income - totalExpense - totalDebt;

  return {
    month: MONTH_NAMES[now.getMonth()],
    year: now.getFullYear(),
    income: Math.round(income),
    totalExpense: Math.round(totalExpense),
    totalDebt: Math.round(totalDebt),
    remaining: Math.round(remaining),
    remainingPct: income > 0 ? Math.round((remaining / income) * 100) : 0,
    categories,
    txnCount: thisMonth.length,
  };
}