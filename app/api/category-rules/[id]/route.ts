import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { categoryRules } from '@/lib/db/schema';

// PATCH /api/category-rules/:id
// Body: { pattern?: string; category?: string; priority?: number }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const update: Partial<{ pattern: string; category: string; priority: number }> = {};

    if ('pattern' in body) {
      const p = typeof body.pattern === 'string' ? body.pattern.trim() : '';
      if (!p) return NextResponse.json({ error: 'pattern cannot be empty' }, { status: 400 });
      update.pattern = p;
    }
    if ('category' in body) {
      const c = typeof body.category === 'string' ? body.category.trim() : '';
      if (!c) return NextResponse.json({ error: 'category cannot be empty' }, { status: 400 });
      update.category = c;
    }
    if ('priority' in body) {
      if (typeof body.priority !== 'number') {
        return NextResponse.json({ error: 'priority must be a number' }, { status: 400 });
      }
      update.priority = Math.floor(body.priority);
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const result = db.update(categoryRules).set(update).where(eq(categoryRules.id, id)).run();
    if (result.changes === 0) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error('[PATCH /api/category-rules/:id]', err);
    return NextResponse.json({ error: 'Failed to update rule' }, { status: 500 });
  }
}

// DELETE /api/category-rules/:id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const result = db.delete(categoryRules).where(eq(categoryRules.id, id)).run();
    if (result.changes === 0) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error('[DELETE /api/category-rules/:id]', err);
    return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 });
  }
}
