# Architecture

## Data flow

```
Chase CSV export
      │
      ▼
POST /api/upload (multipart/form-data: file + account name)
      │
      ├─ Papa.parse() — header: true, skipEmptyLines: true
      │
      ├─ detectChaseFormat(headers)
      │     ├─ 'checking'  →  normalizeCheckingRow()
      │     └─ 'credit'    →  normalizeCreditRow()
      │
      ├─ cleanCheckingDesc / cleanCreditDesc
      │     Strips ACH IDs, exchange-rate suffixes, reference numbers,
      │     date stamps, trailing transaction IDs; title-cases the result.
      │
      ├─ classifySpecialCategory()
      │     Overrides category for transfers and ATM withdrawals before
      │     the Chase-supplied category or auto-categorization runs.
      │
      ├─ makeId() — SHA-256(date|desc|amount) → 16-char hex dedup key
      │
      └─ db.insert(transactions).onConflictDoNothing()
             Idempotent: re-importing the same CSV is safe.
```

## Database

SQLite file at `./data/finance.db` (gitignored). Three tables:

| Table | Purpose |
|---|---|
| `transactions` | One row per transaction. Primary key is a content hash — duplicate imports are silently no-ops. |
| `imports` | Audit log of every CSV upload (filename, account, row count, dupe count). |
| `category_rules` | User-defined pattern → category overrides, evaluated at recategorize time. |

Schema is managed by Drizzle ORM (`lib/db/schema.ts`). The client is a singleton exported from `lib/db/client.ts` — all API routes import from there.

## API routes

All routes live in `app/api/` as Next.js Route Handlers. No authentication — local-only app.

| Route | Method | Purpose |
|---|---|---|
| `/api/upload` | POST | Parse CSV → insert transactions |
| `/api/transactions` | GET | Paginated, filtered transaction list |
| `/api/transactions/[id]` | PATCH | Update category or notes on one transaction |
| `/api/transactions/recategorize` | POST | Re-apply all category rules to existing data |
| `/api/transactions/resync-balance` | POST | Recalculate running balance from transactions |
| `/api/analytics/monthly` | GET | Monthly income / expenses / net |
| `/api/analytics/categories` | GET | Category breakdown for a date range |
| `/api/analytics/merchants` | GET | Top merchants by total spend |
| `/api/analytics/balance` | GET | Running balance over time |
| `/api/analytics/reimbursable` | GET | Transactions flagged as reimbursable |
| `/api/accounts` | GET | Distinct account names from the transactions table |
| `/api/category-rules` | GET, POST | List / create category rules |
| `/api/category-rules/[id]` | PATCH, DELETE | Update / delete a rule |

All routes return `{ data: T }` on success and `{ error: string }` on failure (HTTP 400 / 500).

## Zustand store (`store/index.ts`)

Single `useFilterStore` slice manages all UI filter state. Components read from the store and dispatch actions; SWR hooks use `buildParams(state)` to turn the store into URL query strings.

```
FilterState
├── dateRange        { from, to }   — ISO date strings
├── account          string | null  — null = all accounts
├── activeCategory   string | null  — set by clicking a category chart segment
├── activeMonth      string | null  — set by clicking a monthly bar
├── activeMerchant   string | null  — set by clicking a merchant row
├── searchQuery      string         — global transaction search
├── hideReimbursable boolean
├── chartMode        '6m' | '2m'   — trend vs month-comparison view
└── compareMonth     string | null  — second month for 2m comparison
```

Cross-filtering: clicking a category in the pie chart sets `activeCategory`, which all other charts and the transaction table immediately pick up via SWR revalidation on the new query string.

## Component structure

```
app/dashboard/page.tsx        — layout grid, assembles all chart components
app/transactions/page.tsx     — full transaction table with pagination
app/upload/page.tsx           — drag-and-drop CSV upload UI
app/settings/page.tsx         — category rules editor, import/export, resync

components/
├── FilterBar.tsx             — date range picker + account selector
├── ActiveFiltersBar.tsx      — dismissible chips for active cross-filters
├── StatCard.tsx              — summary number cards (total spend, income, net)
├── SpendingAreaChart.tsx     — monthly income vs expenses area chart
├── BalanceChart.tsx          — running checking balance line chart
├── CategoryPieChart.tsx      — category breakdown donut
├── CategoryBreakdownTable.tsx — sortable category totals table
├── TopMerchantsBarChart.tsx  — horizontal bar chart of top merchants
└── TransactionTable.tsx      — paginated, searchable transaction list
```

## Design decisions

**Content-hash IDs** — Transaction IDs are `SHA-256(date|description|amount)` truncated to 16 chars. This makes re-importing the same CSV perfectly idempotent without a separate deduplication query.

**Synchronous SQLite** — `better-sqlite3` is synchronous, which simplifies code: no `await` on queries, no connection pool, no race conditions. For a single-user local app this is the right trade-off.

**No auth layer** — The app binds to localhost only and stores no credentials. Adding auth would be necessary before any cloud deployment.

**Amounts convention** — Debits are stored as negative numbers (matching Chase's own sign convention). Display code formats them as positive and labels the column; the sign is never inverted in the database.

**Drizzle over raw SQL** — Drizzle gives TypeScript-checked queries and a migration workflow (`drizzle-kit push`) without the overhead of a full ORM. The query builder output is readable enough to audit easily.
