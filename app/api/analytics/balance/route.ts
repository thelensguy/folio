import { NextRequest, NextResponse } from 'next/server';
import { getCheckingBalanceOverTime } from '@/lib/analytics';
import { today, nMonthsAgo } from '@/lib/utils';

// GET /api/analytics/balance?from=&to=
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const from = searchParams.get('from') || nMonthsAgo(6);
    const to   = searchParams.get('to')   || today();

    const result = getCheckingBalanceOverTime(from, to);

    // Hide the card entirely only when no checking account exists at all
    if (!result.hasCheckingAccount) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error('[/api/analytics/balance]', err);
    return NextResponse.json({ error: 'Failed to fetch balance data' }, { status: 500 });
  }
}
