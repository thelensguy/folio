# PARSERS.md — CSV Ingestion & Normalization

## Chase CSV Format
Chase exports two slightly different formats depending on account type.

### Checking / Savings
```
Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #
DEBIT,01/15/2024,AMAZON.COM*AB1CD2EF3,-52.99,ACH_DEBIT,1234.56,
```
Columns: `Details`, `Posting Date`, `Description`, `Amount`, `Type`, `Balance`, `Check or Slip #`

### Credit Card
```
Transaction Date,Post Date,Description,Category,Type,Amount,Memo
01/15/2024,01/16/2024,AMAZON.COM*AB1CD2EF3,Shopping,Sale,-52.99,
```
Columns: `Transaction Date`, `Post Date`, `Description`, `Category`, `Type`, `Amount`, `Memo`

## Detection Logic
```ts
// lib/parsers/chase.ts
export function detectChaseFormat(headers: string[]): 'checking' | 'credit' | null {
  if (headers.includes('Posting Date') && headers.includes('Details')) return 'checking';
  if (headers.includes('Transaction Date') && headers.includes('Post Date')) return 'credit';
  return null;
}
```

## Normalized Transaction Shape
```ts
export interface NormalizedTransaction {
  id:          string;   // SHA256(date + description + amount)
  date:        string;   // "YYYY-MM-DD"
  description: string;   // cleaned description
  amount:      number;   // negative = debit, positive = credit
  type:        'debit' | 'credit';
  category:    string | null;
  account:     string;   // passed in from user on upload
  rawDesc:     string;
  importedAt:  number;   // Date.now()
}
```

## Parser Implementation Notes
```ts
import Papa from 'papaparse';
import { createHash } from 'crypto';

function parseDate(raw: string): string {
  // Chase uses MM/DD/YYYY
  const [m, d, y] = raw.split('/');
  return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
}

function makeId(date: string, desc: string, amount: number): string {
  return createHash('sha256')
    .update(`${date}|${desc}|${amount}`)
    .digest('hex')
    .slice(0, 16);
}
```

## API Route: POST /api/upload
1. Receive `multipart/form-data` with `file` (CSV) + `account` (string)
2. Parse with Papaparse (`header: true`, `skipEmptyLines: true`)
3. Detect format → run appropriate normalizer
4. Batch insert with `INSERT OR IGNORE` (dedup by id)
5. Return `{ imported: N, dupes: N, account, filename }`

## Cleaning Rules
- Strip leading/trailing whitespace from all fields
- Remove redundant suffixes: `* `, `#XXXXXXXXX` trailing merchant IDs
- Uppercase → Title Case description
- Skip rows where `Amount` is `0` or empty
