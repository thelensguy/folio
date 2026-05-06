import { NextRequest, NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db/client';
import { categoryRules } from '@/lib/db/schema';

// GET /api/category-rules — list all rules ordered by priority desc
export async function GET() {
  try {
    const rules = db
      .select()
      .from(categoryRules)
      .orderBy(desc(categoryRules.priority))
      .all();
    return NextResponse.json({ data: rules });
  } catch (err) {
    console.error('[GET /api/category-rules]', err);
    return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 });
  }
}

// POST /api/category-rules — create a rule
// Body: { pattern: string; category: string; priority?: number }
export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const pattern  = typeof body.pattern  === 'string' ? body.pattern.trim()  : '';
    const category = typeof body.category === 'string' ? body.category.trim() : '';
    const priority = typeof body.priority === 'number' ? Math.floor(body.priority) : 0;

    if (!pattern)  return NextResponse.json({ error: 'pattern is required' },  { status: 400 });
    if (!category) return NextResponse.json({ error: 'category is required' }, { status: 400 });

    const id = randomUUID();
    db.insert(categoryRules).values({ id, pattern, category, priority }).run();

    const rule = db.select().from(categoryRules).all().find(r => r.id === id);
    return NextResponse.json({ data: rule }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/category-rules]', err);
    return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 });
  }
}
