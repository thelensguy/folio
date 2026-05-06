import { NextRequest, NextResponse } from 'next/server';
import { getPendingReimbursable } from '@/lib/analytics';

// GET /api/analytics/reimbursable?from=&to=&account=
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const from    = searchParams.get('from')    || undefined;
    const to      = searchParams.get('to')      || undefined;
    const account = searchParams.get('account') || undefined;

    const data = getPendingReimbursable(from, to, account || undefined);
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[/api/analytics/reimbursable]', err);
    return NextResponse.json({ error: 'Failed to fetch reimbursable total' }, { status: 500 });
  }
}
