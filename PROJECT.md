# Folio — Project Overview

## Goal
Local-first personal finance dashboard. Ingest Chase CSV exports → parse & normalize → store in SQLite → analytics + UI.

## Stack
| Layer | Technology | Reason |
|---|---|---|
| Framework | Next.js 16 (App Router) | Fullstack, no separate server, easy Electron migration |
| Language | TypeScript | Type safety for financial data |
| Database | SQLite via `better-sqlite3` | Local file, zero infra, fast queries |
| ORM/Query | Drizzle ORM | Lightweight, TypeScript-first, works with better-sqlite3 |
| CSV Parsing | `papaparse` | Battle-tested, streaming support |
| Charts | Recharts | React-native, composable, good finance primitives |
| Styling | Tailwind CSS + shadcn/ui | Rapid UI, accessible components |
| State | Zustand | Simple client state (filters, date ranges) |

## Future Migration Path
- **Electron wrapper**: Replace Next.js dev server with `next build` + Electron's `loadFile`. SQLite stays identical.
- **Cloud sync** (optional later): Replace `better-sqlite3` with Turso (libSQL) — same Drizzle ORM, no other changes.

## Repo Structure
```
/
├── app/                    # Next.js App Router pages + API routes
│   ├── api/
│   │   ├── upload/         # POST: receive CSV, parse, insert to DB
│   │   ├── transactions/   # GET: query transactions with filters
│   │   └── analytics/      # GET: aggregated analytics data
│   ├── dashboard/          # Main dashboard page
│   └── upload/             # CSV upload page
├── lib/
│   ├── db/                 # Drizzle schema + client singleton
│   ├── parsers/            # Chase CSV normalizer
│   └── analytics/          # Aggregation logic (pure functions)
├── components/             # UI components (charts, tables, filters)
├── store/                  # Zustand slices
└── *.md                    # Project docs (ARCHITECTURE, ROADMAP, etc.)
```

## Key Docs (load only what you need)
| File | When to load |
|---|---|
| `SCHEMA.md` | Working on DB schema, migrations, Drizzle queries |
| `PARSERS.md` | Working on CSV ingestion or normalization logic |
| `ANALYTICS.md` | Working on aggregation, categories, spending logic |
| `UI.md` | Working on components, charts, pages, styling |
| `API.md` | Working on Next.js API routes |
