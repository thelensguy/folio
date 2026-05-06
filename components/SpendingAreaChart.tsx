'use client';
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { formatMonth } from '@/lib/utils';

interface Row { month: string; income: number; expenses: number; net: number }

interface Props {
  data: Row[];
  mode: '6m' | '2m';
  onToggleMode: () => void;
}

function CurrencyTooltip({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-4 py-3 text-xs shadow-xl"
      style={{ background: '#141f38', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="font-semibold mb-2" style={{ color: '#dee5ff' }}>
        {label ? formatMonth(label) : ''}
      </p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5" style={{ color: '#a3aac4' }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-mono font-semibold" style={{ color: p.color }}>
            ${p.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function SpendingAreaChart({ data, mode, onToggleMode }: Props) {
  return (
    <div className="rounded-xl p-5" style={{ background: '#0f1930' }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: '#dee5ff' }}>
            Income vs Expenses
          </h3>
          <p className="text-xs mt-0.5" style={{ color: '#a3aac4' }}>
            {data.length > 0 ? `${data.length} months shown` : 'No data yet'}
          </p>
        </div>
        <button
          onClick={onToggleMode}
          className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
          style={{ background: '#192540', color: '#3bbffa' }}
        >
          {mode === '6m' ? 'Compare months' : '6-month trend'}
        </button>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[260px]">
          <p className="text-sm" style={{ color: '#40485d' }}>
            No data yet — upload a CSV to get started.
          </p>
        </div>
      ) : (
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#69f6b8" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#69f6b8" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#ff716c" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#ff716c" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="month"
            tickFormatter={formatMonth}
            tick={{ fill: '#a3aac4', fontSize: 11 }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
            tick={{ fill: '#a3aac4', fontSize: 11 }}
            axisLine={false} tickLine={false} width={48}
          />
          <Tooltip content={<CurrencyTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: '#a3aac4', paddingTop: 12 }}
          />

          <Area
            type="monotone" dataKey="income" name="Income"
            stroke="#69f6b8" strokeWidth={2}
            fill="url(#incomeGrad)" dot={false} activeDot={{ r: 4, fill: '#69f6b8' }}
          />
          <Area
            type="monotone" dataKey="expenses" name="Expenses"
            stroke="#ff716c" strokeWidth={2}
            fill="url(#expenseGrad)" dot={false} activeDot={{ r: 4, fill: '#ff716c' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      )}
    </div>
  );
}
