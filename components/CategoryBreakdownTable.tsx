'use client';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { categoryColor, formatCurrency } from '@/lib/utils';

interface Row { category: string; total: number; count: number }
interface Props {
  data:            Row[];
  months:          number;   // number of months in current range (for avg/mo)
  activeCategory?: string | null;
  onSelect?:       (cat: string | null) => void;
}

export default function CategoryBreakdownTable({ data, months, activeCategory, onSelect }: Props) {
  const total = data.reduce((s, r) => s + r.total, 0);

  return (
    <div className="rounded-xl p-5 h-full" style={{ background: '#0f1930' }}>
      <h3 className="text-sm font-semibold mb-4" style={{ color: '#dee5ff' }}>
        Category Breakdown
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Category', 'Total', '% of Total', 'Avg / Mo', ''].map(h => (
                <th key={h}
                  className="pb-2 font-medium text-left px-2 first:pl-0 last:pr-0"
                  style={{ color: '#a3aac4' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-sm text-center" style={{ color: '#40485d' }}>
                  No data yet — upload a CSV to get started.
                </td>
              </tr>
            ) : data.map(row => {
              const isActive = activeCategory === row.category;
              const pct      = total > 0 ? row.total / total * 100 : 0;
              const avgMo    = months > 0 ? row.total / months : row.total;
              const TrendIcon = pct > 25 ? TrendingUp : pct < 5 ? TrendingDown : Minus;
              const trendColor = pct > 25 ? '#ff716c' : pct < 5 ? '#69f6b8' : '#a3aac4';

              return (
                <tr
                  key={row.category}
                  onClick={() => onSelect?.(isActive ? null : row.category)}
                  className="transition-colors cursor-pointer hover:bg-white/[0.03]"
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: isActive ? 'rgba(59,191,250,0.06)' : undefined,
                  }}
                >
                  {/* Category */}
                  <td className="py-2.5 px-2 pl-0">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: categoryColor(row.category) }} />
                      <span className="font-medium" style={{ color: isActive ? '#3bbffa' : '#dee5ff' }}>
                        {row.category}
                      </span>
                    </div>
                  </td>
                  {/* Total */}
                  <td className="py-2.5 px-2 font-mono" style={{ color: '#dee5ff' }}>
                    {formatCurrency(row.total)}
                  </td>
                  {/* % */}
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: '#192540' }}>
                        <div className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: categoryColor(row.category) }} />
                      </div>
                      <span className="font-mono" style={{ color: '#a3aac4' }}>{pct.toFixed(1)}%</span>
                    </div>
                  </td>
                  {/* Avg/mo */}
                  <td className="py-2.5 px-2 font-mono" style={{ color: '#a3aac4' }}>
                    {formatCurrency(avgMo)}
                  </td>
                  {/* Trend */}
                  <td className="py-2.5 pr-0">
                    <TrendIcon className="w-3.5 h-3.5" style={{ color: trendColor }} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
