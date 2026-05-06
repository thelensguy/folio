'use client';
import { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import FilterBar from '@/components/FilterBar';
import ActiveFiltersBar from '@/components/ActiveFiltersBar';
import StatCard from '@/components/StatCard';
import SpendingAreaChart from '@/components/SpendingAreaChart';
import CategoryPieChart from '@/components/CategoryPieChart';
import CategoryBreakdownTable from '@/components/CategoryBreakdownTable';
import TopMerchantsBarChart from '@/components/TopMerchantsBarChart';
import TransactionTable from '@/components/TransactionTable';
import BalanceChart from '@/components/BalanceChart';
import { useFilterStore, buildParams } from '@/store';
import { fetcher } from '@/lib/utils';

const PAGE_SIZE = 25;

interface MonthlyRow   { month: string; income: number; expenses: number; net: number }
interface CategoryRow  { category: string; total: number; count: number }
interface MerchantRow  { description: string; total: number; count: number }
interface TxRow {
  id: string; date: string; description: string; amount: number;
  type: string; category: string | null; account: string;
  rawDesc: string; importedAt: number; isReimbursable: boolean; notes: string | null;
}

interface BalanceData {
  hasCheckingAccount: boolean;
  current:            number | null;
  delta30d:           number | null;
  history:            { date: string; balance: number }[];
}

export default function DashboardPage() {
  const store = useFilterStore();
  const { chartMode, setChartMode, activeCategory, setCategory, activeMerchant, setMerchant, dateRange } = store;

  const [txPage, setTxPage] = useState(1);
  const [balanceExpanded, setBalanceExpanded] = useState(false);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setTxPage(1);
  }, [store.dateRange.from, store.dateRange.to, store.account, activeCategory, activeMerchant, store.searchQuery]);

  const baseParams = buildParams(store);
  const txParams   = buildParams(store, { page: String(txPage), limit: String(PAGE_SIZE) });

  const { data: monthly }    = useSWR(`/api/analytics/monthly?${baseParams}`, fetcher);
  const { data: categories } = useSWR(`/api/analytics/categories?${baseParams}`, fetcher);
  const { data: merchants }  = useSWR(`/api/analytics/merchants?${baseParams}`, fetcher);
  const { data: txResponse } = useSWR(`/api/transactions?${txParams}`, fetcher);
  const { data: reimb }      = useSWR(`/api/analytics/reimbursable?${baseParams}`, fetcher);
  const { data: balanceResp } = useSWR(`/api/analytics/balance?${baseParams}`, fetcher);

  const monthlyRows:  MonthlyRow[]  = monthly?.data    ?? [];
  const categoryRows: CategoryRow[] = categories?.data ?? [];
  const merchantRows: MerchantRow[] = merchants?.data  ?? [];
  const txRows:       TxRow[]       = txResponse?.data ?? [];
  const txTotal:      number        = txResponse?.total      ?? 0;
  const txTotalPages: number        = txResponse?.totalPages ?? 1;

  // Period totals
  const totalExpenses = monthlyRows.reduce((s, r) => s + r.expenses, 0);
  const totalIncome   = monthlyRows.reduce((s, r) => s + r.income,   0);
  const netFlow       = totalIncome - totalExpenses;
  const reimbTotal: number = reimb?.data?.total ?? 0;
  const reimbCount: number = reimb?.data?.count ?? 0;
  const balanceData: BalanceData | null = balanceResp?.data ?? null;

  // Month-over-month deltas (compare last two months in range) — absolute currency change
  const last = monthlyRows[monthlyRows.length - 1];
  const prev = monthlyRows[monthlyRows.length - 2];
  const expDelta: number | undefined = last && prev ? last.expenses - prev.expenses : undefined;
  const incDelta: number | undefined = last && prev ? last.income   - prev.income   : undefined;

  // Number of months in current date range (for avg/mo in CategoryBreakdownTable)
  const rangeMonths = Math.max(1, Math.round(
    (new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime())
    / (30 * 24 * 60 * 60 * 1000),
  ));

  async function handleReimbursableToggle(id: string, current: boolean) {
    await fetch(`/api/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isReimbursable: !current }),
    });
    mutate(`/api/transactions?${txParams}`);
    mutate(`/api/analytics/reimbursable?${baseParams}`);
  }

  async function handleNotesSave(id: string, notes: string | null) {
    await fetch(`/api/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    mutate(`/api/transactions?${txParams}`);
  }

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <FilterBar />
      <ActiveFiltersBar />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <StatCard
          label="Total Expenses"
          value={totalExpenses}
          delta={expDelta}
          deltaLabel="vs prev month"
          invertDelta
        />
        <StatCard
          label="Total Income"
          value={totalIncome}
          delta={incDelta}
          deltaLabel="vs prev month"
        />
        <StatCard
          label="Net Cash Flow"
          value={netFlow}
          subtitle={netFlow >= 0 ? 'Surplus' : 'Deficit'}
        />
        <StatCard
          label="Pending Reimbursable"
          value={reimbTotal}
          subtitle={reimbCount > 0 ? `${reimbCount} transaction${reimbCount === 1 ? '' : 's'}` : undefined}
        />
        {balanceData && (
          <StatCard
            label="Checking Balance"
            value={balanceData.current ?? 0}
            delta={balanceData.delta30d ?? undefined}
            deltaLabel="vs 30 days ago"
            subtitle={
              balanceData.current == null
                ? 'Re-import checking CSV to see balance'
                : 'Checking account'
            }
            onClick={balanceData.current != null ? () => setBalanceExpanded(e => !e) : undefined}
            active={balanceExpanded}
          />
        )}
      </div>

      {/* Expandable checking balance chart */}
      {balanceExpanded && balanceData?.current != null && (
        <BalanceChart data={balanceData.history} />
      )}

      {/* Spending area chart */}
      <SpendingAreaChart
        data={monthlyRows}
        mode={chartMode}
        onToggleMode={() => setChartMode(chartMode === '6m' ? '2m' : '6m')}
      />

      {/* Category breakdown + pie */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <CategoryBreakdownTable
          data={categoryRows}
          months={rangeMonths}
          activeCategory={activeCategory}
          onSelect={setCategory}
        />
        <CategoryPieChart
          data={categoryRows}
          activeCategory={activeCategory}
          onSelect={setCategory}
        />
      </div>

      {/* Top merchants */}
      {merchantRows.length > 0 && (
        <TopMerchantsBarChart
          data={merchantRows}
          activeMerchant={activeMerchant}
          onSelect={setMerchant}
        />
      )}

      {/* Transaction table */}
      <TransactionTable
        transactions={txRows}
        total={txTotal}
        page={txPage}
        totalPages={txTotalPages}
        onPageChange={setTxPage}
        onReimbursableToggle={handleReimbursableToggle}
        onNotesSave={handleNotesSave}
      />
    </div>
  );
}
