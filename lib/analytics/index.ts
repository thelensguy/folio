import { db } from '@/lib/db/client';
import { transactions, categoryRules } from '@/lib/db/schema';
import { and, or, lt, gte, lte, eq, isNull, isNotNull, notInArray, sql, desc } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Auto-categorisation
// ---------------------------------------------------------------------------

const RULES: [RegExp, string][] = [
  [/amazon|amzn/i,                     'Shopping'],
  [/uber|lyft|taxi/i,                  'Transport'],
  [/starbucks|coffee|cafe/i,           'Coffee'],
  [/doordash|grubhub|ubereats/i,       'Food Delivery'],
  [/netflix|spotify|hulu|disney/i,     'Subscriptions'],
  [/wholefds|safeway|kroger|trader/i,  'Groceries'],
  [/shell|chevron|bp|exxon|arco/i,     'Gas'],
  [/cvs|walgreens|pharmacy/i,          'Health'],
  [/venmo|zelle|transfer/i,            'Transfer'],
  [/payroll|direct dep/i,              'Income'],
  [/rent|apartment|property/i,         'Rent'],
  [/insurance/i,                       'Insurance'],
  [/restaurant|grill|kitchen|eatery/i, 'Dining'],
];

export function autoCategory(description: string): string {
  for (const [pattern, cat] of RULES) {
    if (pattern.test(description)) return cat;
  }
  return 'Other';
}

export function applyCategoryRules(description: string): string | null {
  const rules = db.select().from(categoryRules).orderBy(desc(categoryRules.priority)).all();
  const lower = description.toLowerCase();
  for (const rule of rules) {
    if (lower.includes(rule.pattern.toLowerCase())) return rule.category;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Return-type interfaces
// ---------------------------------------------------------------------------

export interface MonthlyCashFlowRow {
  month:    string;
  income:   number;
  expenses: number;
  net:      number;
}

export interface CategoryBreakdownRow {
  category: string;
  total:    number;
  count:    number;
}

export interface TopMerchantRow {
  description: string;
  total:       number;
  count:       number;
}

export interface ReimbursableSummary {
  total: number;
  count: number;
}

export interface CheckingBalanceRow {
  date:    string;
  balance: number;
}

export interface CheckingBalanceSummary {
  hasCheckingAccount: boolean;       // true if any checking-named account exists
  current:            number | null; // null when no balance data has been imported yet
  delta30d:           number | null;
  history:            CheckingBalanceRow[];
}

// ---------------------------------------------------------------------------
// Shared filter helpers
// ---------------------------------------------------------------------------

/** Exclude internal transfers and ATM cash withdrawals from spend analytics. */
const EXCLUDED_CATEGORIES = ['Transfer', 'Cash'] as const;

function notTransferOrCash() {
  return or(
    isNull(transactions.category),
    notInArray(transactions.category, [...EXCLUDED_CATEGORIES]),
  );
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Monthly income / expenses / net between two ISO dates. */
export function getMonthlyCashFlow(
  from: string,
  to: string,
  account?: string,
): MonthlyCashFlowRow[] {
  return db
    .select({
      month:    sql<string>`strftime('%Y-%m', date)`,
      income:   sql<number>`SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END)`,
      expenses: sql<number>`SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END)`,
      net:      sql<number>`SUM(amount)`,
    })
    .from(transactions)
    .where(and(
      gte(transactions.date, from),
      lte(transactions.date, to),
      account ? eq(transactions.account, account) : undefined,
      notTransferOrCash(),
    ))
    .groupBy(sql`strftime('%Y-%m', date)`)
    .orderBy(sql`strftime('%Y-%m', date)`)
    .all();
}

export function getCategoryBreakdown(
  from: string,
  to: string,
  account?: string,
): CategoryBreakdownRow[] {
  return db
    .select({
      category: sql<string>`COALESCE(${transactions.category}, 'Uncategorized')`,
      total:    sql<number>`SUM(ABS(amount))`,
      count:    sql<number>`COUNT(*)`,
    })
    .from(transactions)
    .where(and(
      lt(transactions.amount, 0),
      gte(transactions.date, from),
      lte(transactions.date, to),
      account ? eq(transactions.account, account) : undefined,
      notTransferOrCash(),
    ))
    .groupBy(sql`COALESCE(${transactions.category}, 'Uncategorized')`)
    .orderBy(sql`SUM(ABS(amount)) desc`)
    .all();
}

export function getTopMerchants(
  from: string,
  to: string,
  limit: number,
  account?: string,
  category?: string,
): TopMerchantRow[] {
  const categoryFilter = category
    ? category === 'Uncategorized'
      ? sql`(${transactions.category} IS NULL OR ${transactions.category} = 'Uncategorized')`
      : eq(transactions.category, category)
    : undefined;

  return db
    .select({
      description: transactions.description,
      total:       sql<number>`SUM(ABS(amount))`,
      count:       sql<number>`COUNT(*)`,
    })
    .from(transactions)
    .where(and(
      lt(transactions.amount, 0),
      gte(transactions.date, from),
      lte(transactions.date, to),
      account ? eq(transactions.account, account) : undefined,
      category ? categoryFilter : notTransferOrCash(),
    ))
    .groupBy(transactions.description)
    .orderBy(sql`SUM(ABS(amount)) desc`)
    .limit(limit)
    .all();
}

export function getAccounts(): string[] {
  return db
    .selectDistinct({ account: transactions.account })
    .from(transactions)
    .orderBy(transactions.account)
    .all()
    .map(r => r.account);
}

/**
 * Checking account balance over time (one point per transaction that has
 * a balance value — i.e. rows from the checking CSV only).
 *
 * Returns history within the given date range, plus current (most-recent
 * balance overall) and delta vs 30 days ago for the stat card.
 */
export function getCheckingBalanceOverTime(
  from: string,
  to:   string,
): CheckingBalanceSummary {
  // Detect whether any checking-named account exists (account name contains "check")
  const checkingAccountRows = db
    .select({ account: transactions.account })
    .from(transactions)
    .where(sql`LOWER(${transactions.account}) LIKE '%check%'`)
    .limit(1)
    .all();

  const hasCheckingAccount = checkingAccountRows.length > 0;

  if (!hasCheckingAccount) {
    return { hasCheckingAccount: false, current: null, delta30d: null, history: [] };
  }

  // Most recent balance point regardless of date filter
  const latestRows = db
    .select({ balance: transactions.balance })
    .from(transactions)
    .where(isNotNull(transactions.balance))
    .orderBy(desc(transactions.date), desc(transactions.importedAt))
    .limit(1)
    .all();

  // No balance data yet (column added after import) — tell the UI to show a nudge
  if (!latestRows.length || latestRows[0].balance == null) {
    return { hasCheckingAccount: true, current: null, delta30d: null, history: [] };
  }

  const current = latestRows[0].balance;

  // Balance at the row closest to (but not after) 30 days ago
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const ago30Rows = db
    .select({ balance: transactions.balance })
    .from(transactions)
    .where(and(
      isNotNull(transactions.balance),
      lte(transactions.date, cutoffStr),
    ))
    .orderBy(desc(transactions.date), desc(transactions.importedAt))
    .limit(1)
    .all();

  const delta30d = ago30Rows.length && ago30Rows[0].balance != null
    ? current - ago30Rows[0].balance
    : null;

  // History within the requested date range
  const historyRaw = db
    .select({ date: transactions.date, balance: transactions.balance })
    .from(transactions)
    .where(and(
      isNotNull(transactions.balance),
      gte(transactions.date, from),
      lte(transactions.date, to),
    ))
    .orderBy(transactions.date)
    .all();

  const history: CheckingBalanceRow[] = historyRaw
    .filter(r => r.balance != null)
    .map(r => ({ date: r.date, balance: r.balance as number }));

  return { hasCheckingAccount: true, current, delta30d, history };
}

/** Sum of debits flagged as reimbursable within the current filter window. */
export function getPendingReimbursable(
  from?: string,
  to?: string,
  account?: string,
): ReimbursableSummary {
  const rows = db
    .select({
      total: sql<number>`COALESCE(SUM(ABS(amount)), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(transactions)
    .where(and(
      eq(transactions.isReimbursable, true),
      lt(transactions.amount, 0),
      from    ? gte(transactions.date, from)          : undefined,
      to      ? lte(transactions.date, to)            : undefined,
      account ? eq(transactions.account, account)     : undefined,
    ))
    .all();

  return rows[0] ?? { total: 0, count: 0 };
}
