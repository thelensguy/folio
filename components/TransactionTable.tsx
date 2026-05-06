'use client';
import { useRef, useState } from 'react';
import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, MessageSquare, MessageSquarePlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, categoryColor, formatCurrency, formatDate } from '@/lib/utils';
import { useFilterStore } from '@/store';

interface Transaction {
  id:             string;
  date:           string;
  description:    string;
  amount:         number;
  type:           string;
  category:       string | null;
  account:        string;
  rawDesc:        string;
  importedAt:     number;
  isReimbursable: boolean;
  notes:          string | null;
}

interface Props {
  transactions:   Transaction[];
  total:          number;
  page:           number;
  totalPages:     number;
  onPageChange:   (p: number) => void;
  onReimbursableToggle?: (id: string, current: boolean) => Promise<void>;
  onNotesSave?:   (id: string, notes: string | null) => Promise<void>;
}

// Derive a short display label per account (last 4 digits if present)
function accountBadgeColor(account: string): string {
  const colors = ['#3bbffa', '#69f6b8', '#ac8aff', '#F59E0B', '#F472B6'];
  let hash = 0;
  for (let i = 0; i < account.length; i++) hash = (hash * 31 + account.charCodeAt(i)) >>> 0;
  return colors[hash % colors.length];
}

function accountDot(account: string) {
  const match = account.match(/\.{3}(\d{4})/);
  return { label: match ? `·${match[1]}` : account.slice(-4), color: accountBadgeColor(account) };
}

export default function TransactionTable({
  transactions, total, page, totalPages, onPageChange, onReimbursableToggle, onNotesSave,
}: Props) {
  const { activeCategory, hideReimbursable, setCategory, toggleHideReimbursable } = useFilterStore();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  const visible = hideReimbursable
    ? transactions.filter(t => !t.isReimbursable)
    : transactions;

  async function handleReimbursable(t: Transaction) {
    if (!onReimbursableToggle || pendingId) return;
    setPendingId(t.id);
    try { await onReimbursableToggle(t.id, t.isReimbursable); }
    finally { setPendingId(null); }
  }

  function openNote(t: Transaction) {
    setEditingNoteId(t.id);
    setNoteText(t.notes ?? '');
    // Focus textarea on next tick
    setTimeout(() => noteInputRef.current?.focus(), 0);
  }

  async function commitNote(id: string) {
    if (!onNotesSave) { setEditingNoteId(null); return; }
    const trimmed = noteText.trim();
    await onNotesSave(id, trimmed || null);
    setEditingNoteId(null);
  }

  return (
    <div className="rounded-xl" style={{ background: '#0f1930' }}>
      {/* Table header */}
      <div className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold" style={{ color: '#dee5ff' }}>Transactions</h3>
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: '#192540', color: '#a3aac4' }}>
            {total.toLocaleString()}
          </span>
          {activeCategory && (
            <span className="text-xs" style={{ color: '#a3aac4' }}>
              · filtered by <span style={{ color: '#3bbffa' }}>{activeCategory}</span>
            </span>
          )}
        </div>
        <label className="flex items-center gap-2 text-xs cursor-pointer select-none"
          style={{ color: '#a3aac4' }}>
          <input
            type="checkbox"
            checked={hideReimbursable}
            onChange={toggleHideReimbursable}
            className="w-3.5 h-3.5 accent-[#3bbffa]"
          />
          Hide reimbursable
        </label>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[100px_1fr_160px_110px_140px_36px_36px] gap-x-3 px-5 py-2.5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {['Date', 'Description', 'Category', 'Amount', 'Account', '', ''].map((h, i) => (
          <span key={i} className="text-xs font-medium uppercase tracking-wider"
            style={{ color: '#a3aac4' }}>{h}</span>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        {visible.length === 0 ? (
          <p className="px-5 py-8 text-sm text-center" style={{ color: '#a3aac4' }}>
            {total === 0
              ? 'No transactions found — upload a CSV to get started.'
              : 'No transactions match the current filters.'}
          </p>
        ) : visible.map(tx => {
          const dot = accountDot(tx.account);
          const isDebit = tx.amount < 0;
          const isEditingNote = editingNoteId === tx.id;
          return (
            <div key={tx.id}>
              {/* Main row */}
              <div
                className={cn(
                  'grid grid-cols-[100px_1fr_160px_110px_140px_36px_36px] gap-x-3 px-5 py-3 items-center',
                  'transition-colors hover:bg-white/[0.02]',
                  tx.isReimbursable && 'opacity-50',
                )}
              >
                {/* Date */}
                <span className="text-xs font-mono" style={{ color: '#a3aac4' }}>
                  {formatDate(tx.date)}
                </span>

                {/* Description + note preview */}
                <div className="min-w-0">
                  <span
                    className={cn(
                      'text-xs truncate block',
                      tx.isReimbursable ? 'italic line-through decoration-[#a3aac4]/50' : '',
                    )}
                    style={{ color: tx.isReimbursable ? '#a3aac4' : '#dee5ff' }}
                    title={tx.description}
                  >
                    {tx.description}
                  </span>
                  {tx.notes && !isEditingNote && (
                    <span className="text-xs truncate block mt-0.5" style={{ color: '#a3aac4' }}
                      title={tx.notes}>
                      {tx.notes}
                    </span>
                  )}
                </div>

                {/* Category badge */}
                <div>
                  {tx.category ? (
                    <button
                      onClick={() => setCategory(activeCategory === tx.category ? null : tx.category)}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-opacity hover:opacity-80"
                      style={{
                        background: `${categoryColor(tx.category)}1a`,
                        color:       categoryColor(tx.category),
                      }}
                    >
                      {tx.category}
                    </button>
                  ) : (
                    <span className="text-xs" style={{ color: '#4B5563' }}>—</span>
                  )}
                </div>

                {/* Amount */}
                <span
                  className="text-xs font-mono font-semibold tabular-nums text-right"
                  style={{ color: isDebit ? '#ff716c' : '#69f6b8' }}
                >
                  {isDebit ? '' : '+'}{formatCurrency(tx.amount)}
                </span>

                {/* Account */}
                <div className="flex items-center gap-1.5 min-w-0" title={tx.account}>
                  <span className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: dot.color }} />
                  <span className="text-xs font-mono truncate" style={{ color: '#a3aac4' }}>
                    {tx.account}
                  </span>
                </div>

                {/* Reimbursable flag */}
                <button
                  onClick={() => handleReimbursable(tx)}
                  disabled={pendingId === tx.id}
                  className="flex items-center justify-center w-7 h-7 rounded-md transition-colors hover:bg-white/[0.06]"
                  title={tx.isReimbursable ? 'Marked reimbursable — click to remove' : 'Flag as reimbursable'}
                >
                  {tx.isReimbursable
                    ? <BookmarkCheck className="w-3.5 h-3.5" style={{ color: '#3bbffa' }} />
                    : <Bookmark      className="w-3.5 h-3.5" style={{ color: '#40485d' }} />}
                </button>

                {/* Note button */}
                <button
                  onClick={() => isEditingNote ? setEditingNoteId(null) : openNote(tx)}
                  className="flex items-center justify-center w-7 h-7 rounded-md transition-colors hover:bg-white/[0.06]"
                  title={tx.notes ? 'Edit note' : 'Add note'}
                >
                  {tx.notes
                    ? <MessageSquare    className="w-3.5 h-3.5" style={{ color: '#3bbffa' }} />
                    : <MessageSquarePlus className="w-3.5 h-3.5" style={{ color: '#40485d' }} />}
                </button>
              </div>

              {/* Inline note editor — shown below row when editing */}
              {isEditingNote && (
                <div className="px-5 pb-3" style={{ marginTop: '-4px' }}>
                  <textarea
                    ref={noteInputRef}
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitNote(tx.id); }
                      if (e.key === 'Escape') setEditingNoteId(null);
                    }}
                    onBlur={() => commitNote(tx.id)}
                    rows={2}
                    placeholder="Add a note… (Enter to save, Esc to cancel)"
                    className="w-full resize-none rounded-lg px-3 py-2 text-xs border border-white/[0.08] outline-none focus:border-[#3bbffa]/50"
                    style={{ background: '#141f38', color: '#dee5ff' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-xs" style={{ color: '#a3aac4' }}>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost" size="sm"
              onClick={() => onPageChange(page - 1)} disabled={page <= 1}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
