'use client';
import { X } from 'lucide-react';
import { useFilterStore } from '@/store';

interface Chip {
  key: 'category' | 'month' | 'account' | 'merchant' | 'search';
  label: string;
}

export default function ActiveFiltersBar() {
  const { activeCategory, activeMonth, account, activeMerchant, searchQuery, clearFilter } = useFilterStore();

  const chips: Chip[] = [
    ...(activeCategory ? [{ key: 'category' as const, label: `Category: ${activeCategory}` }] : []),
    ...(activeMonth    ? [{ key: 'month'    as const, label: `Month: ${activeMonth}` }]          : []),
    ...(account        ? [{ key: 'account'  as const, label: `Account: ${account}` }]            : []),
    ...(activeMerchant ? [{ key: 'merchant' as const, label: `Merchant: ${activeMerchant}` }]    : []),
    ...(searchQuery    ? [{ key: 'search'   as const, label: `Search: ${searchQuery}` }]         : []),
  ];

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 px-6 py-2"
      style={{ background: '#091328', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span className="text-xs font-medium mr-1" style={{ color: '#a3aac4' }}>
        Investigating:
      </span>
      {chips.map(chip => (
        <button
          key={chip.key}
          onClick={() => clearFilter(chip.key)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors hover:brightness-110"
          style={{ background: 'rgba(59,191,250,0.12)', color: '#3bbffa' }}
        >
          {chip.label}
          <X className="w-3 h-3" />
        </button>
      ))}
    </div>
  );
}
