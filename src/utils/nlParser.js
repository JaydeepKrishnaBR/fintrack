// ── FinTrack Natural Language Parser ─────────────────────────────────────────
// Parses sentences like:
//   "spent 200 on petrol"
//   "received 37000 salary"
//   "paid EMI 4500"
//   "lent 500 to Rahul"
//   "2k food zomato yesterday"
//   "tds 5000 infosys"

// ── Amount patterns ───────────────────────────────────────────────────────────
const AMOUNT_PATTERNS = [
  { regex: /₹\s*([\d,]+(?:\.\d{1,2})?)\s*k/i, multiplier: 1000 },
  { regex: /₹\s*([\d,]+(?:\.\d{1,2})?)\s*l(?:akh)?/i, multiplier: 100000 },
  { regex: /₹\s*([\d,]+(?:\.\d{1,2})?)/i, multiplier: 1 },
  { regex: /([\d,]+(?:\.\d{1,2})?)\s*k\b/i, multiplier: 1000 },
  { regex: /([\d,]+(?:\.\d{1,2})?)\s*l(?:akh)?\b/i, multiplier: 100000 },
  { regex: /([\d,]+(?:\.\d{1,2})?)/i, multiplier: 1 },
];

function parseAmount(text) {
  for (const { regex, multiplier } of AMOUNT_PATTERNS) {
    const match = text.match(regex);
    if (match) {
      const num = parseFloat(match[1].replace(/,/g, ""));
      if (!isNaN(num) && num > 0) return Math.round(num * multiplier);
    }
  }
  return null;
}

// ── Date patterns ─────────────────────────────────────────────────────────────
function parseDate(text) {
  const now     = new Date();
  const lower   = text.toLowerCase();
  const todayFmt = () => now.toISOString().split("T")[0];

  if (/\byesterday\b/.test(lower)) {
    const d = new Date(now); d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  }
  if (/\btoday\b/.test(lower)) return todayFmt();
  if (/\blast\s+monday\b/.test(lower))    return nDaysAgo(dayOffset(now, 1)).toISOString().split("T")[0];
  if (/\blast\s+tuesday\b/.test(lower))   return nDaysAgo(dayOffset(now, 2)).toISOString().split("T")[0];
  if (/\blast\s+wednesday\b/.test(lower)) return nDaysAgo(dayOffset(now, 3)).toISOString().split("T")[0];
  if (/\blast\s+thursday\b/.test(lower))  return nDaysAgo(dayOffset(now, 4)).toISOString().split("T")[0];
  if (/\blast\s+friday\b/.test(lower))    return nDaysAgo(dayOffset(now, 5)).toISOString().split("T")[0];
  if (/\blast\s+saturday\b/.test(lower))  return nDaysAgo(dayOffset(now, 6)).toISOString().split("T")[0];
  if (/\blast\s+sunday\b/.test(lower))    return nDaysAgo(dayOffset(now, 0)).toISOString().split("T")[0];

  // "3rd april", "5 march", "15 jan"
  const MONTHS = {
    jan:1,feb:2,mar:3,apr:4,may:5,jun:6,
    jul:7,aug:8,sep:9,oct:10,nov:11,dec:12,
    january:1,february:2,march:3,april:4,june:6,
    july:7,august:8,september:9,october:10,november:11,december:12,
  };
  const dateMatch = lower.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)/);
  if (dateMatch) {
    const day   = parseInt(dateMatch[1]);
    const month = MONTHS[dateMatch[2]];
    if (month) {
      const year = now.getFullYear();
      return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    }
  }

  return todayFmt();
}

function dayOffset(now, targetDay) {
  const diff = (now.getDay() - targetDay + 7) % 7 || 7;
  return diff;
}

function nDaysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n); return d;
}

// ── Type detection ────────────────────────────────────────────────────────────
const TYPE_RULES = [
  // Income signals
  { type: "income", patterns: [
    /\b(received|got|credited|salary|sal|income|payment received|bonus|incentive|stipend|rent received|dividend|refund|cashback)\b/i,
    /\b(transferred to me|sent by|from [A-Z][a-z]+)\b/i,
  ]},

  // Debt / EMI
  { type: "debt", patterns: [
    /\b(emi|loan|debt|repaid|repayment|credit card payment|card payment|outstanding)\b/i,
  ]},

  // Lending (special expense)
  { type: "expense", patterns: [
    /\b(lent|lend|gave|borrowed by|loaned)\b/i,
  ]},

  // Expense (default — catches everything else)
  { type: "expense", patterns: [
    /\b(spent|spend|paid|bought|purchased|bill|expense|cost|charged|deducted|tds|gst|fee|rent paid|subscription)\b/i,
  ]},
];

function parseType(text) {
  for (const rule of TYPE_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) return rule.type;
    }
  }
  return "expense"; // default
}

// ── Category detection ────────────────────────────────────────────────────────
const CATEGORY_RULES = [
  { category: "Salary",        type: "income",  keywords: ["salary","sal","ctc","payroll","stipend","wages"] },
  { category: "Freelance",     type: "income",  keywords: ["freelance","project payment","client","invoice paid","consulting"] },
  { category: "Business",      type: "income",  keywords: ["business income","revenue","sales","gst refund"] },
  { category: "Investment",    type: "income",  keywords: ["dividend","interest","fd matured","mutual fund","sip return","profit"] },
  { category: "Bonus",         type: "income",  keywords: ["bonus","incentive","reward","appraisal"] },
  { category: "Rent Received", type: "income",  keywords: ["rent received","tenant","property income"] },
  { category: "Gift",          type: "income",  keywords: ["gift","received from","got from","birthday","wedding gift"] },

  { category: "Rent",          type: "expense", keywords: ["rent","pg","hostel","accommodation","house rent","room rent"] },
  { category: "Groceries",     type: "expense", keywords: ["grocery","groceries","vegetables","fruits","bigbasket","blinkit","zepto","dmart","supermarket","kirana","provisions"] },
  { category: "Transport",     type: "expense", keywords: ["petrol","diesel","fuel","uber","ola","auto","metro","bus","train","irctc","railway","cab","rickshaw","rapido","namma metro"] },
  { category: "Dining",        type: "expense", keywords: ["food","zomato","swiggy","restaurant","hotel","cafe","tea","coffee","lunch","dinner","breakfast","snacks","canteen"] },
  { category: "Utilities",     type: "expense", keywords: ["electricity","eb bill","water","gas","wifi","broadband","internet","mobile bill","recharge","dth","tata play","jio","airtel","bsnl"] },
  { category: "Shopping",      type: "expense", keywords: ["amazon","flipkart","myntra","meesho","shopping","clothes","shoes","shirt","dress","purchase"] },
  { category: "Health",        type: "expense", keywords: ["medicine","pharmacy","apollo","medplus","doctor","hospital","clinic","consultation","lab","test","health","medical"] },
  { category: "Education",     type: "expense", keywords: ["school","college","fees","tuition","course","udemy","coursera","books","exam","education"] },
  { category: "Entertainment", type: "expense", keywords: ["movie","netflix","prime","hotstar","spotify","gaming","game","outing","event","concert","theatre"] },
  { category: "ATM Withdrawal",type: "expense", keywords: ["atm","cash withdrawn","cash withdrawal","withdrew"] },
  { category: "Lending",       type: "expense", keywords: ["lent","lend","gave","loaned","gave to","sent to"] },
  { category: "Transfer",      type: "expense", keywords: ["transferred","sent","transfer","upi","neft","imps","googlepay","phonepe","paytm"] },
  { category: "Tax",           type: "expense", keywords: ["tds","tax","income tax","gst","advance tax","itr"] },
  { category: "Insurance",     type: "expense", keywords: ["insurance","lic","premium","policy","term plan","health insurance"] },
  { category: "Investment",    type: "expense", keywords: ["sip","mutual fund","stocks","shares","nps","ppf","fd","fixed deposit","rd","investment"] },
  { category: "Car Loan",      type: "debt",    keywords: ["car emi","vehicle loan","two wheeler","bike loan"] },
  { category: "Home Loan",     type: "debt",    keywords: ["home loan","housing loan","hl emi","mortgage"] },
  { category: "Credit Card",   type: "debt",    keywords: ["credit card","cc payment","card payment","hdfc card","sbi card","icici card"] },
  { category: "Personal Loan", type: "debt",    keywords: ["personal loan","pl emi","loan emi","emi"] },
];

function parseCategory(text, type) {
  const lower = text.toLowerCase();
  // Find matching category for the detected type first
  for (const rule of CATEGORY_RULES) {
    if (rule.type === type) {
      if (rule.keywords.some(k => lower.includes(k))) {
        return rule.category;
      }
    }
  }
  // Fallback — check all types
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(k => lower.includes(k))) {
      return rule.category;
    }
  }
  // Default per type
  if (type === "income") return "Other Income";
  if (type === "debt")   return "Personal Loan";
  return "Other";
}

// ── Note extraction ───────────────────────────────────────────────────────────
function extractNote(text, amount) {
  // Remove amount, type words, date words — what's left is the note
  let note = text
    .replace(/₹?\s*[\d,]+(?:\.\d{1,2})?\s*(?:k|l|lakh)?/gi, "")
    .replace(/\b(spent|received|paid|got|salary|emi|tds|lent|bought|yesterday|today|last\s+\w+|\d+(?:st|nd|rd|th)?\s+\w+)\b/gi, "")
    .replace(/\s+on\s+/gi, " ")
    .replace(/\s+for\s+/gi, " ")
    .replace(/\s+to\s+/gi, " ")
    .replace(/\s+from\s+/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  // Capitalise first letter
  return note.charAt(0).toUpperCase() + note.slice(1);
}

// ── Main parse function ───────────────────────────────────────────────────────
export function parseNL(input) {
  if (!input || input.trim().length === 0) return null;

  const text   = input.trim();
  const amount = parseAmount(text);
  const date   = parseDate(text);
  const type   = parseType(text);
  const category = parseCategory(text, type);
  const note   = extractNote(text, amount);

  return {
    amount,
    date,
    type,
    category,
    note,
    raw: text,
    confidence: amount ? "high" : "low",
  };
}

// ── Quick chips for common entries ───────────────────────────────────────────
export const QUICK_CHIPS = [
  { label: "Salary received",    text: "received salary"        },
  { label: "Petrol",             text: "spent 500 petrol"       },
  { label: "Groceries",          text: "groceries 800"          },
  { label: "Auto/Cab",           text: "paid 120 auto"          },
  { label: "Recharge",           text: "mobile recharge 299"    },
  { label: "EMI paid",           text: "paid emi"               },
  { label: "Swiggy/Zomato",      text: "zomato 350"             },
  { label: "TDS",                text: "tds deducted"           },
];