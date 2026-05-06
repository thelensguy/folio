import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---------------------------------------------------------------------------
// Category color palette — consistent across pie, table badges, bar chart
// ---------------------------------------------------------------------------
export const COLOR_MAP: Record<string, string> = {
  'Shopping':          '#3B82F6', // blue-500
  'Food & Drink':      '#F59E0B', // amber-400
  'Groceries':         '#10B981', // emerald-500
  'Transfer':          '#8B5CF6', // violet-500
  'Income':            '#22C55E', // green-500
  'Gas':               '#EF4444', // red-500
  'Health':            '#EC4899', // pink-500
  'Health & Wellness': '#F472B6', // pink-400
  'Subscriptions':     '#06B6D4', // cyan-500
  'Coffee':            '#D97706', // amber-600
  'Food Delivery':     '#FB923C', // orange-400
  'Transport':         '#F97316', // orange-500
  'Rent':              '#6366F1', // indigo-500
  'Insurance':         '#84CC16', // lime-500
  'Dining':            '#E879F9', // fuchsia-400
  'Entertainment':     '#A855F7', // purple-500
  'Travel':            '#14B8A6', // teal-500
  'Bills & Utilities': '#64748B', // slate-500
  'Fees & Adjustments':'#78716C', // stone-500
  'Other':             '#6B7280', // gray-500
  'Uncategorized':     '#4B5563', // gray-600
  'Home':              '#0EA5E9', // sky-500
  'Personal':          '#C084FC', // purple-400
  'Auto':              '#FCD34D', // amber-300
};

export function categoryColor(category: string | null | undefined): string {
  if (!category) return COLOR_MAP['Uncategorized'];
  return COLOR_MAP[category] ?? COLOR_MAP['Other'];
}

// ---------------------------------------------------------------------------
// Currency formatting
// ---------------------------------------------------------------------------
export function formatCurrency(
  amount: number,
  opts: { showSign?: boolean; compact?: boolean } = {},
): string {
  const abs = Math.abs(amount);
  const formatted = opts.compact && abs >= 1000
    ? `$${(abs / 1000).toFixed(1)}k`
    : abs.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  if (!opts.showSign) return formatted;
  return amount >= 0 ? `+${formatted}` : `-${formatted.replace('$', '')}`;
}

// ---------------------------------------------------------------------------
// Date helpers (client-safe — pure JS, no server imports)
// ---------------------------------------------------------------------------
export function nMonthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(iso: string): string {
  // e.g. "2026-04-15" → "Apr 15"
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
  });
}

export function formatMonth(ym: string): string {
  // e.g. "2026-04" → "Apr 2026"
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year:  'numeric',
  });
}

// ---------------------------------------------------------------------------
// SWR fetcher
// ---------------------------------------------------------------------------
export const fetcher = (url: string) =>
  fetch(url).then(r => {
    if (!r.ok) throw new Error(`${r.status} ${r.url}`);
    return r.json();
  });
