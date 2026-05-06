import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { transactions, categoryRules } from '@/lib/db/schema';

// POST /api/transactions/recategorize
// Applies all category rules (by priority desc) to every transaction.
// Updates the category where a rule matches and the category has changed.
// Returns { updated: N }
export async function POST() {
  try {
    // Load rules once — ordered highest priority first
    const rules = db
      .select()
      .from(categoryRules)
      .orderBy(desc(categoryRules.priority))
      .all();

    // Load all transactions
    const txs = db.select().from(transactions).all();

    let updated = 0;

    for (const tx of txs) {
      const lower = tx.description.toLowerCase();
      let matched: string | null = null;

      for (const rule of rules) {
        if (lower.includes(rule.pattern.toLowerCase())) {
          matched = rule.category;
          break;
        }
      }

      if (matched !== null && matched !== tx.category) {
        db.update(transactions)
          .set({ category: matched })
          .where(eq(transactions.id, tx.id))
          .run();
        updated++;
      }
    }

    return NextResponse.json({ data: { updated } });
  } catch (err) {
    console.error('[POST /api/transactions/recategorize]', err);
    return NextResponse.json({ error: 'Recategorization failed' }, { status: 500 });
  }
}
