import { NextResponse } from 'next/server';

// GET /api/analytics — returns the list of available analytics sub-routes
export async function GET() {
  return NextResponse.json({
    routes: [
      'GET /api/analytics/monthly?months=6&account=',
      'GET /api/analytics/categories?from=YYYY-MM-DD&to=YYYY-MM-DD&account=',
      'GET /api/analytics/merchants?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=20&account=',
    ],
  });
}
