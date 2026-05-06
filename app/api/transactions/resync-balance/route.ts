import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { transactions } from '@/lib/db/schema';
import { parseChaseCSV } from '@/lib/parsers/chase';

// POST /api/transactions/resync-balance
// Body: multipart/form-data { file: CSV }
//
// Re-parses a checking CSV and backfills the balance column on any existing
// transaction that matches by dedup ID but currently has balance IS NULL.
// Safe to run multiple times — skips rows that already have a balance.
export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart/form-data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Missing "file" field' }, { status: 400 });
  }

  const csvText = await file.text();

  // Parse the CSV — account name is irrelevant for ID matching, use a placeholder
  let parsed;
  try {
    parsed = parseChaseCSV(csvText, '__resync__');
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'CSV parse failed' },
      { status: 400 },
    );
  }

  // Keep only rows that have a balance value (checking rows only)
  const withBalance = parsed.filter(tx => tx.balance != null);

  if (!withBalance.length) {
    return NextResponse.json(
      { error: 'No balance data found. Make sure you uploaded a Chase checking CSV (not a credit card CSV).' },
      { status: 400 },
    );
  }

  // UPDATE each matching transaction that still has balance IS NULL
  let updated = 0;
  for (const tx of withBalance) {
    const result = db
      .update(transactions)
      .set({ balance: tx.balance })
      .where(eq(transactions.id, tx.id))
      .run();

    if (result.changes > 0) updated++;
  }

  return NextResponse.json({ data: { updated, total: withBalance.length } });
}
