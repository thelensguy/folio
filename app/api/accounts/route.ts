import { NextResponse } from 'next/server';
import { getAccounts } from '@/lib/analytics';

// GET /api/accounts
export async function GET() {
  try {
    const data = getAccounts();
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[/api/accounts]', err);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}
