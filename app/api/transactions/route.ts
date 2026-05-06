import { NextRequest, NextResponse } from 'next/server';
import { and, gte, lte, eq, desc, sql, like } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { transactions } from '@/lib/db/schema';

// GET /api/transactions?page=1&limit=50&from=&to=&category=&account=&search=&merchant=
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const page     = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10) || 1);
    const limit    = Math.max(1, Math.min(200, parseInt(searchParams.get('limit') ?? '50', 10) || 50));
    const from     = searchParams.get('from')     || undefined;
    const to       = searchParams.get('to')       || undefined;
    const category = searchParams.get('category') || undefined;
    const account  = searchParams.get('account')  || undefined;
    const search   = searchParams.get('search')   || undefined;
    const merchant = searchParams.get('merchant') || undefined;

    // For "Uncategorized" we must match both NULL rows (never categorized) and any
    // row that literally has category = 'Uncategorized'. Use a raw SQL fragment
    // because Drizzle's or() can be silently dropped when nested inside and().
    const categoryFilter = category
      ? category === 'Uncategorized'
        ? sql`(${transactions.category} IS NULL OR ${transactions.category} = 'Uncategorized')`
        : eq(transactions.category, category)
      : undefined;

    const where = and(
      from     ? gte(transactions.date, from)                                        : undefined,
      to       ? lte(transactions.date, to)                                          : undefined,
      categoryFilter,
      account  ? eq(transactions.account, account)                                   : undefined,
      merchant ? like(transactions.description, `%${merchant.replace(/%/g, '')}%`)  : undefined,
      search   ? sql`(${transactions.description} LIKE ${`%${search.replace(/%/g, '')}%`} OR ${transactions.notes} LIKE ${`%${search.replace(/%/g, '')}%`})` : undefined,
    );

    // Count total matching rows for pagination metadata
    const [{ total }] = db
      .select({ total: sql<number>`count(*)` })
      .from(transactions)
      .where(where)
      .all();

    const data = db
      .select()
      .from(transactions)
      .where(where)
      .orderBy(desc(transactions.date))
      .limit(limit)
      .offset((page - 1) * limit)
      .all();

    return NextResponse.json({
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('[/api/transactions]', err);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
