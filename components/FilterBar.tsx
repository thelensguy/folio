'use client';
import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { Search } from 'lucide-react';
import { useFilterStore } from '@/store';
import { fetcher, nMonthsAgo, today } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PRESETS = [
  { label: '30d',  months: 1 },
  { label: '3m',   months: 3 },
  { label: '6m',   months: 6 },
  { label: '12m',  months: 12 },
  { label: 'YTD',  ytd: true },
];

function ytdStart(): string {
  return `${new Date().getFullYear()}-01-01`;
}

export default function FilterBar() {
  const { dateRange, account, searchQuery, setDateRange, setAccount, setSearchQuery, clearAll } = useFilterStore();

  // Local state for the search input; debounce 300ms before updating store
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local state in sync if store is cleared externally (e.g. "Reset all")
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  function handleSearchChange(q: string) {
    setLocalSearch(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(q), 300);
  }

  const { data: accountsData } = useSWR<{ data: string[] }>('/api/accounts', fetcher);
  const accounts = accountsData?.data ?? [];

  function applyPreset(p: (typeof PRESETS)[number]) {
    if ('ytd' in p && p.ytd) {
      setDateRange(ytdStart(), today());
    } else {
      setDateRange(nMonthsAgo(p.months!), today());
    }
  }

  const isActive = (p: (typeof PRESETS)[number]) => {
    if ('ytd' in p && p.ytd) {
      return dateRange.from === ytdStart() && dateRange.to === today();
    }
    return dateRange.from === nMonthsAgo(p.months!) && dateRange.to === today();
  };

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 px-6 py-3 border-b border-white/[0.06]"
      style={{ background: '#060e20' }}>

      {/* Date presets */}
      <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: '#0f1930' }}>
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => applyPreset(p)}
            className="px-3 py-1 text-xs font-medium rounded-md transition-colors"
            style={isActive(p)
              ? { background: '#192540', color: '#3bbffa' }
              : { color: '#a3aac4' }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={dateRange.from}
          onChange={e => setDateRange(e.target.value, dateRange.to)}
          className="px-3 py-1.5 text-xs rounded-lg border border-white/[0.08] bg-transparent"
          style={{ color: '#dee5ff', colorScheme: 'dark' }}
        />
        <span className="text-xs" style={{ color: '#a3aac4' }}>→</span>
        <input
          type="date"
          value={dateRange.to}
          onChange={e => setDateRange(dateRange.from, e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-white/[0.08] bg-transparent"
          style={{ color: '#dee5ff', colorScheme: 'dark' }}
        />
      </div>

      {/* Account dropdown */}
      <Select
        value={account ?? 'all'}
        onValueChange={v => setAccount(v === 'all' ? null : v)}
      >
        <SelectTrigger className="w-52 h-8 text-xs border-white/[0.08]"
          style={{ background: '#0f1930', color: '#dee5ff' }}>
          <SelectValue placeholder="All Accounts" />
        </SelectTrigger>
        <SelectContent style={{ background: '#141f38', border: '1px solid rgba(255,255,255,0.08)' }}>
          <SelectItem value="all" className="text-xs text-[#dee5ff]">All Accounts</SelectItem>
          {accounts.map(a => (
            <SelectItem key={a} value={a} className="text-xs text-[#dee5ff]">{a}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
          style={{ color: '#a3aac4' }} />
        <input
          type="search"
          value={localSearch}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder="Search transactions…"
          className="pl-8 pr-3 h-8 w-52 rounded-lg border border-white/[0.08] bg-transparent text-xs outline-none focus:border-[#3bbffa]/50"
          style={{ color: '#dee5ff', background: '#0f1930' }}
        />
      </div>

      <div className="flex-1" />

      <Button
        variant="ghost"
        size="sm"
        onClick={clearAll}
        className="text-xs h-8"
        style={{ color: '#a3aac4' }}
      >
        Reset all
      </Button>
    </div>
  );
}
