export function parseTransaction(input) {
  const text = input.toLowerCase().trim();

  // 1. Amount
  const amountMatch = text.match(/\d+(\.\d+)?/);
  const amount = amountMatch ? Number(amountMatch[0]) : null;

  // 2. Type
  let type = "expense";
  let subType = "other";

  if (["sent", "spent", "paid", "gave"].some(w => text.includes(w))) {
    type = "expense";
    subType = "sent";
  }

  if (["got", "received", "earned"].some(w => text.includes(w))) {
    type = "income";
    subType = "received";
  }

  // 3. Category
  const CATEGORY_MAP = {
    food: ["biryani", "food", "swiggy", "zomato"],
    entertainment: ["spotify", "netflix", "movie"],
    transport: ["uber", "ola", "petrol"]
  };

  let category = "other";

  for (let key in CATEGORY_MAP) {
    if (CATEGORY_MAP[key].some(word => text.includes(word))) {
      category = key;
      break;
    }
  }

  // 4. Person
  let person = null;

  const toMatch = text.match(/to (\w+)/);
  const fromMatch = text.match(/from (\w+)/);

  if (toMatch) person = toMatch[1];
  if (fromMatch) person = fromMatch[1];

  return {
    amount,
    type,
    subType,
    category,
    person,
    note: input
  };
}