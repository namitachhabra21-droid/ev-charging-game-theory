/** Formatting helpers. Indian locale gives lakh/crore grouping: ₹1,23,456. */

const inr0 = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inr2 = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** ₹1,23,456 (whole rupees). Negative values keep their minus sign. */
export const formatINR = (v: number) => inr0.format(Math.round(v) === 0 ? 0 : v);

/** ₹12.50 — for per-kWh prices and costs. */
export const formatINR2 = (v: number) => inr2.format(v);

/** Compact axis labels: ₹45K, ₹1.2L. */
export function formatINRCompact(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  if (abs >= 1e7) return `${sign}₹${trim(abs / 1e7)}Cr`;
  if (abs >= 1e5) return `${sign}₹${trim(abs / 1e5)}L`;
  if (abs >= 1e3) return `${sign}₹${trim(abs / 1e3)}K`;
  return `${sign}₹${Math.round(abs)}`;
}

function trim(n: number): string {
  return n >= 100 ? n.toFixed(0) : n.toFixed(1).replace(/\.0$/, "");
}

/** 0.534 → "53.4%" */
export const formatPct = (share: number, digits = 1) => `${(share * 100).toFixed(digits)}%`;

/** Whole-number counts with Indian grouping. */
export const formatNum = (v: number, digits = 0) =>
  v.toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Price strategy label, e.g. "₹16". */
export const priceLabel = (p: number) => `₹${p}`;
