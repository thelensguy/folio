import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { transactions } from '@/lib/db/schema';

// PATCH /api/transactions/:id
// Body: { category?: string | null, isReimbursable?: boolean }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing transaction id' }, { status: 400 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Build the partial update — only touch fields present in the body
    const update: Partial<{ category: string | null; isReimbursable: boolean; notes: string | null }> = {};

    if ('category' in body) {
      const cat = body.category;
      if (cat !== null && typeof cat !== 'string') {
        return NextResponse.json({ error: 'category must be a string or null' }, { status: 400 });
      }
      update.category = typeof cat === 'string' ? cat.trim() || null : null;
    }

    if ('isReimbursable' in body) {
      if (typeof body.isReimbursable !== 'boolean') {
        return NextResponse.json({ error: 'isReimbursable must be a boolean' }, { status: 400 });
      }
      update.isReimbursable = body.isReimbursable;
    }

    if ('notes' in body) {
      const n = body.notes;
      if (n !== null && typeof n !== 'string') {
        return NextResponse.json({ error: 'notes must be a string or null' }, { status: 400 });
      }
      update.notes = typeof n === 'string' ? n.trim() || null : null;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const result = db
      .update(transactions)
      .set(update)
      .where(eq(transactions.id, id))
      .run();

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error('[PATCH /api/transactions/:id]', err);
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
  }
}
