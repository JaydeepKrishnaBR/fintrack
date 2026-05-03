// ── India Income Tax Engine ───────────────────────────────────────────────────
// FY 2024-25 / AY 2025-26
// New Tax Regime (default from FY 2023-24)
// Old Tax Regime also supported

const NEW_REGIME_SLABS = [
  { min: 0,        max: 300000,  rate: 0    },
  { min: 300001,   max: 600000,  rate: 0.05 },
  { min: 600001,   max: 900000,  rate: 0.10 },
  { min: 900001,   max: 1200000, rate: 0.15 },
  { min: 1200001,  max: 1500000, rate: 0.20 },
  { min: 1500001,  max: Infinity, rate: 0.30 },
];

const OLD_REGIME_SLABS = [
  { min: 0,        max: 250000,  rate: 0    },
  { min: 250001,   max: 500000,  rate: 0.05 },
  { min: 500001,   max: 1000000, rate: 0.20 },
  { min: 1000001,  max: Infinity, rate: 0.30 },
];

// Standard deduction
const STANDARD_DEDUCTION_NEW = 75000;  // FY 2024-25
const STANDARD_DEDUCTION_OLD = 50000;

// Rebate u/s 87A
const REBATE_NEW = { limit: 700000, amount: 25000 };
const REBATE_OLD = { limit: 500000, amount: 12500 };

// Surcharge
function getSurcharge(taxableIncome, tax) {
  if (taxableIncome <= 5000000)  return 0;
  if (taxableIncome <= 10000000) return tax * 0.10;
  if (taxableIncome <= 20000000) return tax * 0.15;
  if (taxableIncome <= 50000000) return tax * 0.25;
  return tax * 0.37;
}

// Health & Education cess — 4%
const CESS_RATE = 0.04;

function calcTaxOnSlabs(income, slabs) {
  let tax = 0;
  for (const slab of slabs) {
    if (income <= slab.min) break;
    const taxable = Math.min(income, slab.max) - slab.min;
    tax += taxable * slab.rate;
  }
  return Math.round(tax);
}

export function calculateTax(annualIncome, regime = "new", deductions = {}) {
  const {
    section80C = 0,    // PF, PPF, ELSS, LIC etc — old regime only
    section80D = 0,    // Health insurance — old regime only
    hra        = 0,    // HRA exemption — old regime only
    nps        = 0,    // NPS — both regimes (80CCD1B)
    homeLoanInt = 0,   // Home loan interest — old regime only
    otherDeductions = 0,
  } = deductions;

  const isNew = regime === "new";
  const stdDeduction = isNew ? STANDARD_DEDUCTION_NEW : STANDARD_DEDUCTION_OLD;
  const slabs        = isNew ? NEW_REGIME_SLABS : OLD_REGIME_SLABS;
  const rebate       = isNew ? REBATE_NEW : REBATE_OLD;

  // Gross taxable income
  let taxableIncome = Math.max(0, annualIncome - stdDeduction);

  // Old regime deductions
  if (!isNew) {
    const total80C = Math.min(section80C, 150000); // 80C cap ₹1.5L
    const total80D = Math.min(section80D, 25000);  // 80D cap ₹25K basic
    const npsDeduction = Math.min(nps, 50000);     // 80CCD1B cap ₹50K
    taxableIncome = Math.max(0,
      taxableIncome - total80C - total80D - hra
      - npsDeduction - homeLoanInt - otherDeductions
    );
  } else {
    // New regime — only NPS 80CCD1B
    const npsDeduction = Math.min(nps, 50000);
    taxableIncome = Math.max(0, taxableIncome - npsDeduction);
  }

  // Calculate base tax
  let tax = calcTaxOnSlabs(taxableIncome, slabs);

  // Apply rebate 87A
  if (taxableIncome <= rebate.limit) {
    tax = Math.max(0, tax - rebate.amount);
  }

  // Surcharge
  const surcharge = getSurcharge(taxableIncome, tax);
  const taxAfterSurcharge = tax + surcharge;

  // Cess 4%
  const cess = Math.round(taxAfterSurcharge * CESS_RATE);
  const totalTax = taxAfterSurcharge + cess;

  // Monthly reserve
  const monthlyReserve = Math.round(totalTax / 12);

  // Effective rate
  const effectiveRate = annualIncome > 0
    ? ((totalTax / annualIncome) * 100).toFixed(1)
    : 0;

  return {
    annualIncome,
    taxableIncome,
    regime,
    baseTax:        Math.round(tax),
    surcharge:      Math.round(surcharge),
    cess,
    totalTax,
    monthlyReserve,
    effectiveRate,
    stdDeduction,
    slabs: slabs.map(s => ({
      ...s,
      taxOnSlab: s.rate > 0
        ? Math.round(Math.max(0, Math.min(annualIncome, s.max) - s.min) * s.rate)
        : 0,
    })).filter(s => s.taxOnSlab > 0 || (annualIncome > s.min && annualIncome <= s.max)),
  };
}

// TDS tracker helper
export function calcTDSStatus(tdsDeducted, estimatedAnnualTax) {
  const diff = tdsDeducted - estimatedAnnualTax;
  return {
    tdsDeducted,
    estimatedTax: estimatedAnnualTax,
    diff,
    status: diff >= 0 ? "refund" : "payable",
    amount: Math.abs(diff),
  };
}

// Festival amortiser
export const INDIAN_FESTIVALS = [
  { name: "Diwali",      month: 10, description: "Gifts, crackers, sweets, new clothes" },
  { name: "Holi",        month: 3,  description: "Colors, sweets, outings" },
  { name: "Eid",         month: 4,  description: "Gifts, new clothes, feasts" },
  { name: "Onam",        month: 8,  description: "Sadhya, clothes, gifts" },
  { name: "Pongal",      month: 1,  description: "New clothes, gifts, celebrations" },
  { name: "Navratri",    month: 10, description: "Clothes, dandiya, celebrations" },
  { name: "Christmas",   month: 12, description: "Gifts, decorations, feasts" },
  { name: "New Year",    month: 1,  description: "Party, travel, celebrations" },
];

export function amortiseAnnualExpense(totalAmount, monthsRemaining = 12) {
  const months = Math.max(1, monthsRemaining);
  return {
    monthly:  Math.round(totalAmount / months),
    total:    totalAmount,
    months,
    perDay:   Math.round(totalAmount / (months * 30)),
  };
}