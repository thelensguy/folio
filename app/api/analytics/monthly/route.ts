import { NextRequest, NextResponse } from 'next/server';
import { getMonthlyCashFlow } from '@/lib/analytics';

// GET /api/analytics/monthly?from=YYYY-MM-DD&to=YYYY-MM-DD&account=
// (also accepts ?months=6 as a shorthand when from/to are not provided)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const account = searchParams.get('account') || undefined;
    let from = searchParams.get('from') || undefined;
    let to   = searchParams.get('to')   || undefined;

    // Fallback: compute from months parameter
    if (!from || !to) {
      const months = Math.max(1, Math.min(60, parseInt(searchParams.get('months') ?? '6', 10) || 6));
      const d = new Date();
      d.setMonth(d.getMonth() - months);
      from = from ?? d.toISOString().slice(0, 10);
      to   = to   ?? new Date().toISOString().slice(0, 10);
    }

    const data = getMonthlyCashFlow(from, to, account || undefined);
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[/api/analytics/monthly]', err);
    return NextResponse.json({ error: 'Failed to fetch monthly cash flow' }, { status: 500 });
  }
}
