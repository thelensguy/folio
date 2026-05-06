'use client';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { categoryColor, formatCurrency } from '@/lib/utils';

interface Row { category: string; total: number; count: number }
interface Props { data: Row[]; onSelect?: (cat: string | null) => void; activeCategory?: string | null }

function PieTooltip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  if (!active || !payload?.[0]) return null;
  const { category, total, count } = payload[0].payload;
  return (
    <div className="rounded-xl px-3 py-2.5 text-xs shadow-xl"
      style={{ background: '#141f38', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="font-semibold mb-1" style={{ color: '#dee5ff' }}>{category}</p>
      <p style={{ color: '#a3aac4' }}>{formatCurrency(total)} · {count} txns</p>
    </div>
  );
}

export default function CategoryPieChart({ data, onSelect, activeCategory }: Props) {
  const total = data.reduce((s, r) => s + r.total, 0);

  return (
    <div className="rounded-xl p-5 h-full" style={{ background: '#0f1930' }}>
      <h3 className="text-sm font-semibold mb-4" style={{ color: '#dee5ff' }}>By Category</h3>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[220px]">
          <p className="text-sm" style={{ color: '#40485d' }}>No data yet.</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data}
                dataKey="total"
                nameKey="category"
                cx="50%" cy="50%"
                innerRadius={60} outerRadius={90}
                paddingAngle={2}
                onClick={(entry) => {
                  const cat = (entry as unknown as Row).category;
                  onSelect?.(activeCategory === cat ? null : cat);
                }}
                cursor="pointer"
              >
                {data.map((row, i) => (
                  <Cell
                    key={i}
                    fill={categoryColor(row.category)}
                    opacity={!activeCategory || activeCategory === row.category ? 1 : 0.35}
                    stroke="transparent"
                  />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {data.slice(0, 8).map(row => (
              <button
                key={row.category}
                onClick={() => onSelect?.(activeCategory === row.category ? null : row.category)}
                className="w-full flex items-center gap-2 text-xs rounded-lg px-2 py-1 transition-colors hover:bg-white/[0.04]"
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: categoryColor(row.category) }} />
                <span className="flex-1 text-left truncate"
                  style={{ color: activeCategory === row.category ? '#dee5ff' : '#a3aac4' }}>
                  {row.category}
                </span>
                <span className="font-mono shrink-0" style={{ color: '#dee5ff' }}>
                  {(row.total / total * 100).toFixed(0)}%
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
