import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const currencySymbols: Record<string, string> = {
  USD: "$",
  EUR: "€",
  RUB: "₽",
  GBP: "£",
  USDT: "₮",
  BTC: "₿",
  ETH: "Ξ",
};

export function getCurrencySymbol(currency?: string | null): string {
  if (!currency) return "$";
  return currencySymbols[currency.toUpperCase()] || currency;
}

export function formatCurrency(amount: number | string | null | undefined, currency?: string | null): string {
  if (amount === null || amount === undefined) return "—";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "—";
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${num.toFixed(2)}`;
}
