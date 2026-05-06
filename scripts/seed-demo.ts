#!/usr/bin/env tsx
/**
 * scripts/seed-demo.ts
 *
 * Seeds 12 months of clean, showcase-ready demo transactions plus
 * default category rules. Safe to run multiple times (INSERT OR IGNORE).
 *
 * Usage:
 *   npm run db:seed          — seed into existing database
 *   npm run db:reset-demo    — wipe + recreate schema + seed
 */

import path from 'path';
import { createHash, randomUUID } from 'crypto';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { transactions, categoryRules, imports } from '../lib/db/schema';

// ── DB connection ─────────────────────────────────────────────────────────────

const dbPath = path.resolve(process.cwd(), 'data', 'finance.db');
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
const db = drizzle(sqlite, { schema: { transactions, categoryRules, imports } });

// ── Utilities ─────────────────────────────────────────────────────────────────

function makeId(date: string, desc: string, amount: number): string {
  return createHash('sha256')
    .update(`${date}|${desc}|${amount}`)
    .digest('hex')
    .slice(0, 16);
}

function d(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Deterministic variation: returns base ± range, 2 decimal places.
function v(base: number, range: number, seed: number): number {
  const h = Math.abs(Math.sin(seed * 127.1 + 311.7) * 43758.5453);
  const r = h - Math.floor(h);
  return Math.round(Math.max(0.01, base + (r - 0.5) * 2 * range) * 100) / 100;
}

// ── Accounts ──────────────────────────────────────────────────────────────────

const CHK = 'Sapphire Checking';
const CRD = 'Sapphire Preferred';
const NOW = Date.now();

// ── Transaction builder ───────────────────────────────────────────────────────

interface TxSeed {
  date:            string;
  description:     string;
  amount:          number;
  type:            'debit' | 'credit';
  category:        string | null;
  account:         string;
  rawDesc:         string;
  notes?:          string | null;
  isReimbursable?: boolean;
  balance?:        number | null;
}

function tx(t: TxSeed) {
  return {
    id:             makeId(t.date, t.description, t.amount),
    date:           t.date,
    description:    t.description,
    amount:         t.amount,
    type:           t.type,
    category:       t.category,
    account:        t.account,
    rawDesc:        t.rawDesc,
    importedAt:     NOW,
    isReimbursable: t.isReimbursable ?? false,
    notes:          t.notes ?? null,
    balance:        t.balance ?? null,
  };
}

// ── 12-month range: May 2025 – April 2026 ────────────────────────────────────

const MONTHS: [number, number][] = [
  [2025, 5],  [2025, 6],  [2025, 7],  [2025, 8],
  [2025, 9],  [2025, 10], [2025, 11], [2025, 12],  // mi 0–7
  [2026, 1],  [2026, 2],  [2026, 3],  [2026, 4],   // mi 8–11
];

// mi=7 → December 2025: travel anomaly month
const TRAVEL_MONTH = 7;
// mi=8 → January 2026: elevated CC payment to cover travel
const POST_TRAVEL_MONTH = 8;

const rows: ReturnType<typeof tx>[] = [];
let chkBal = 7_180.42;

for (let mi = 0; mi < MONTHS.length; mi++) {
  const [year, month] = MONTHS[mi];
  const s = year * 100 + month;  // unique per-month seed base

  // ── CHECKING ACCOUNT ────────────────────────────────────────────────────────

  // Payroll #1 — 1st
  chkBal += 4_350;
  rows.push(tx({
    date: d(year, month, 1),
    description: 'Acme Corp Payroll', rawDesc: 'ACME CORP PAYROLL DIRECT DEP',
    amount: 4_350, type: 'credit', category: 'Income',
    account: CHK, balance: chkBal,
  }));

  // Rent — 2nd
  chkBal -= 2_800;
  rows.push(tx({
    date: d(year, month, 2),
    description: 'Rent Payment', rawDesc: 'RENT PAYMENT ACH',
    amount: -2_800, type: 'debit', category: 'Rent',
    account: CHK, balance: chkBal,
  }));

  // Utilities — 6th
  const util = v(92, 20, s + 1);
  chkBal -= util;
  rows.push(tx({
    date: d(year, month, 6),
    description: 'City Power & Gas', rawDesc: 'CITY POWER AND GAS UTIL',
    amount: -util, type: 'debit', category: 'Utilities',
    account: CHK, balance: chkBal,
  }));

  // Internet — 8th
  chkBal -= 65;
  rows.push(tx({
    date: d(year, month, 8),
    description: 'Broadband Service', rawDesc: 'BROADBAND SVC MONTHLY',
    amount: -65, type: 'debit', category: 'Utilities',
    account: CHK, balance: chkBal,
  }));

  // Payroll #2 — 15th
  chkBal += 4_350;
  rows.push(tx({
    date: d(year, month, 15),
    description: 'Acme Corp Payroll', rawDesc: 'ACME CORP PAYROLL DIRECT DEP',
    amount: 4_350, type: 'credit', category: 'Income',
    account: CHK, balance: chkBal,
  }));

  // Credit card payment — 20th
  // January covers December travel so the payment is elevated
  const ccBase  = mi === POST_TRAVEL_MONTH ? 4_600 : 3_050;
  const ccRange = mi === POST_TRAVEL_MONTH ? 200   : 550;
  const ccPmt   = v(ccBase, ccRange, s + 2);
  chkBal -= ccPmt;
  rows.push(tx({
    date: d(year, month, 20),
    description: 'Credit Card Payment', rawDesc: 'CREDIT CARD PAYMENT ACH',
    amount: -ccPmt, type: 'debit', category: 'Transfer',
    account: CHK, balance: chkBal,
  }));

  // ATM — every 3rd month
  if (mi % 3 === 0) {
    const atm = v(200, 50, s + 3);
    chkBal -= atm;
    rows.push(tx({
      date: d(year, month, 24),
      description: 'ATM Withdrawal', rawDesc: 'ATM WITHDRAWAL',
      amount: -atm, type: 'debit', category: 'Cash',
      account: CHK, balance: chkBal,
    }));
  }

  // ── CREDIT CARD ACCOUNT ─────────────────────────────────────────────────────

  // ── Subscriptions (every month, fixed amounts) ──
  rows.push(tx({ date: d(year, month, 5),  description: 'Spotify',      rawDesc: 'SPOTIFY',       amount: -9.99,  type: 'debit', category: 'Subscriptions', account: CRD }));
  rows.push(tx({ date: d(year, month, 8),  description: 'Netflix',      rawDesc: 'NETFLIX.COM',   amount: -15.49, type: 'debit', category: 'Subscriptions', account: CRD }));
  rows.push(tx({ date: d(year, month, 12), description: 'Amazon Prime', rawDesc: 'AMAZON PRIME',  amount: -14.99, type: 'debit', category: 'Subscriptions', account: CRD }));
  rows.push(tx({ date: d(year, month, 16), description: 'Hulu',         rawDesc: 'HULU',          amount: -17.99, type: 'debit', category: 'Subscriptions', account: CRD }));

  // ── Groceries ──
  rows.push(tx({ date: d(year, month, 3),  description: 'Green Valley Market', rawDesc: 'GREEN VALLEY MKT', amount: -v(88, 28, s + 10), type: 'debit', category: 'Groceries', account: CRD }));
  rows.push(tx({ date: d(year, month, 10), description: 'Harvest Co-op',       rawDesc: 'HARVEST CO-OP',    amount: -v(62, 18, s + 11), type: 'debit', category: 'Groceries', account: CRD }));
  rows.push(tx({ date: d(year, month, 18), description: 'Green Valley Market', rawDesc: 'GREEN VALLEY MKT', amount: -v(95, 32, s + 12), type: 'debit', category: 'Groceries', account: CRD }));
  rows.push(tx({ date: d(year, month, 25), description: 'Metro Grocers',        rawDesc: 'METRO GROCERS',   amount: -v(52, 18, s + 13), type: 'debit', category: 'Groceries', account: CRD }));

  // ── Food & Drink (dining + coffee merged) ──
  rows.push(tx({ date: d(year, month, 4),  description: 'Burrito District',   rawDesc: 'BURRITO DISTRICT',    amount: -v(14, 4,   s + 20), type: 'debit', category: 'Food & Drink', account: CRD }));
  rows.push(tx({ date: d(year, month, 6),  description: 'Perk Coffee',        rawDesc: 'PERK COFFEE',         amount: -v(6.5, 1.5, s + 21), type: 'debit', category: 'Food & Drink', account: CRD }));
  rows.push(tx({ date: d(year, month, 9),  description: 'Stack Burger',       rawDesc: 'STACK BURGER',        amount: -v(18, 5,   s + 22), type: 'debit', category: 'Food & Drink', account: CRD }));
  rows.push(tx({ date: d(year, month, 11), description: 'Morning Roast Cafe', rawDesc: 'MORNING ROAST CAFE', amount: -v(5.5, 1.5, s + 23), type: 'debit', category: 'Food & Drink', account: CRD }));
  rows.push(tx({ date: d(year, month, 13), description: 'Bangkok Garden',     rawDesc: 'BANGKOK GARDEN',      amount: -v(26, 8,   s + 24), type: 'debit', category: 'Food & Drink', account: CRD }));
  rows.push(tx({
    date: d(year, month, 17), description: 'Trattoria Roma', rawDesc: 'TRATTORIA ROMA',
    amount: -v(52, 18, s + 25), type: 'debit', category: 'Food & Drink', account: CRD,
    // May 2025 (mi=0): work dinner, flagged reimbursable
    isReimbursable: mi === 0,
    notes: mi === 0 ? 'Client dinner — submit to expense report' : null,
  }));
  rows.push(tx({ date: d(year, month, 19), description: 'Grind Coffee',       rawDesc: 'GRIND COFFEE',        amount: -v(7, 1.5,  s + 26), type: 'debit', category: 'Food & Drink', account: CRD }));
  rows.push(tx({ date: d(year, month, 21), description: 'Burrito District',   rawDesc: 'BURRITO DISTRICT',    amount: -v(13, 4,   s + 27), type: 'debit', category: 'Food & Drink', account: CRD }));
  rows.push(tx({
    date: d(year, month, 22), description: 'Harbor Sushi', rawDesc: 'HARBOR SUSHI',
    amount: -v(58, 22, s + 28), type: 'debit', category: 'Food & Drink', account: CRD,
    // October 2025 (mi=5): team lunch, flagged reimbursable
    isReimbursable: mi === 5,
    notes: mi === 5 ? 'Team lunch — file via expense portal' : null,
  }));
  rows.push(tx({ date: d(year, month, 27), description: 'Stack Burger',       rawDesc: 'STACK BURGER',        amount: -v(16, 4,   s + 29), type: 'debit', category: 'Food & Drink', account: CRD }));
  rows.push(tx({ date: d(year, month, 28), description: 'Morning Roast Cafe', rawDesc: 'MORNING ROAST CAFE', amount: -v(5, 1.5,  s + 30), type: 'debit', category: 'Food & Drink', account: CRD }));

  // ── Transport ──
  rows.push(tx({ date: d(year, month, 7),  description: 'Uber', rawDesc: 'UBER', amount: -v(22, 8, s + 40), type: 'debit', category: 'Transport', account: CRD }));
  rows.push(tx({ date: d(year, month, 14), description: 'Lyft', rawDesc: 'LYFT', amount: -v(18, 7, s + 41), type: 'debit', category: 'Transport', account: CRD }));
  if (mi % 2 === 0) {
    rows.push(tx({ date: d(year, month, 23), description: 'Uber', rawDesc: 'UBER', amount: -v(25, 8, s + 42), type: 'debit', category: 'Transport', account: CRD }));
  }

  // ── Shopping ──
  rows.push(tx({
    date: d(year, month, 13), description: 'Amazon', rawDesc: 'AMAZON.COM',
    amount: -v(68, 45, s + 50), type: 'debit', category: 'Shopping', account: CRD,
    // June 2025 (mi=1): add a note
    notes: mi === 1 ? 'Standing desk converter + cable organiser' : null,
  }));
  if (mi % 2 === 1) {
    rows.push(tx({ date: d(year, month, 26), description: 'Target', rawDesc: 'TARGET', amount: -v(42, 22, s + 51), type: 'debit', category: 'Shopping', account: CRD }));
  }

  // ── Health & Wellness ──
  rows.push(tx({ date: d(year, month, 16), description: 'City Fitness', rawDesc: 'CITY FITNESS GYM', amount: -48, type: 'debit', category: 'Health & Wellness', account: CRD }));
  if (mi % 3 === 2) {
    rows.push(tx({ date: d(year, month, 24), description: 'Walgreens', rawDesc: 'WALGREENS PHARMACY', amount: -v(32, 15, s + 60), type: 'debit', category: 'Health & Wellness', account: CRD }));
  }

  // ── Entertainment (every even month) ──
  if (mi % 2 === 0 && mi !== TRAVEL_MONTH) {
    rows.push(tx({ date: d(year, month, 20), description: 'Cinema One', rawDesc: 'CINEMA ONE', amount: -v(26, 8, s + 70), type: 'debit', category: 'Entertainment', account: CRD }));
  }

  // ── Travel anomaly — December 2025 (mi=7) ──────────────────────────────────
  if (mi === TRAVEL_MONTH) {
    rows.push(tx({ date: d(year, month, 9),  description: 'Sunrise Airlines',      rawDesc: 'SUNRISE AIRLINES',       amount: -v(585, 90, s + 80), type: 'debit', category: 'Travel',        account: CRD }));
    rows.push(tx({ date: d(year, month, 9),  description: 'Transit Rail',           rawDesc: 'TRANSIT RAIL',           amount: -v(44, 12, s + 81),  type: 'debit', category: 'Transport',     account: CRD }));
    rows.push(tx({ date: d(year, month, 10), description: 'Grand Coastal Hotel',    rawDesc: 'GRAND COASTAL HOTEL',    amount: -v(445, 75, s + 82), type: 'debit', category: 'Travel',        account: CRD }));
    rows.push(tx({ date: d(year, month, 11), description: 'Shore Excursions',       rawDesc: 'SHORE EXCURSIONS',       amount: -v(110, 30, s + 83), type: 'debit', category: 'Entertainment', account: CRD }));
    rows.push(tx({ date: d(year, month, 11), description: 'Seaside Kitchen',        rawDesc: 'SEASIDE KITCHEN',        amount: -v(78, 22, s + 84),  type: 'debit', category: 'Food & Drink', account: CRD }));
    rows.push(tx({ date: d(year, month, 12), description: 'Sunrise Airlines',       rawDesc: 'SUNRISE AIRLINES',       amount: -v(520, 80, s + 85), type: 'debit', category: 'Travel',        account: CRD,
      notes: 'Return flight — holiday trip',
    }));
    rows.push(tx({ date: d(year, month, 13), description: 'Hotel Restaurant',       rawDesc: 'HOTEL RESTAURANT',       amount: -v(62, 20, s + 86),  type: 'debit', category: 'Food & Drink', account: CRD }));
  }
}

// ── Insert transactions ───────────────────────────────────────────────────────

console.log(`Inserting ${rows.length} transactions…`);
db.insert(transactions).values(rows).onConflictDoNothing().run();
console.log(`✓ Transactions done.`);
console.log(`  Final checking balance : $${chkBal.toFixed(2)}`);
console.log(`  Reimbursable flagged   : ${rows.filter(r => r.isReimbursable).length}`);
console.log(`  Transactions with notes: ${rows.filter(r => r.notes).length}`);

// ── Import audit records ──────────────────────────────────────────────────────

const importRecords = [
  { id: randomUUID(), filename: 'demo-checking.csv', account: CHK, rowCount: rows.filter(r => r.account === CHK).length, dupeCount: 0, importedAt: NOW },
  { id: randomUUID(), filename: 'demo-credit.csv',   account: CRD, rowCount: rows.filter(r => r.account === CRD).length, dupeCount: 0, importedAt: NOW },
];
db.insert(imports).values(importRecords).onConflictDoNothing().run();

// ── Category rules ────────────────────────────────────────────────────────────

function ruleId(pattern: string): string {
  return createHash('sha256').update(`seed-rule:${pattern}`).digest('hex').slice(0, 16);
}

const SEED_RULES = [
  { pattern: 'Acme Corp',      category: 'Income',           priority: 10 },
  { pattern: 'Rent Payment',   category: 'Rent',             priority: 10 },
  { pattern: 'Spotify',        category: 'Subscriptions',    priority: 5  },
  { pattern: 'Netflix',        category: 'Subscriptions',    priority: 5  },
  { pattern: 'Amazon Prime',   category: 'Subscriptions',    priority: 5  },
  { pattern: 'Hulu',           category: 'Subscriptions',    priority: 5  },
  { pattern: 'Green Valley',   category: 'Groceries',        priority: 5  },
  { pattern: 'Harvest Co-op',  category: 'Groceries',        priority: 5  },
  { pattern: 'Metro Grocers',  category: 'Groceries',        priority: 5  },
  { pattern: 'Uber',           category: 'Transport',        priority: 5  },
  { pattern: 'Lyft',           category: 'Transport',        priority: 5  },
  { pattern: 'Walgreens',      category: 'Health & Wellness', priority: 5 },
  { pattern: 'City Fitness',   category: 'Health & Wellness', priority: 5 },
  { pattern: 'Sunrise Airlines', category: 'Travel',         priority: 5  },
  { pattern: 'Grand Coastal Hotel', category: 'Travel',      priority: 5  },
  { pattern: 'Cinema One',     category: 'Entertainment',    priority: 5  },
];

const ruleRows = SEED_RULES.map(r => ({
  id:       ruleId(r.pattern),
  pattern:  r.pattern,
  category: r.category,
  priority: r.priority,
}));

console.log(`\nInserting ${ruleRows.length} category rules…`);
db.insert(categoryRules).values(ruleRows).onConflictDoNothing().run();
console.log('✓ Category rules done.');

// ── Summary ───────────────────────────────────────────────────────────────────

const catCounts: Record<string, number> = {};
for (const r of rows) {
  if (r.category) catCounts[r.category] = (catCounts[r.category] ?? 0) + 1;
}

console.log('\n── Seed complete ──────────────────────────────────────────');
console.log(`  Transactions : ${rows.length} (${rows.filter(r => r.account === CHK).length} checking, ${rows.filter(r => r.account === CRD).length} credit)`);
console.log(`  Date range   : ${MONTHS[0].join('-')} → ${MONTHS[MONTHS.length - 1].join('-')}`);
console.log(`  Categories   :`);
for (const [cat, count] of Object.entries(catCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${cat.padEnd(20)} ${count}`);
}
