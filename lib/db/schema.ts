import { sqliteTable, text, real, integer, index } from 'drizzle-orm/sqlite-core';

export const transactions = sqliteTable('transactions', {
  id:          text('id').primaryKey(),         // SHA256(date+desc+amount) — dedup key
  date:        text('date').notNull(),           // ISO 8601: "2024-01-15"
  description: text('description').notNull(),
  amount:      real('amount').notNull(),         // negative = debit, positive = credit
  type:        text('type').notNull(),           // "debit" | "credit"
  category:    text('category'),                 // normalized category (see ANALYTICS.md)
  account:     text('account').notNull(),        // e.g. "Chase Checking (...1234)"
  rawDesc:     text('raw_desc').notNull(),       // original unmodified description
  importedAt:     integer('imported_at').notNull(),     // Unix timestamp of import
  isReimbursable: integer('is_reimbursable', { mode: 'boolean' }).notNull().default(false),
  notes:          text('notes'),                   // free-text note on this transaction
  balance:        real('balance'),                 // running balance after tx (checking only)
}, (t) => ({
  dateIdx:     index('idx_transactions_date').on(t.date),
  accountIdx:  index('idx_transactions_account').on(t.account),
  categoryIdx: index('idx_transactions_category').on(t.category),
}));

export const imports = sqliteTable('imports', {
  id:         text('id').primaryKey(),          // UUID
  filename:   text('filename').notNull(),
  account:    text('account').notNull(),
  rowCount:   integer('row_count').notNull(),
  dupeCount:  integer('dupe_count').notNull(),
  importedAt: integer('imported_at').notNull(),
});

export const categoryRules = sqliteTable('category_rules', {
  id:       text('id').primaryKey(),
  pattern:  text('pattern').notNull(),  // substring match on description (lowercased)
  category: text('category').notNull(),
  priority: integer('priority').default(0),
});
