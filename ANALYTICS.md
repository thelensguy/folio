# ANALYTICS.md — Aggregation & Categorization

## Auto-Categorization
Applied during normalization if no user rule matches (see SCHEMA.md `category_rules`).

```ts
// lib/analytics/categorize.ts
const RULES: [RegExp, string][] = [
  [/amazon|amzn/i,                  'Shopping'],
  [/uber|lyft|taxi/i,               'Transport'],
  [/starbucks|coffee|cafe/i,        'Coffee'],
  [/doordash|grubhub|ubereats/i,    'Food Delivery'],
  [/netflix|spotify|hulu|disney/i,  'Subscriptions'],
  [/wholefds|safeway|kroger|trader/i,'Groceries'],
  [/shell|chevron|bp|exxon|arco/i,  'Gas'],
  [/cvs|walgreens|pharmacy/i,       'Health'],
  [/venmo|zelle|transfer/i,         'Transfer'],
  [/payroll|direct dep/i,           'Income'],
  [/rent|apartment|property/i,      'Rent'],
  [/insurance/i,                    'Insurance'],
  [/restaurant|grill|kitchen|eatery/i, 'Dining'],
];

export function autoCategory(description: string): string {
  for (const [pattern, cat] of RULES) {
    if (pattern.test(description)) return cat;
  }
  return 'Other';
}
```

## Analytics Queries

### Monthly Spending by Category
```ts
// Returns { month: "2024-01", category: "Groceries", total: 342.50 }[]
db.select({
  month: sql<string>`strftime('%Y-%m', date)`,
  category: transactions.category,
  total: sql<number>`SUM(ABS(amount))`,
})
.from(transactions)
.where(lt(transactions.amount, 0))  // debits only
.groupBy(sql`1, 2`)
.orderBy(sql`1, 3 desc`)
```

### Monthly Net Cash Flow
```ts
// Returns { month, income, expenses, net }[]
db.select({
  month: sql<string>`strftime('%Y-%m', date)`,
  income:   sql<number>`SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END)`,
  expenses: sql<number>`SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END)`,
  net:      sql<number>`SUM(amount)`,
})
.from(transactions)
.groupBy(sql`1`)
.orderBy(sql`1`)
```

### Top Merchants by Spend
```ts
db.select({
  description: transactions.description,
  total: sql<number>`SUM(ABS(amount))`,
  count: sql<number>`COUNT(*)`,
})
.from(transactions)
.where(lt(transactions.amount, 0))
.groupBy(transactions.description)
.orderBy(sql`2 desc`)
.limit(20)
```

### Recurring Transactions (subscription detection)
Logic: description appears ≥ 2x, amounts within ±5%, 25–35 day intervals.

## API Endpoints
| Route | Params | Returns |
|---|---|---|
| `GET /api/analytics/monthly` | `?months=6&account=` | Monthly income/expense/net |
| `GET /api/analytics/categories` | `?from=&to=&account=` | Category breakdown |
| `GET /api/analytics/merchants` | `?from=&to=&limit=20` | Top merchants |
| `GET /api/transactions` | `?page=&limit=&category=&from=&to=` | Paginated transactions |

## Date Range Defaults
- Default view: last 6 months
- All dates as ISO strings in query params: `?from=2024-01-01&to=2024-06-30`
