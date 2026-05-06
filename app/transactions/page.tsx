'use client';
import { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import FilterBar from '@/components/FilterBar';
import ActiveFiltersBar from '@/components/ActiveFiltersBar';
import TransactionTable from '@/components/TransactionTable';
import { useFilterStore, buildParams } from '@/store';
import { fetcher } from '@/lib/utils';

const PAGE_SIZE = 50;

interface TxRow {
  id: string; date: string; description: string; amount: number;
  type: string; category: string | null; account: string;
  rawDesc: string; importedAt: number; isReimbursable: boolean; notes: string | null;
}

export default function TransactionsPage() {
  const store = useFilterStore();
  const { activeCategory, activeMerchant } = store;

  const [txPage, setTxPage] = useState(1);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setTxPage(1);
  }, [store.dateRange.from, store.dateRange.to, store.account, activeCategory, activeMerchant, store.searchQuery]);

  const txParams = buildParams(store, { page: String(txPage), limit: String(PAGE_SIZE) });

  const { data: txResponse } = useSWR(`/api/transactions?${txParams}`, fetcher);

  const txRows:       TxRow[] = txResponse?.data       ?? [];
  const txTotal:      number  = txResponse?.total      ?? 0;
  const txTotalPages: number  = txResponse?.totalPages ?? 1;

  async function handleReimbursableToggle(id: string, current: boolean) {
    await fetch(`/api/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isReimbursable: !current }),
    });
    mutate(`/api/transactions?${txParams}`);
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
    <div className="flex flex-col min-h-screen">
      <FilterBar />
      <ActiveFiltersBar />
      <div className="p-6">
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
    </div>
  );
}
