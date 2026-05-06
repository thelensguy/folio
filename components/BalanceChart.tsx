'use client';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface Row { date: string; balance: number }

function formatDateShort(dateStr: string): string {
  // dateStr is "YYYY-MM-DD" — avoid timezone shifts by treating as local midnight
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function BalanceTooltip({ active, payload }: {
  active?: boolean; payload?: { payload: Row }[];
}) {
  if (!active || !payload?.[0]) return null;
  const { date, balance } = payload[0].payload;
  return (
    <div className="rounded-xl px-3 py-2.5 text-xs shadow-xl"
      style={{ background: '#141f38', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="font-semibold mb-1" style={{ color: '#dee5ff' }}>{formatDateShort(date)}</p>
      <p style={{ color: '#3bbffa' }}>{formatCurrency(balance)}</p>
    </div>
  );
}

interface Props {
  data: Row[];
}

export default function BalanceChart({ data }: Props) {
  return (
    <div className="rounded-xl p-5" style={{ background: '#0f1930' }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: '#dee5ff' }}>
            Checking Balance Over Time
          </h3>
          <p className="text-xs mt-0.5" style={{ color: '#a3aac4' }}>
            {data.length} data point{data.length !== 1 ? 's' : ''} in range
          </p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[200px]">
          <p className="text-sm" style={{ color: '#40485d' }}>
            No balance data in this date range.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3bbffa" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3bbffa" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateShort}
              tick={{ fill: '#a3aac4', fontSize: 11 }}
              axisLine={false} tickLine={false}
              interval="preserveStartEnd"
              minTickGap={60}
            />
            <YAxis
              tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
              tick={{ fill: '#a3aac4', fontSize: 11 }}
              axisLine={false} tickLine={false}
              width={48}
            />
            <Tooltip content={<BalanceTooltip />} />
            <Area
              type="monotone" dataKey="balance" name="Balance"
              stroke="#3bbffa" strokeWidth={2}
              fill="url(#balanceGrad)" dot={false}
              activeDot={{ r: 4, fill: '#3bbffa' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
