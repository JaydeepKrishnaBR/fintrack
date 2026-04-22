import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// ── Auto-category rules based on description keywords ──
const CATEGORY_RULES = [
  // Income
  { keywords: ["GROUPON", "NEFT", "NEFTINW", "SALARY", "IMPS", "Int.Pd", "CREDIT"], category: "Salary", type: "income" },

  // Transport
  { keywords: ["Indian Railways", "RAILWAYS", "METROPOLITAN TR", "Cumta", "IRCTC"], category: "Transport", type: "expense" },

  // Food & Dining
  { keywords: ["RJ Tasty Food", "VENKYS SNACKS", "ARCHANA SWEETS", "SARAVANA SWEETS", "HOTEL WHITE", "SRI KRISHNA SUP", "SR Super Market", "GUNASEKARAN FRU", "Fresh Chicken", "Breakfast", "Swiggy", "Zomato"], category: "Dining", type: "expense" },

  // Groceries & Supermarket
  { keywords: ["BigBasket", "RAJAKUMARI", "MAKESH", "PUSHPA RAJA"], category: "Groceries", type: "expense" },

  // Health & Medical
  { keywords: ["PHARMACY", "APOLLO", "SRMC", "DR AGARWAL", "hospital", "clinic", "medical"], category: "Health", type: "expense" },

  // Utilities & Bills
  { keywords: ["Airtel", "Jio", "BSNL", "Tata Play", "Spotify", "The Hindu", "electricity", "water", "gas"], category: "Utilities", type: "expense" },

  // Shopping
  { keywords: ["RELIANCE TRENDS", "SMART LOOK", "Amazon", "Flipkart", "Myntra", "shopping"], category: "Shopping", type: "expense" },

  // Entertainment & Digital
  { keywords: ["Google India", "ShopifyCommerce", "Snapmint", "Netflix", "YouTube"], category: "Entertainment", type: "expense" },

  // ATM Withdrawals
  { keywords: ["ATL/", "ATW/"], category: "ATM Withdrawal", type: "expense" },

  // Transfers to family/people
  { keywords: ["SHREENIDHI", "RAJASEKAR", "RAGHAVAN", "Dhruvika", "Bharathi", "JAYASRI", "NUTHALAPATI", "ashokviswasam", "SOMASUNDAR", "DHINESHKUMAR", "SRI RAGAVENDRA", "Mani N", "Parthasarathy", "MANIKANDAN", "KARUPPAIYAN"], category: "Transfer", type: "expense" },

  // Loan / EMI
  { keywords: ["EMI", "LOAN", "Euronet"], category: "Personal Loan", type: "debt" },
];

function categorize(description) {
  const desc = description.toUpperCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(k => desc.includes(k.toUpperCase()))) {
      return { category: rule.category, type: rule.type };
    }
  }
  return { category: "Other", type: "expense" };
}

function parseDate(dateStr) {
  // Convert "28 Mar 2026" → "2026-03-28"
  const months = { Jan:"01",Feb:"02",Mar:"03",Apr:"04",May:"05",Jun:"06",Jul:"07",Aug:"08",Sep:"09",Oct:"10",Nov:"11",Dec:"12" };
  const parts = dateStr.trim().split(" ");
  if (parts.length === 3) {
    const day = parts[0].padStart(2, "0");
    const month = months[parts[1]];
    const year = parts[2];
    if (day && month && year) return `${year}-${month}-${day}`;
  }
  return null;
}

function cleanAmount(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/,/g, "").trim()) || 0;
}

export async function parseBankStatement(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Get all text items with their positions
    const items = content.items.map(item => ({
      text: item.str,
      x: Math.round(item.transform[4]),
      y: Math.round(item.transform[5]),
    }));

    // Group by Y position (same row)
    const rows = {};
    items.forEach(item => {
      const key = item.y;
      if (!rows[key]) rows[key] = [];
      rows[key].push(item);
    });

    // Sort rows top to bottom, items left to right
    Object.values(rows)
      .sort((a, b) => b[0].y - a[0].y)
      .forEach(row => {
        const line = row.sort((a, b) => a.x - b.x).map(i => i.text).join(" ");
        fullText += line + "\n";
      });
  }

  return extractTransactions(fullText);
}

function extractTransactions(text) {
  const transactions = [];
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  // Match lines that start with a transaction number followed by a date
  // Pattern: "1 28 Mar 2026 UPI/... amount amount balance"
  // or "28 Mar 2026 UPI/... amount balance" (no number)
  const datePattern = /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})\b/;
  const amountPattern = /[\d,]+\.\d{2}/g;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Skip header lines
    if (
      line.includes("Opening Balance") ||
      line.includes("Savings Account") ||
      line.includes("Statement Generated") ||
      line.includes("Page ") ||
      line.includes("JAYDEEP") ||
      line.includes("Account No") ||
      line.includes("Date") ||
      line.includes("Description") ||
      line.includes("Chq/Ref") ||
      line.includes("Withdrawal") ||
      line.includes("Deposit") ||
      line.includes("Balance") ||
      line.includes("End of Statement") ||
      line.includes("Important Information")
    ) {
      i++;
      continue;
    }

    const dateMatch = line.match(datePattern);
    if (!dateMatch) { i++; continue; }

    const date = parseDate(dateMatch[1]);
    if (!date) { i++; continue; }

    // Collect description — everything after the date up to amounts
    // Look ahead for continuation lines (UPI refs that wrap)
    let descriptionParts = [];
    const afterDate = line.substring(line.indexOf(dateMatch[1]) + dateMatch[1].length).trim();

    // Split off amount numbers from the end
    const amounts = afterDate.match(amountPattern) || [];
    let description = afterDate;
    if (amounts.length > 0) {
      // Remove trailing amounts from description
      const lastAmtIdx = afterDate.lastIndexOf(amounts[0]);
      description = afterDate.substring(0, lastAmtIdx).trim();
    }

    // Check if next line is a continuation (no date, looks like description)
    let j = i + 1;
    while (j < lines.length) {
      const nextLine = lines[j];
      if (datePattern.test(nextLine)) break;
      if (nextLine.match(/^UPI-\d+/) || nextLine.match(/^NEFTINW/) || nextLine.match(/^IMPS/) || nextLine.match(/^\d{9,}/)) {
        // This is a ref number line, skip it
        j++;
        break;
      }
      if (nextLine.match(/^[A-Z]{2,}/) && !nextLine.match(amountPattern)) {
        description += " " + nextLine;
        j++;
      } else {
        break;
      }
    }

    // Clean up description — remove UPI prefix noise
    description = description
      .replace(/^UPI\//, "")
      .replace(/\/\d{12,}\/.*$/, "")
      .replace(/UPI-\d+/, "")
      .replace(/NEFTINW-\d+/, "")
      .replace(/IMPS-\d+/, "")
      .replace(/\s+/g, " ")
      .trim();

    // Find amounts — withdrawal (Dr.) and deposit (Cr.)
    // In Kotak statement: if withdrawal → expense, if deposit → income
    // The amounts appear as: [withdrawal] [deposit] [balance] OR just [deposit] [balance]
    const allAmounts = line.match(amountPattern) || [];

    if (allAmounts.length === 0) { i = j; continue; }

    let withdrawal = 0;
    let deposit = 0;

    if (allAmounts.length >= 3) {
      // withdrawal, deposit, balance — check which is 0
      withdrawal = cleanAmount(allAmounts[0]);
      deposit = cleanAmount(allAmounts[1]);
    } else if (allAmounts.length === 2) {
      // Either withdrawal+balance or deposit+balance
      // Use description heuristics — NEFT credits are usually deposits
      const isDeposit = line.includes("NEFTINW") || line.includes("Int.Pd") || line.includes("IMPS") || line.includes("Recd:");
      if (isDeposit) {
        deposit = cleanAmount(allAmounts[0]);
      } else {
        withdrawal = cleanAmount(allAmounts[0]);
      }
    } else if (allAmounts.length === 1) {
      const isDeposit = line.includes("NEFTINW") || line.includes("Int.Pd") || line.includes("IMPS") || line.includes("Recd:");
      if (isDeposit) deposit = cleanAmount(allAmounts[0]);
      else withdrawal = cleanAmount(allAmounts[0]);
    }

    const amount = withdrawal > 0 ? withdrawal : deposit;
    const isCredit = deposit > 0 && withdrawal === 0;

    if (amount <= 0 || !description) { i = j; continue; }

    // Override category for obvious credits
    let { category, type } = categorize(description);
    if (isCredit) {
      // Credits are income unless they're small peer transfers
      if (amount >= 1000) {
        type = "income";
        category = description.includes("NEFT") || description.includes("GROUPON") ? "Salary" : "Transfer";
      }
    }

    transactions.push({
      date,
      description: description.slice(0, 80),
      amount,
      type,
      category,
      note: description,
    });

    i = j;
  }

  return transactions;
}