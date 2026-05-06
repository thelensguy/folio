# Roadmap

Planned features, roughly in priority order.

## In progress / next up

### Budget tracking
- Set monthly spending limits per category
- Visual progress bars on the dashboard (spent vs. budget)
- Alert when a category crosses 80% / 100% of budget

### Recurring detection
- Automatically identify subscriptions and recurring charges
- Flag transactions that appear on consistent intervals (±3 days, ±5% amount)
- Dedicated "Subscriptions" view showing monthly cost and last-charged date

## Planned

### Spending trends
- Month-over-month comparison for any category or merchant
- Year-over-year view
- Anomaly highlighting (e.g. December travel spike vs. baseline)

### Net worth tracking *(partially shipped)*
- Manual entry for assets (brokerage, savings, retirement accounts)
- Track liability balances (outstanding credit card, loans)
- Net worth over time chart

### CSV export
- Export filtered transaction view to CSV
- Export category summaries to CSV

### Multi-bank support
- Bank of America CSV format
- Wells Fargo CSV format
- Generic OFX/QFX import

### Electron wrapper
- Package as a native desktop app (no browser required)
- Auto-start on login option
- Single binary distribution

## Stretch goals

### Cloud sync (opt-in)
- Replace `better-sqlite3` with Turso (libSQL) — same Drizzle ORM, no other changes
- End-to-end encrypted sync across devices

### AI categorization
- Use a local LLM (Ollama) to categorize uncategorized transactions
- Confidence scores + easy correction flow
