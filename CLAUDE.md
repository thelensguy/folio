# CLAUDE.md — Instructions for Working on This Project

## How to Use These Docs
This project is split into focused `.md` files so Claude loads only what's relevant.
**Always tell Claude which doc(s) to read at the start of a task.**

| Task | Docs to load |
|---|---|
| Add/change DB tables or queries | `PROJECT.md` + `SCHEMA.md` |
| Fix CSV parsing or add a new bank | `PROJECT.md` + `PARSERS.md` |
| Add analytics / change aggregations | `SCHEMA.md` + `ANALYTICS.md` |
| Build or modify UI components | `PROJECT.md` + `UI.md` |
| Add or modify API routes | `API.md` + `SCHEMA.md` |
| Full feature (end-to-end) | All docs |

## Prompt Templates

### Adding a new feature
```
Read PROJECT.md, [relevant docs]. 
Task: [description]
Current file: [path]
Constraint: [any constraints]
```

### Debugging
```
Read [relevant docs].
Bug: [what's broken]
Error: [paste error]
File: [path + relevant code snippet]
```

### Refactor
```
Read [relevant docs].
Refactor [file/function] to [goal].
Keep: [what must not change]
```

## Project Conventions
- All monetary values stored and computed as `number` (float), formatted only at display layer
- Dates: always ISO 8601 strings (`YYYY-MM-DD`) in DB and API, format in UI
- Debit = negative amount, Credit = positive — never invert this
- All DB access goes through `lib/db/client.ts` singleton
- API routes return `{ data: T }` on success, `{ error: string }` on failure
- Component files: PascalCase. Utility files: camelCase. All TypeScript.
- No `any` types — define interfaces in `lib/types.ts`

## Current Status
- [x] Project scaffolded (`npx create-next-app`)
- [x] Dependencies installed
- [x] DB schema created + migrated
- [x] Chase CSV parser implemented
- [x] Upload API route working
- [x] Analytics queries implemented
- [ ] Dashboard UI built
- [ ] Transaction table page built
- [ ] Category edit working

## Install Commands (first time setup)
```bash
npx create-next-app@latest folio --typescript --tailwind --app
cd finance-dashboard
npm install better-sqlite3 drizzle-orm drizzle-kit papaparse recharts zustand
npm install -D @types/better-sqlite3 @types/papaparse
npx shadcn-ui@latest init
npx shadcn-ui@latest add card table badge button select
mkdir -p data lib/db lib/parsers lib/analytics components store
```
