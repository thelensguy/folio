'use client';
import { create } from 'zustand';
import { nMonthsAgo, today } from '@/lib/utils';

export interface FilterState {
  // Date + account
  dateRange:       { from: string; to: string };
  account:         string | null;  // null = all accounts

  // Cross-filter state
  activeCategory:  string | null;
  activeMonth:     string | null;  // "YYYY-MM"
  activeMerchant:  string | null;

  // Search
  searchQuery:     string;

  // Table options
  hideReimbursable: boolean;

  // Chart mode
  chartMode:       '6m' | '2m';   // trend vs comparison
  compareMonth:    string | null;  // second month for 2m mode

  // Actions
  setDateRange:         (from: string, to: string) => void;
  setAccount:           (a: string | null) => void;
  setCategory:          (c: string | null) => void;
  setMonth:             (m: string | null) => void;
  setMerchant:          (m: string | null) => void;
  setSearchQuery:       (q: string) => void;
  toggleHideReimbursable: () => void;
  setChartMode:         (mode: '6m' | '2m') => void;
  setCompareMonth:      (m: string | null) => void;

  /** Remove a single named filter. */
  clearFilter: (key: 'category' | 'month' | 'account' | 'merchant' | 'search') => void;

  /** Reset everything to defaults. */
  clearAll: () => void;
}

const DEFAULTS = {
  dateRange:       { from: nMonthsAgo(6), to: today() },
  account:         null as string | null,
  activeCategory:  null as string | null,
  activeMonth:     null as string | null,
  activeMerchant:  null as string | null,
  searchQuery:     '',
  hideReimbursable: false,
  chartMode:       '6m' as '6m' | '2m',
  compareMonth:    null as string | null,
};

export const useFilterStore = create<FilterState>((set) => ({
  ...DEFAULTS,

  setDateRange:  (from, to)  => set({ dateRange: { from, to } }),
  setAccount:    (account)   => set({ account }),
  setCategory:   (activeCategory) => set({ activeCategory, activeMerchant: null }),
  setMonth:      (activeMonth)    => set({ activeMonth }),
  setMerchant:   (activeMerchant) => set({ activeMerchant }),
  setSearchQuery: (searchQuery)   => set({ searchQuery }),
  toggleHideReimbursable: ()      => set(s => ({ hideReimbursable: !s.hideReimbursable })),
  setChartMode:  (chartMode)      => set({ chartMode }),
  setCompareMonth: (compareMonth) => set({ compareMonth }),

  clearFilter: (key) =>
    set(s => {
      switch (key) {
        case 'category': return { ...s, activeCategory: null };
        case 'month':    return { ...s, activeMonth:    null };
        case 'account':  return { ...s, account:        null };
        case 'merchant': return { ...s, activeMerchant: null };
        case 'search':   return { ...s, searchQuery:    '' };
        default:         return s;
      }
    }),

  clearAll: () => set(DEFAULTS),
}));

/** Build a URLSearchParams string from the current filter state. */
export function buildParams(state: FilterState, extra?: Record<string, string>): string {
  const p: Record<string, string> = {
    from: state.dateRange.from,
    to:   state.dateRange.to,
  };
  if (state.account)        p.account   = state.account;
  if (state.activeCategory) p.category  = state.activeCategory;
  if (state.activeMerchant) p.merchant  = state.activeMerchant;
  if (state.searchQuery)    p.search    = state.searchQuery;
  if (extra) Object.assign(p, extra);
  return new URLSearchParams(p).toString();
}
