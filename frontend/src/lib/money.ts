export type Money = { cents: number; label: string };

export const PRICE_PATTERN = /^\d{1,8}(\.\d{1,2})?$/;

/** "4500.00" -> 450000. Integer cents, so the cart never suffers float rounding. */
export function parsePriceToCents(raw: string): number {
  if (!PRICE_PATTERN.test(raw)) {
    throw new Error(`Not a valid price: "${raw}"`);
  }
  const [whole, fraction = ""] = raw.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

/** 450000 -> "KES 4,500"; 125050 -> "KES 1,250.50". */
export function formatKes(cents: number): string {
  const digits = cents % 100 === 0 ? 0 : 2;
  const amount = new Intl.NumberFormat("en-KE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(cents / 100);
  return `KES ${amount}`;
}

export function toMoney(raw: string): Money {
  const cents = parsePriceToCents(raw);
  return { cents, label: formatKes(cents) };
}
