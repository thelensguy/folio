import { NextRequest, NextResponse } from 'next/server';
import { getTopMerchants } from '@/lib/analytics';
import { nMonthsAgo, today } from '@/lib/utils';

// GET /api/analytics/merchants?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=20&account=
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const from     = searchParams.get('from')     || nMonthsAgo(6);
    const to       = searchParams.get('to')       || today();
    const limit    = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') ?? '20', 10) || 20));
    const account  = searchParams.get('account')  || undefined;
    const category = searchParams.get('category') || undefined;

    if (from > to) {
      return NextResponse.json({ error: '"from" must be before "to"' }, { status: 400 });
    }

    const data = getTopMerchants(from, to, limit, account, category);
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[/api/analytics/merchants]', err);
    return NextResponse.json({ error: 'Failed to fetch top merchants' }, { status: 500 });
  }
}
