'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface Row { description: string; total: number; count: number }
interface Props {
  data:            Row[];
  activeMerchant?: string | null;
  onSelect?:       (merchant: string | null) => void;
}

function MerchantTooltip({ active, payload }: {
  active?: boolean; payload?: { payload: Row }[];
}) {
  if (!active || !payload?.[0]) return null;
  const { description, total, count } = payload[0].payload;
  return (
    <div className="rounded-xl px-3 py-2.5 text-xs shadow-xl"
      style={{ background: '#141f38', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="font-semibold mb-1" style={{ color: '#dee5ff' }}>{description}</p>
      <p style={{ color: '#a3aac4' }}>{formatCurrency(total)} · {count} transactions</p>
    </div>
  );
}

export default function TopMerchantsBarChart({ data, activeMerchant, onSelect }: Props) {
  const maxTotal = data[0]?.total ?? 1;

  return (
    <div className="rounded-xl p-5" style={{ background: '#0f1930' }}>
      <h3 className="text-sm font-semibold mb-5" style={{ color: '#dee5ff' }}>Top Merchants</h3>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[200px]">
          <p className="text-sm" style={{ color: '#40485d' }}>No data yet — upload a CSV to get started.</p>
        </div>
      ) : (
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
        >
          <XAxis
            type="number"
            tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
            tick={{ fill: '#a3aac4', fontSize: 10 }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            type="category" dataKey="description"
            width={190} tick={{ fill: '#a3aac4', fontSize: 11 }}
            axisLine={false} tickLine={false}
            tickFormatter={v => v.length > 26 ? v.slice(0, 25) + '…' : v}
          />
          <Tooltip content={<MerchantTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar
            dataKey="total"
            radius={[0, 4, 4, 0]}
            cursor="pointer"
            onClick={(barData: unknown) => {
              // Bar.onClick reliably receives the data entry for the clicked bar
              const { description } = barData as Row;
              onSelect?.(activeMerchant === description ? null : description);
            }}
          >
            {data.map((row, i) => {
              const isActive = !activeMerchant || activeMerchant === row.description;
              // Gradient from bright → dim based on relative spend
              const opacity = 0.4 + 0.6 * (row.total / maxTotal);
              return (
                <Cell
                  key={i}
                  fill={`rgba(59,191,250,${isActive ? opacity : 0.15})`}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      )}
    </div>
  );
}
