'use client';
import { useRef, useState } from 'react';
import useSWR from 'swr';
import { Plus, Pencil, Trash2, FlaskConical, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { categoryColor, fetcher, COLOR_MAP } from '@/lib/utils';
import type { CategoryRule } from '@/lib/types';

const KNOWN_CATEGORIES = Object.keys(COLOR_MAP);

interface FormState {
  pattern:        string;
  category:       string;   // a COLOR_MAP key, or '__custom__'
  customCategory: string;
  priority:       number;
}

const BLANK_FORM: FormState = {
  pattern:        '',
  category:       KNOWN_CATEGORIES[0],
  customCategory: '',
  priority:       0,
};

// Input style helpers (avoid duplicating inline style objects)
const inputStyle = {
  background: '#141f38',
  border:     '1px solid rgba(255,255,255,0.1)',
  color:      '#dee5ff',
} as React.CSSProperties;

function focusBorder(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = '#3bbffa';
}
function blurBorder(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = 'rgba(255,255,255,0.1)';
}

export default function SettingsPage() {
  const { data, mutate } = useSWR<{ data: CategoryRule[] }>('/api/category-rules', fetcher);
  const rules = data?.data ?? [];

  // ── Form state ──────────────────────────────────────────────────────────────
  const [mode,   setMode]   = useState<'idle' | 'add' | 'edit'>('idle');
  const [editId, setEditId] = useState<string | null>(null);
  const [form,   setForm]   = useState<FormState>(BLANK_FORM);
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState<string | null>(null);

  // ── Rule tester ──────────────────────────────────────────────────────────────
  const [testDesc, setTestDesc] = useState('');

  // ── Export / Import ───────────────────────────────────────────────────────────
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importing,    setImporting]    = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [importError,  setImportError]  = useState<string | null>(null);

  // ── Recategorize ─────────────────────────────────────────────────────────────
  const [recategorizing, setRecategorizing] = useState(false);
  const [recatResult,    setRecatResult]    = useState<number | null>(null);

  // Effective category (resolves __custom__ sentinel)
  const effectiveCategory =
    form.category === '__custom__' ? form.customCategory : form.category;

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function openAdd() {
    setMode('add');
    setEditId(null);
    setForm(BLANK_FORM);
    setFormError(null);
  }

  function openEdit(rule: CategoryRule) {
    setMode('edit');
    setEditId(rule.id);
    const isKnown = KNOWN_CATEGORIES.includes(rule.category);
    setForm({
      pattern:        rule.pattern,
      category:       isKnown ? rule.category : '__custom__',
      customCategory: isKnown ? '' : rule.category,
      priority:       rule.priority ?? 0,
    });
    setFormError(null);
  }

  function cancelForm() {
    setMode('idle');
    setEditId(null);
    setFormError(null);
  }

  async function handleSave() {
    if (!form.pattern.trim())         { setFormError('Pattern is required.');  return; }
    if (!effectiveCategory.trim())    { setFormError('Category is required.'); return; }

    setSaving(true);
    setFormError(null);
    try {
      const body = {
        pattern:  form.pattern.trim(),
        category: effectiveCategory.trim(),
        priority: form.priority,
      };

      const url    = mode === 'add' ? '/api/category-rules' : `/api/category-rules/${editId}`;
      const method = mode === 'add' ? 'POST' : 'PATCH';

      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to save rule');

      await mutate();
      cancelForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/category-rules/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? 'Delete failed');
      }
      await mutate();
      if (editId === id) cancelForm();
    } catch (err) {
      console.error('[delete rule]', err);
    }
  }

  async function handleRecategorize() {
    setRecategorizing(true);
    setRecatResult(null);
    try {
      const res  = await fetch('/api/transactions/recategorize', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Recategorization failed');
      setRecatResult((json.data as { updated: number }).updated);
    } catch (err) {
      console.error('[recategorize]', err);
    } finally {
      setRecategorizing(false);
    }
  }

  // ── Export ───────────────────────────────────────────────────────────────────
  function handleExport() {
    const exported = rules.map(({ pattern, category, priority }) => ({
      pattern, category, priority: priority ?? 0,
    }));
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'folio-rules.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Import ───────────────────────────────────────────────────────────────────
  async function handleImport(file: File) {
    setImporting(true);
    setImportError(null);
    setImportResult(null);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await file.text());
      } catch {
        setImportError('Invalid JSON file.');
        return;
      }

      if (!Array.isArray(parsed)) {
        setImportError('File must contain a JSON array of rules.');
        return;
      }

      // Validate + normalise entries
      const valid = (parsed as unknown[])
        .filter((r): r is { pattern: string; category: string; priority?: number } =>
          typeof r === 'object' && r !== null &&
          typeof (r as Record<string, unknown>).pattern  === 'string' &&
          typeof (r as Record<string, unknown>).category === 'string',
        )
        .map(r => ({
          pattern:  r.pattern.trim(),
          category: r.category.trim(),
          priority: typeof r.priority === 'number' ? r.priority : 0,
        }))
        .filter(r => r.pattern && r.category);

      if (!valid.length) {
        setImportError('No valid rules found. Each rule needs "pattern" and "category" string fields.');
        return;
      }

      // Skip patterns that already exist (case-insensitive)
      const existing = new Set(rules.map(r => r.pattern.toLowerCase()));
      const toAdd    = valid.filter(r => !existing.has(r.pattern.toLowerCase()));
      const skipped  = valid.length - toAdd.length;

      let imported = 0;
      for (const rule of toAdd) {
        const res = await fetch('/api/category-rules', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(rule),
        });
        if (res.ok) imported++;
      }

      await mutate();
      setImportResult({ imported, skipped });
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  // Client-side rule tester — match highest priority rule that contains testDesc
  const matchedRule = testDesc.trim()
    ? [...rules]
        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
        .find(r => testDesc.toLowerCase().includes(r.pattern.toLowerCase()))
    : null;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">

      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold" style={{ color: '#dee5ff' }}>Settings</h1>
        <p className="text-sm mt-1" style={{ color: '#a3aac4' }}>
          Manage category rules and re-categorize existing transactions.
        </p>
      </div>

      {/* ── Section 1: Category Rules ─────────────────────────────────────── */}
      <section className="space-y-4">

        {/* Section heading + action buttons */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: '#dee5ff' }}>Category Rules</h2>
            <p className="text-xs mt-0.5" style={{ color: '#a3aac4' }}>
              Checked in priority order (highest first) on every import.
            </p>
          </div>
          {mode === 'idle' && (
            <div className="flex items-center gap-2">
              {/* Hidden file input for JSON import */}
              <input
                ref={importFileRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImport(f);
                  e.target.value = '';
                }}
              />
              <Button
                onClick={() => importFileRef.current?.click()}
                disabled={importing}
                size="sm"
                variant="ghost"
                className="gap-1.5 text-xs font-medium px-3 border border-white/[0.08]"
                style={{ color: '#a3aac4' }}
              >
                <Upload className="w-3.5 h-3.5" />
                {importing ? 'Importing…' : 'Import'}
              </Button>
              <Button
                onClick={handleExport}
                disabled={rules.length === 0}
                size="sm"
                variant="ghost"
                className="gap-1.5 text-xs font-medium px-3 border border-white/[0.08]"
                style={{ color: '#a3aac4' }}
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </Button>
              <Button
                onClick={openAdd}
                size="sm"
                className="gap-1.5 text-xs font-medium px-3"
                style={{ background: '#3bbffa', color: '#060e20' }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Rule
              </Button>
            </div>
          )}
        </div>

        {/* Import result / error feedback */}
        {importResult && (
          <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
            style={{ background: 'rgba(105,246,184,0.06)', border: '1px solid rgba(105,246,184,0.2)' }}>
            <span style={{ color: '#69f6b8' }}>
              ✓ {importResult.imported} rule{importResult.imported !== 1 ? 's' : ''} imported
              {importResult.skipped > 0 && `, ${importResult.skipped} already existed`}
            </span>
            <button onClick={() => setImportResult(null)} className="ml-auto text-xs" style={{ color: '#a3aac4' }}>✕</button>
          </div>
        )}
        {importError && (
          <div className="text-xs px-3 py-2 rounded-lg"
            style={{ background: 'rgba(255,113,108,0.08)', border: '1px solid rgba(255,113,108,0.2)', color: '#ff716c' }}>
            {importError}
          </div>
        )}

        {/* Inline add / edit form */}
        {mode !== 'idle' && (
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: '#0f1930', border: '1px solid rgba(59,191,250,0.25)' }}
          >
            <p className="text-xs font-semibold" style={{ color: '#3bbffa' }}>
              {mode === 'add' ? 'New rule' : 'Edit rule'}
            </p>

            <div className="grid grid-cols-[1fr_190px_90px] gap-3">

              {/* Pattern */}
              <div className="space-y-1.5">
                <label className="text-xs block" style={{ color: '#a3aac4' }}>Pattern</label>
                <input
                  type="text"
                  value={form.pattern}
                  onChange={e => setField('pattern', e.target.value)}
                  placeholder="e.g. Spotify"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                  style={inputStyle}
                  onFocus={focusBorder}
                  onBlur={blurBorder}
                />
                <p className="text-xs" style={{ color: '#40485d' }}>
                  Case-insensitive substring match on description
                </p>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs block" style={{ color: '#a3aac4' }}>Category</label>
                <select
                  value={form.category}
                  onChange={e => {
                    setField('category', e.target.value);
                    if (e.target.value !== '__custom__') setField('customCategory', '');
                  }}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                  style={inputStyle}
                  onFocus={focusBorder}
                  onBlur={blurBorder}
                >
                  {KNOWN_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="__custom__">Custom…</option>
                </select>
                {form.category === '__custom__' && (
                  <input
                    type="text"
                    value={form.customCategory}
                    onChange={e => setField('customCategory', e.target.value)}
                    placeholder="Custom category name"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                    style={inputStyle}
                    onFocus={focusBorder}
                    onBlur={blurBorder}
                  />
                )}
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="text-xs block" style={{ color: '#a3aac4' }}>Priority</label>
                <input
                  type="number"
                  value={form.priority}
                  onChange={e => setField('priority', parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                  style={inputStyle}
                  onFocus={focusBorder}
                  onBlur={blurBorder}
                />
                <p className="text-xs" style={{ color: '#40485d' }}>Higher = checked first</p>
              </div>
            </div>

            {formError && (
              <p className="text-xs" style={{ color: '#ff716c' }}>{formError}</p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Button
                onClick={handleSave}
                disabled={saving}
                size="sm"
                className="text-xs px-4 font-medium"
                style={
                  saving
                    ? { background: '#192540', color: '#a3aac4' }
                    : { background: '#3bbffa', color: '#060e20' }
                }
              >
                {saving ? 'Saving…' : 'Save rule'}
              </Button>
              <Button
                onClick={cancelForm}
                disabled={saving}
                size="sm"
                variant="ghost"
                className="text-xs px-3"
                style={{ color: '#a3aac4' }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Rules table */}
        <div className="rounded-xl overflow-hidden" style={{ background: '#0f1930' }}>
          {/* Column headers */}
          <div
            className="grid grid-cols-[1fr_170px_76px_80px] gap-x-3 px-5 py-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            {['Pattern', 'Category', 'Priority', ''].map(h => (
              <span
                key={h}
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: '#a3aac4' }}
              >
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {rules.length === 0 ? (
              <p className="px-5 py-8 text-sm text-center" style={{ color: '#a3aac4' }}>
                No rules yet — click &ldquo;Add Rule&rdquo; to create one.
              </p>
            ) : (
              rules.map(rule => (
                <div
                  key={rule.id}
                  className="grid grid-cols-[1fr_170px_76px_80px] gap-x-3 px-5 py-3 items-center transition-opacity"
                  style={editId === rule.id ? { opacity: 0.4 } : undefined}
                >
                  {/* Pattern */}
                  <span
                    className="text-sm font-mono truncate"
                    style={{ color: '#dee5ff' }}
                    title={rule.pattern}
                  >
                    {rule.pattern}
                  </span>

                  {/* Category badge */}
                  <div>
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        background: `${categoryColor(rule.category)}1a`,
                        color:       categoryColor(rule.category),
                      }}
                    >
                      {rule.category}
                    </span>
                  </div>

                  {/* Priority */}
                  <span className="text-xs font-mono" style={{ color: '#a3aac4' }}>
                    {rule.priority ?? 0}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => openEdit(rule)}
                      className="p-1.5 rounded-md transition-colors hover:bg-white/[0.06]"
                      title="Edit rule"
                    >
                      <Pencil className="w-3.5 h-3.5" style={{ color: '#a3aac4' }} />
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="p-1.5 rounded-md transition-colors hover:bg-white/[0.06]"
                      title="Delete rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" style={{ color: '#ff716c' }} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Rule tester */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: '#0f1930' }}>
          <div className="flex items-center gap-2">
            <FlaskConical className="w-3.5 h-3.5" style={{ color: '#a3aac4' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#a3aac4' }}>
              Test a description
            </span>
          </div>
          <input
            type="text"
            value={testDesc}
            onChange={e => setTestDesc(e.target.value)}
            placeholder="e.g. Paypal Inst Xfer Davidhule"
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
            style={inputStyle}
            onFocus={focusBorder}
            onBlur={blurBorder}
          />
          {testDesc.trim() && (
            <div className="text-xs px-3 py-2.5 rounded-lg" style={{ background: '#141f38' }}>
              {matchedRule ? (
                <span>
                  <span style={{ color: '#a3aac4' }}>Matches </span>
                  <span className="font-mono" style={{ color: '#dee5ff' }}>
                    &ldquo;{matchedRule.pattern}&rdquo;
                  </span>
                  <span style={{ color: '#a3aac4' }}> → </span>
                  <span
                    className="font-semibold"
                    style={{ color: categoryColor(matchedRule.category) }}
                  >
                    {matchedRule.category}
                  </span>
                  <span style={{ color: '#40485d' }}> (priority {matchedRule.priority ?? 0})</span>
                </span>
              ) : (
                <span style={{ color: '#a3aac4' }}>
                  No rule matches — would fall back to auto-categorization.
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Section 2: Re-categorize existing transactions ─────────────────── */}
      <section
        className="rounded-xl p-5 space-y-3"
        style={{ background: '#0f1930' }}
      >
        <div>
          <h2 className="text-sm font-semibold" style={{ color: '#dee5ff' }}>
            Apply Rules to Existing Transactions
          </h2>
          <p className="text-xs mt-1" style={{ color: '#a3aac4' }}>
            Runs every category rule against all imported transactions and updates
            categories where a rule now matches. Safe to run multiple times.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={handleRecategorize}
            disabled={recategorizing}
            size="sm"
            className="text-xs px-4 font-medium"
            style={
              recategorizing
                ? { background: '#192540', color: '#a3aac4' }
                : { background: '#3bbffa', color: '#060e20' }
            }
          >
            {recategorizing ? 'Applying…' : 'Apply rules to all transactions'}
          </Button>
          {recatResult !== null && (
            <p className="text-xs" style={{ color: '#69f6b8' }}>
              ✓ {recatResult} transaction{recatResult !== 1 ? 's' : ''} recategorized
            </p>
          )}
        </div>
      </section>

    </div>
  );
}
