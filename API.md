# API.md — Next.js API Routes

## Location
All routes live in `app/api/` using Next.js 14 Route Handlers.

## Auth
No auth — local-only app. All routes are unprotected.

## Routes

### POST /api/upload
**Purpose**: Receive CSV file, parse, deduplicate, insert transactions.

```ts
// app/api/upload/route.ts
export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get('file') as File;
  const account = form.get('account') as string;
  // 1. Read file text
  // 2. Papaparse with header:true
  // 3. detectChaseFormat(headers)
  // 4. normalize rows → NormalizedTransaction[]
  // 5. db batch INSERT OR IGNORE
  // 6. Insert import log row
  return Response.json({ imported, dupes, account, filename });
}
```

### GET /api/transactions
**Purpose**: Paginated, filtered transaction list.

Query params: `page` (default 1), `limit` (default 50), `from`, `to`, `category`, `account`, `search`

```ts
// Returns:
{
  data: Transaction[],
  total: number,
  page: number,
  totalPages: number
}
```

### GET /api/analytics/monthly
Query params: `months` (default 6), `account`

```ts
// Returns:
{ data: { month: string, income: number, expenses: number, net: number }[] }
```

### GET /api/analytics/categories
Query params: `from`, `to`, `account`

```ts
// Returns:
{ data: { category: string, total: number, count: number }[] }
```

### GET /api/analytics/merchants
Query params: `from`, `to`, `limit` (default 20), `account`

```ts
// Returns:
{ data: { description: string, total: number, count: number }[] }
```

### PATCH /api/transactions/:id
**Purpose**: Update category on a single transaction.

```ts
// Body: { category: string }
// Returns: { success: true }
```

### GET /api/accounts
**Purpose**: List distinct account names from transactions table.

```ts
// Returns: { data: string[] }
```

## Error Format
All errors return:
```ts
{ error: string, details?: string }
// HTTP 400 for bad input, 500 for server errors
```

## Data Fetching on Client
Use native `fetch` in React Server Components where possible.
For interactive/filtered views, use `useSWR` with query string built from Zustand filter store.

```ts
// Pattern for client components
const { data } = useSWR(
  `/api/analytics/categories?from=${filters.from}&to=${filters.to}`,
  fetcher
);
```
