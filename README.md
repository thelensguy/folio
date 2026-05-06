# Folio — Personal Finance Dashboard

A local-first personal finance dashboard. Import Chase CSV exports, track spending by category and merchant, and keep everything in a local SQLite database — no accounts, no subscriptions, no cloud sync.

Built as a portfolio project to demonstrate full-stack TypeScript, data normalization, and interactive charting.

## Features

- **CSV import** — drag-and-drop Chase checking and credit card CSV exports; duplicate imports are idempotent
- **Spending by category** — donut chart and sortable table, cross-filterable by month
- **Top merchants** — bar chart of highest-spend merchants, click to drill down
- **Monthly cash flow** — income vs. expenses area chart with 6-month trend or two-month comparison modes
- **Running balance** — checking account balance line chart over time
- **Transaction table** — searchable, paginated, filterable by category / account / date range / merchant
- **Category rules** — define keyword patterns that override auto-categorization; export/import as JSON
- **Reimbursable tracking** — flag transactions for expense reports
- **Transaction notes** — attach free-text notes to any transaction
- **Global search** — instant full-text search across all transaction descriptions

## Quick demo (no real data needed)

```bash
npm install
npm run db:reset-demo
npm run dev
# Open http://localhost:3000
```

`db:reset-demo` wipes the database, recreates the schema, and seeds 12 months of realistic demo transactions across two accounts (checking + credit card).

## Setup with real data

```bash
npm install
mkdir -p data
npx drizzle-kit push      # create the SQLite schema
npm run dev
# Go to /upload and import your Chase CSV exports
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server at http://localhost:3000 |
| `npm run build` | Production build (zero errors, zero type errors) |
| `npm run start` | Run the production build |
| `npm run db:seed` | Seed demo data into an existing database |
| `npm run db:reset-demo` | Wipe database, recreate schema, seed demo data |

## Tech stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.x |
| Language | TypeScript | 5.x |
| Database | SQLite via better-sqlite3 | 12.x |
| ORM / migrations | Drizzle ORM + drizzle-kit | 0.45.x / 0.31.x |
| CSV parsing | papaparse | 5.x |
| Charts | Recharts | 3.x |
| Styling | Tailwind CSS v4 + shadcn/ui | 4.x |
| State management | Zustand | 5.x |
| Data fetching | SWR | 2.x |

## Project structure

```
app/
  api/             API routes (upload, transactions, analytics, category-rules)
  dashboard/       Main dashboard page
  transactions/    Full transaction table
  upload/          CSV upload page
  settings/        Category rules editor + resync tools
lib/
  db/              Drizzle schema, migrations, client singleton
  parsers/         Chase CSV normalizer (checking + credit card formats)
  analytics/       Aggregation query helpers
  types.ts         Shared TypeScript interfaces
components/        Chart and table UI components
store/             Zustand filter state slice
scripts/           seed-demo.ts — demo data generator
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for a detailed walkthrough of data flow, design decisions, and component structure.

## Roadmap

Planned features: budget tracking, recurring detection, spending trends, multi-bank support, Electron wrapper. See [ROADMAP.md](ROADMAP.md).

## License

MIT — see [LICENSE](LICENSE).
