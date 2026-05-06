import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface StatCardProps {
  label:      string;
  value:      number;
  delta?:     number;     // absolute change vs prev period
  deltaLabel?: string;    // e.g. "vs Mar 2026"
  /** Override sign treatment — income cards flip colour */
  invertDelta?: boolean;
  subtitle?:   string;
  onClick?:    () => void;
  active?:     boolean;
}

export default function StatCard({
  label, value, delta, deltaLabel, invertDelta, subtitle, onClick, active,
}: StatCardProps) {
  const deltaDir: 'up' | 'down' | 'neutral' =
    delta == null || delta === 0 ? 'neutral' : delta > 0 ? 'up' : 'down';

  // For expense cards, going up is bad; for income cards, going up is good
  const deltaGood = invertDelta ? deltaDir === 'down' : deltaDir === 'up';

  const DeltaIcon =
    deltaDir === 'up' ? TrendingUp : deltaDir === 'down' ? TrendingDown : Minus;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl px-5 py-4 transition-all cursor-pointer',
        active ? 'ring-1 ring-[#3bbffa]/50' : 'hover:brightness-110',
      )}
      style={{ background: active ? '#141f38' : '#0f1930' }}
    >
      <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: '#a3aac4' }}>
        {label}
      </p>

      <p className="text-3xl font-bold tabular-nums font-heading tracking-tight" style={{ color: '#dee5ff' }}>
        {formatCurrency(value)}
      </p>

      {subtitle && (
        <p className="text-xs mt-0.5" style={{ color: '#a3aac4' }}>{subtitle}</p>
      )}

      {delta != null && (
        <div className={cn(
          'flex items-center gap-1 mt-2 text-xs font-medium',
          deltaDir === 'neutral' ? 'text-[#a3aac4]' :
          deltaGood ? 'text-[#69f6b8]' : 'text-[#ff716c]',
        )}>
          <DeltaIcon className="w-3 h-3" />
          <span>
            {delta > 0 ? '+' : ''}{formatCurrency(Math.abs(delta), { compact: true })}
            {deltaLabel ? ` ${deltaLabel}` : ''}
          </span>
        </div>
      )}
    </button>
  );
}
