# UI.md — Components, Charts & Pages

## Stack
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui (Button, Card, Table, Select, DatePicker, Badge)
- **Charts**: Recharts
- **State**: Zustand (filter store)

## Pages
| Route | Component | Purpose |
|---|---|---|
| `/` | Redirect to `/dashboard` | — |
| `/dashboard` | `DashboardPage` | Main analytics view |
| `/transactions` | `TransactionsPage` | Full transaction table with filters |
| `/upload` | `UploadPage` | CSV drag-and-drop import |
| `/settings` | `SettingsPage` | Category rules, account names |

## Filter Store (Zustand)
```ts
// store/filters.ts
interface FilterStore {
  dateRange: { from: string; to: string };
  account: string | null;
  category: string | null;
  setDateRange: (from: string, to: string) => void;
  setAccount: (a: string | null) => void;
  setCategory: (c: string | null) => void;
}
```

## Chart Components

### `<SpendingAreaChart />`
- Recharts `AreaChart` + `ComposedChart`
- X-axis: months, Y-axis: dollars
- Two areas: Income (green) + Expenses (red)
- Props: `data: { month, income, expenses }[]`

### `<CategoryPieChart />`
- Recharts `PieChart` + `Cell` per category
- Custom legend with dollar amounts
- Props: `data: { category, total }[]`

### `<MerchantBarChart />`
- Recharts `BarChart` horizontal
- Top 10 merchants by spend
- Props: `data: { description, total }[]`

### `<NetFlowLineChart />`
- Recharts `LineChart`
- Single line: net cash flow per month
- Reference line at 0
- Props: `data: { month, net }[]`

## Key UI Components

### `<TransactionTable />`
- shadcn/ui `Table`
- Columns: Date, Description, Category (badge), Amount (colored), Account
- Client-side sort, server-side pagination
- Row click → edit category inline

### `<UploadDropzone />`
- Drag-and-drop + file picker
- Shows parse preview (first 5 rows) before confirming import
- Account name input field
- Progress state: idle → parsing → inserting → done/error

### `<StatCard />`
```ts
// components/StatCard.tsx
interface StatCardProps {
  label: string;
  value: string;        // formatted: "$1,234.56"
  delta?: string;       // "+12% vs last month"
  deltaDir?: 'up' | 'down' | 'neutral';
}
```

## Dashboard Layout
```
┌─────────────────────────────────────────┐
│  [Date Range]  [Account Filter]         │  ← filter bar
├──────────┬──────────┬────────┬──────────┤
│ Income   │ Expenses │  Net   │ Top Cat  │  ← 4x StatCard
├──────────┴──────────┴────────┴──────────┤
│         SpendingAreaChart (full width)  │
├─────────────────┬───────────────────────┤
│ CategoryPie     │  MerchantBar          │
└─────────────────┴───────────────────────┘
```

## Recharts Tips
- Always wrap in `<ResponsiveContainer width="100%" height={300}>`
- Use `tickFormatter={(v) => `$${v.toLocaleString()}`}` for currency axes
- `<Tooltip formatter={(v) => [`$${v.toFixed(2)}`, '']} />`
