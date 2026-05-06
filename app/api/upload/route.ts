import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { transactions, imports } from '@/lib/db/schema';
import { parseChaseCSV } from '@/lib/parsers/chase';
import type { UploadResult } from '@/lib/types';

export async function POST(request: NextRequest) {
  // ── 1. Parse multipart form data ─────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart/form-data' }, { status: 400 });
  }

  const file    = formData.get('file');
  const account = formData.get('account');

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Missing "file" field' }, { status: 400 });
  }
  if (!account || typeof account !== 'string' || !account.trim()) {
    return NextResponse.json({ error: 'Missing "account" field' }, { status: 400 });
  }

  const filename    = file.name;
  const accountName = account.trim();
  const csvText     = await file.text();

  // ── 2. Parse & normalise rows ─────────────────────────────────────────────
  let normalized;
  try {
    normalized = parseChaseCSV(csvText, accountName);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'CSV parse failed' },
      { status: 400 },
    );
  }

  if (!normalized.length) {
    return NextResponse.json<{ data: UploadResult }>({
      data: { imported: 0, dupes: 0, account: accountName, filename },
    });
  }

  // ── 3. Deduplicate within the file (same ID can appear if two rows hash identically) ──
  const uniqueMap = new Map(normalized.map(tx => [tx.id, tx]));
  const unique    = Array.from(uniqueMap.values());

  // ── 4. Find IDs already in the DB ────────────────────────────────────────
  const allIds = unique.map(tx => tx.id);
  const existingIds = new Set(
    db.select({ id: transactions.id })
      .from(transactions)
      .where(inArray(transactions.id, allIds))
      .all()
      .map(r => r.id),
  );

  const newRows = unique.filter(tx => !existingIds.has(tx.id));
  const imported = newRows.length;
  // Dupes = every row (including intra-file dupes) that wasn't inserted
  const dupes = normalized.length - imported;

  // ── 5. INSERT new rows ────────────────────────────────────────────────────
  if (newRows.length > 0) {
    db.insert(transactions).values(newRows).run();
  }

  // ── 6. Audit log ──────────────────────────────────────────────────────────
  db.insert(imports).values({
    id:         randomUUID(),
    filename,
    account:    accountName,
    rowCount:   normalized.length,
    dupeCount:  dupes,
    importedAt: Date.now(),
  }).run();

  // ── 7. Respond ────────────────────────────────────────────────────────────
  return NextResponse.json<{ data: UploadResult }>({
    data: { imported, dupes, account: accountName, filename },
  });
}
