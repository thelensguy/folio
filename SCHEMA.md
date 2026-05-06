# SCHEMA.md — Database Layer

## Stack
- **Driver**: `better-sqlite3` (synchronous, no async overhead)
- **ORM**: Drizzle ORM (`drizzle-orm`, `drizzle-kit`)
- **DB file location**: `./data/finance.db` (gitignored)

## Tables

### `transactions`
Core table. One row per Chase transaction.

```ts
import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';

export const transactions = sqliteTable('transactions', {
  id:          text('id').primaryKey(),          // SHA256(date+desc+amount) — dedup key
  date:        text('date').notNull(),            // ISO 8601: "2024-01-15"
  description: text('description').notNull(),
  amount:      real('amount').notNull(),          // negative = debit, positive = credit
  type:        text('type').notNull(),            // "debit" | "credit"
  category:    text('category'),                  // normalized category (see ANALYTICS.md)
  account:     text('account').notNull(),         // e.g. "Chase Checking (...1234)"
  rawDesc:     text('raw_desc').notNull(),        // original unmodified description
  importedAt:  integer('imported_at').notNull(),  // Unix timestamp of import
});
```

### `imports`
Audit log of every CSV upload.

```ts
export const imports = sqliteTable('imports', {
  id:         text('id').primaryKey(),           // UUID
  filename:   text('filename').notNull(),
  account:    text('account').notNull(),
  rowCount:   integer('row_count').notNull(),
  dupeCount:  integer('dupe_count').notNull(),
  importedAt: integer('imported_at').notNull(),
});
```

### `category_rules`
User-defined override rules. Evaluated before auto-categorization.

```ts
export const categoryRules = sqliteTable('category_rules', {
  id:       text('id').primaryKey(),
  pattern:  text('pattern').notNull(),  // substring match on description (lowercased)
  category: text('category').notNull(),
  priority: integer('priority').default(0),
});
```

## DB Client Singleton
```ts
// lib/db/client.ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const sqlite = new Database('./data/finance.db');
export const db = drizzle(sqlite);
```

## Drizzle Config
```ts
// drizzle.config.ts
export default {
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  driver: 'better-sqlite',
  dbCredentials: { url: './data/finance.db' },
};
```

## Indexes to Add
```sql
CREATE INDEX idx_transactions_date     ON transactions(date);
CREATE INDEX idx_transactions_account  ON transactions(account);
CREATE INDEX idx_transactions_category ON transactions(category);
```

## Notes
- `id` is a content hash → inserting duplicates silently no-ops (use `INSERT OR IGNORE`)
- All dates stored as ISO strings (SQLite has no date type)
- Amounts: Chase debits are negative in their CSV; preserve sign convention
