import Papa from 'papaparse';
import { createHash } from 'crypto';
import type { NormalizedTransaction } from '@/lib/types';

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

export function detectChaseFormat(headers: string[]): 'checking' | 'credit' | null {
  if (headers.includes('Posting Date') && headers.includes('Details')) return 'checking';
  if (headers.includes('Transaction Date') && headers.includes('Post Date')) return 'credit';
  return null;
}

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

/** Chase uses MM/DD/YYYY — convert to ISO 8601 */
function parseDate(raw: string): string {
  const [m, d, y] = raw.trim().split('/');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/** Dedup ID: first 16 hex chars of SHA-256(date|desc|amount) */
function makeId(date: string, desc: string, amount: number): string {
  return createHash('sha256')
    .update(`${date}|${desc}|${amount}`)
    .digest('hex')
    .slice(0, 16);
}

function toTitleCase(s: string): string {
  // Capitalise the char after start-of-string, whitespace, or common separators
  return s.toLowerCase().replace(/(^|[\s\-*/])(\S)/g, (_, sep, ch) => sep + ch.toUpperCase());
}

// ---------------------------------------------------------------------------
// Special category classification
//
// Called with the CLEANED description (after running through cleanCheckingDesc /
// cleanCreditDesc) plus the raw CSV Type field where available.
//
// Returns 'Transfer' | 'Cash' | null.  Null means no special override — the
// row falls through to the normal auto-category or Chase-supplied category.
// ---------------------------------------------------------------------------

/** Patterns that identify inter-account transfers / card payments (case-insensitive). */
const TRANSFER_PATTERNS: RegExp[] = [
  /payment\s+to\s+chase\s+card/i,
  /chase\s+credit\s+crd\s+autopay/i,
  /automatic\s+payment/i,
  /payment\s+thank\s+you/i,
  /online\s+transfer/i,
  /account\s+transfer/i,
];

/** Patterns that identify ATM cash withdrawals (case-insensitive). */
const ATM_PATTERNS: RegExp[] = [
  /non-chase\s+atm\s+withdraw/i,
  /atm\s+withdrawal/i,
];

/**
 * Determines if a transaction is an internal transfer or ATM withdrawal based
 * on the cleaned description and, for credit cards, the raw Type column value.
 *
 * @param cleanedDesc  - Description after format-specific cleaning
 * @param creditType   - Raw `Type` field from a credit-card row ("Payment", "Sale", etc.)
 */
function classifySpecialCategory(
  cleanedDesc: string,
  creditType?: string,
): 'Transfer' | 'Cash' | null {
  // Credit card payments are identified by their Type column
  if (creditType === 'Payment') return 'Transfer';

  for (const p of TRANSFER_PATTERNS) {
    if (p.test(cleanedDesc)) return 'Transfer';
  }
  for (const p of ATM_PATTERNS) {
    if (p.test(cleanedDesc)) return 'Cash';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Checking description cleaning
//
// Example raw descriptions from Chase checking exports:
//   "EMPLOYER INC      PAYROLLJNL                 PPD ID: X123456789"
//   "PAYPAL           INST XFER  JOHN DOE         WEB ID: PAYPALSI77"
//   "MPOS*MERCHANT NAME 4                         03/16 VND  432390 X 0.000038 (EXCHG RTE)"
//   "NON-CHASE ATM WITHDRAW               444826  03/01CT MARKET  VND  5000000 X 0.000038 (EXCHG RTE)"
//   "Zelle payment from JANE DOE 12345678901"
//   "Zelle payment to JOHN SMITH JPM99xxxxxxx"
//   "Online Transfer from CHK ...1234 transaction#: 12345678901"
//   "GROCERY STORE #57 90 CITY STATE CA   522714  05/27"
// ---------------------------------------------------------------------------

function cleanCheckingDesc(raw: string): string {
  let s = raw;

  // 1. Strip exchange rate suffix — handles both:
  //    "03/16 Dong 432390 X 0.000037998 (EXCHG RTE)"  (with leading date)
  //    "Dong 5000000 X 0.000038285 (EXCHG RTE)"        (without leading date)
  s = s.replace(/\s+(?:\d{2}\/\d{2}\s+)?\w+\s+\d[\d,]*\s+X\s+[\d.]+\s+\(EXCHG RTE\)$/, '');

  // 2. Strip ACH identifiers: "PPD ID: B933629535", "WEB ID: PAYPALSI77", "TEL ID: 2131623829"
  s = s.replace(/\s+(?:PPD|WEB|TEL)\s+ID:\s*\S+/gi, '');

  // 3. Strip "transaction#: NNNN" in Online Transfer descriptions
  s = s.replace(/\s+transaction#:\s*\d+/gi, '');

  // 4. Strip Zelle Chase-side tracking codes (e.g. "JPM99b2dxouz")
  s = s.replace(/\s+JPM\w+$/i, '');

  // 5. Strip trailing standalone 10+ digit transaction IDs (Zelle, Quickpay)
  s = s.replace(/\s+\d{10,}$/, '');

  // 6. Strip trailing MM/DD date stamps (e.g. "DLR CANDY PALACE ANAHEIM CA  05/12")
  s = s.replace(/\s+\d{2}\/\d{2}$/, '');

  // 7. Strip trailing standalone 6+ digit reference numbers (DEBIT_CARD refs)
  s = s.replace(/\s+\d{6,}$/, '');

  // 8. Fix date+merchant concatenation that Chase sometimes produces without a space
  //    e.g. "444826  03/01CT LOTTE" → "444826  03/01 CT LOTTE"
  s = s.replace(/(\d{2}\/\d{2})([A-Za-z])/g, '$1 $2');

  // 9. Collapse internal runs of whitespace; strip leading/trailing
  s = s.replace(/\s{2,}/g, ' ').trim();

  // 10. Title-case
  return toTitleCase(s);
}

// ---------------------------------------------------------------------------
// Credit card description cleaning
// Credit card descriptions are already clean merchant names — just normalise case
// ---------------------------------------------------------------------------

function cleanCreditDesc(raw: string): string {
  return toTitleCase(raw.trim());
}

// ---------------------------------------------------------------------------
// Per-format row normalisers
// ---------------------------------------------------------------------------

interface CheckingRow {
  Details: string;
  'Posting Date': string;
  Description: string;
  Amount: string;
  Type: string;
  Balance: string;
  'Check or Slip #': string;
}

function normalizeCheckingRow(
  row: CheckingRow,
  account: string,
  importedAt: number,
): NormalizedTransaction | null {
  const amountRaw = row.Amount?.trim();
  if (!amountRaw) return null;

  const amount = parseFloat(amountRaw);
  if (!isFinite(amount) || amount === 0) return null;

  const date    = parseDate(row['Posting Date']);
  const rawDesc = row.Description?.trim() ?? '';
  const description = cleanCheckingDesc(rawDesc);
  const type: 'debit' | 'credit' = amount < 0 ? 'debit' : 'credit';

  const category = classifySpecialCategory(description);
  const balanceRaw = row.Balance?.trim();
  const balance = balanceRaw ? parseFloat(balanceRaw) : null;

  return {
    id: makeId(date, description, amount),
    date,
    description,
    amount,
    type,
    category,
    account,
    rawDesc,
    importedAt,
    balance: balance !== null && isFinite(balance) ? balance : null,
  };
}

interface CreditRow {
  'Transaction Date': string;
  'Post Date': string;
  Description: string;
  Category: string;
  Type: string;
  Amount: string;
  Memo: string;
}

function normalizeCreditRow(
  row: CreditRow,
  account: string,
  importedAt: number,
): NormalizedTransaction | null {
  const amountRaw = row.Amount?.trim();
  if (!amountRaw) return null;

  const amount = parseFloat(amountRaw);
  if (!isFinite(amount) || amount === 0) return null;

  // Use Transaction Date, not Post Date
  const date    = parseDate(row['Transaction Date']);
  const rawDesc = row.Description?.trim() ?? '';
  const description = cleanCreditDesc(rawDesc);
  const type: 'debit' | 'credit' = amount < 0 ? 'debit' : 'credit';
  // Use special classification first; fall back to Chase's own Category field
  const specialCategory = classifySpecialCategory(description, row.Type?.trim());
  const category = specialCategory ?? (row.Category?.trim() || null);

  return {
    id: makeId(date, description, amount),
    date,
    description,
    amount,
    type,
    category,
    account,
    rawDesc,
    importedAt,
    balance: null,  // credit card CSV has no balance column
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function parseChaseCSV(csvText: string, account: string): NormalizedTransaction[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header:         true,
    skipEmptyLines: true,
  });

  if (!result.data.length) return [];

  const headers = Object.keys(result.data[0]);
  const format  = detectChaseFormat(headers);

  if (!format) {
    throw new Error(`Unrecognised Chase CSV format. Headers found: ${headers.join(', ')}`);
  }

  const importedAt = Date.now();
  const normalized: NormalizedTransaction[] = [];

  for (const row of result.data) {
    let tx: NormalizedTransaction | null = null;

    if (format === 'checking') {
      tx = normalizeCheckingRow(row as unknown as CheckingRow, account, importedAt);
    } else {
      tx = normalizeCreditRow(row as unknown as CreditRow, account, importedAt);
    }

    if (tx) normalized.push(tx);
  }

  return normalized;
}
