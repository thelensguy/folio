import { NextRequest, NextResponse } from 'next/server';
import { getCategoryBreakdown } from '@/lib/analytics';
import { nMonthsAgo, today } from '@/lib/utils';

// GET /api/analytics/categories?from=YYYY-MM-DD&to=YYYY-MM-DD&account=
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    // Default: last 6 months
    const from    = searchParams.get('from')    || nMonthsAgo(6);
    const to      = searchParams.get('to')      || today();
    const account = searchParams.get('account') || undefined;

    if (from > to) {
      return NextResponse.json({ error: '"from" must be before "to"' }, { status: 400 });
    }

    const data = getCategoryBreakdown(from, to, account || undefined);
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[/api/analytics/categories]', err);
    return NextResponse.json({ error: 'Failed to fetch category breakdown' }, { status: 500 });
  }
}
