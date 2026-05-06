'use client';
import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PreviewRow { [key: string]: string }

interface UploadResult {
  imported: number;
  dupes:    number;
  account:  string;
  filename: string;
}

export default function UploadPage() {
  const [file,       setFile]       = useState<File | null>(null);
  const [parsed,     setParsed]     = useState(false);  // true once preview data is ready
  const [account,    setAccount]    = useState('');
  const [headers,    setHeaders]    = useState<string[]>([]);
  const [preview,    setPreview]    = useState<PreviewRow[]>([]);
  // Track depth so drag-enter/leave on child elements don't flicker the zone
  const [dragDepth,  setDragDepth]  = useState(0);
  const isDragging = dragDepth > 0;
  const [uploading,  setUploading]  = useState(false);
  const [result,     setResult]     = useState<UploadResult | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Re-sync balance state ────────────────────────────────────────────────
  const [syncFile,   setSyncFile]   = useState<File | null>(null);
  const [syncing,    setSyncing]    = useState(false);
  const [syncResult, setSyncResult] = useState<{ updated: number; total: number } | null>(null);
  const [syncError,  setSyncError]  = useState<string | null>(null);
  const syncInputRef = useRef<HTMLInputElement>(null);

  async function handleResync() {
    if (!syncFile) return;
    setSyncing(true);
    setSyncError(null);
    setSyncResult(null);
    try {
      const fd = new FormData();
      fd.append('file', syncFile);
      const res  = await fetch('/api/transactions/resync-balance', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Re-sync failed');
      setSyncResult(json.data as { updated: number; total: number });
      setSyncFile(null);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Re-sync failed');
    } finally {
      setSyncing(false);
    }
  }

  function parseForPreview(f: File) {
    Papa.parse<PreviewRow>(f, {
      header:         true,
      skipEmptyLines: true,
      preview:        5,
      complete: (results) => {
        // Surface a parse error only when no rows came back at all
        if (!results.data.length && results.errors.length) {
          setError('Could not parse this file. Is it a valid Chase CSV export?');
          setFile(null);
          setParsed(false);
          return;
        }
        setHeaders(results.meta.fields ?? []);
        setPreview(results.data);
        setParsed(true);
      },
    });
  }

  function handleFileSelect(f: File) {
    // Case-insensitive check — Chase sometimes exports as .CSV
    if (!f.name.toLowerCase().endsWith('.csv')) {
      setError('Only .csv files are supported. Please select a Chase CSV export.');
      return;
    }
    setFile(f);
    setParsed(false);
    setResult(null);
    setError(null);
    parseForPreview(f);

    // Auto-fill account label if the field is empty.
    // Try Chase pattern first (e.g. Chase1734Activity.csv → "Chase ...1734"),
    // then fall back to a cleaned-up version of the filename so the field is
    // never left blank after a file is chosen.
    if (!account) {
      const chaseMatch = f.name.match(/Chase(\d{4})/i);
      if (chaseMatch) {
        setAccount(`Chase ...${chaseMatch[1]}`);
      } else {
        const stem = f.name
          .replace(/\.csv$/i, '')
          .replace(/[_\-]+/g, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim();
        setAccount(stem || f.name);
      }
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragDepth(0);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  }

  async function handleUpload() {
    if (!file || !account.trim()) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('account', account.trim());
      const res  = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Upload failed');
      setResult(json.data as UploadResult);
      setFile(null);
      setParsed(false);
      setPreview([]);
      setHeaders([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function reset() {
    setFile(null);
    setParsed(false);
    setPreview([]);
    setHeaders([]);
    setResult(null);
    setError(null);
    setAccount('');
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold" style={{ color: '#dee5ff' }}>Import Transactions</h1>
        <p className="text-sm mt-1" style={{ color: '#a3aac4' }}>
          Upload a Chase CSV export to import transactions into Folio.
        </p>
      </div>

      {/* Success banner */}
      {result && (
        <div className="rounded-xl p-5 flex items-start gap-4"
          style={{ background: '#0f1930', border: '1px solid rgba(105,246,184,0.25)' }}>
          <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#69f6b8' }} />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: '#dee5ff' }}>
              Import complete — {result.filename}
            </p>
            <p className="text-xs mt-1" style={{ color: '#a3aac4' }}>
              {result.imported} imported &nbsp;·&nbsp; {result.dupes} duplicate{result.dupes !== 1 ? 's' : ''} skipped
            </p>
            <p className="text-xs" style={{ color: '#a3aac4' }}>
              Account: {result.account}
            </p>
          </div>
          <button
            onClick={reset}
            className="text-xs underline-offset-2 hover:underline"
            style={{ color: '#a3aac4' }}
          >
            Import another
          </button>
        </div>
      )}

      {!result && (
        <>
          {/* Drop zone */}
          <div
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragDepth(d => d + 1); }}
            onDragOver={(e)  => { e.preventDefault(); e.stopPropagation(); }}
            onDragLeave={(e) => { e.stopPropagation(); setDragDepth(d => Math.max(0, d - 1)); }}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center gap-3 py-14"
            style={{
              background:   isDragging ? 'rgba(59,191,250,0.05)' : '#0f1930',
              border:       `2px dashed ${isDragging ? '#3bbffa' : 'rgba(255,255,255,0.1)'}`,
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
                // Reset input so same file can be re-selected
                e.target.value = '';
              }}
            />
            {file ? (
              <>
                <FileText className="w-9 h-9" style={{ color: '#3bbffa' }} />
                <p className="text-sm font-medium" style={{ color: '#dee5ff' }}>{file.name}</p>
                <p className="text-xs" style={{ color: '#a3aac4' }}>
                  {(file.size / 1024).toFixed(1)} KB &nbsp;·&nbsp; click to replace
                </p>
              </>
            ) : (
              <>
                <Upload className="w-9 h-9" style={{ color: '#40485d' }} />
                <p className="text-sm font-medium" style={{ color: '#dee5ff' }}>
                  Drop a CSV file here, or click to browse
                </p>
                <p className="text-xs" style={{ color: '#a3aac4' }}>
                  Chase checking or credit card exports
                </p>
              </>
            )}
          </div>

          {/* Account label */}
          <div className="space-y-2">
            <label className="text-xs font-medium block" style={{ color: '#a3aac4' }}>
              Account label
            </label>
            <input
              type="text"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="e.g. Chase ...1234"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
              style={{
                background:  '#0f1930',
                border:      '1px solid rgba(255,255,255,0.1)',
                color:       '#dee5ff',
              }}
              onFocus={(e)  => (e.target.style.borderColor = '#3bbffa')}
              onBlur={(e)   => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
            <p className="text-xs" style={{ color: '#a3aac4' }}>
              This label groups transactions and appears in filters. Use a consistent name per account.
            </p>
          </div>

          {/* Preview table */}
          {preview.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ background: '#0f1930' }}>
              <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#a3aac4' }}>
                  Preview — first {preview.length} rows
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {headers.map(h => (
                        <th key={h} className="text-left px-4 py-2.5 font-medium whitespace-nowrap"
                          style={{ color: '#a3aac4' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {headers.map(h => (
                          <td key={h} className="px-4 py-2.5 font-mono whitespace-nowrap"
                            style={{ color: '#dee5ff' }}>
                            {row[h] ?? '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ background: 'rgba(255,113,108,0.08)', border: '1px solid rgba(255,113,108,0.2)' }}>
              <AlertCircle className="w-4 h-4 shrink-0" style={{ color: '#ff716c' }} />
              <p className="text-sm" style={{ color: '#ff716c' }}>{error}</p>
            </div>
          )}

          {/* Upload button */}
          <div className="flex justify-end">
            <Button
              onClick={handleUpload}
              disabled={!parsed || !account.trim() || uploading}
              className="px-6 font-medium"
              style={
                !parsed || !account.trim() || uploading
                  ? { background: '#192540', color: '#a3aac4' }
                  : { background: '#3bbffa', color: '#060e20' }
              }
            >
              {uploading ? 'Importing…' : 'Import transactions'}
            </Button>
          </div>
        </>
      )}
      {/* ── Re-sync balance data ─────────────────────────────────────────── */}
      <div className="rounded-xl p-5 space-y-4"
        style={{ background: '#0f1930', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-start gap-3">
          <RefreshCw className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#3bbffa' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: '#dee5ff' }}>
              Backfill balance data
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#a3aac4' }}>
              If you imported your checking CSV before balance tracking was added, re-upload it here.
              Only the balance column is updated — no duplicates are created and categories are not changed.
            </p>
          </div>
        </div>

        {/* Success */}
        {syncResult && (
          <div className="flex items-center gap-3 rounded-lg px-4 py-3"
            style={{ background: 'rgba(105,246,184,0.06)', border: '1px solid rgba(105,246,184,0.2)' }}>
            <CheckCircle className="w-4 h-4 shrink-0" style={{ color: '#69f6b8' }} />
            <p className="text-xs" style={{ color: '#69f6b8' }}>
              Updated {syncResult.updated} of {syncResult.total} transactions with balance data.
              {syncResult.updated === 0 && ' All rows already had balance values.'}
            </p>
          </div>
        )}

        {/* Error */}
        {syncError && (
          <div className="flex items-center gap-3 rounded-lg px-4 py-3"
            style={{ background: 'rgba(255,113,108,0.08)', border: '1px solid rgba(255,113,108,0.2)' }}>
            <AlertCircle className="w-4 h-4 shrink-0" style={{ color: '#ff716c' }} />
            <p className="text-xs" style={{ color: '#ff716c' }}>{syncError}</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <input
            ref={syncInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) { setSyncFile(f); setSyncResult(null); setSyncError(null); }
              e.target.value = '';
            }}
          />
          <button
            onClick={() => syncInputRef.current?.click()}
            className="px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:brightness-110"
            style={{ background: '#192540', color: '#dee5ff' }}
          >
            {syncFile ? syncFile.name : 'Choose checking CSV…'}
          </button>
          {syncFile && (
            <Button
              onClick={handleResync}
              disabled={syncing}
              className="px-4 text-xs font-medium"
              style={syncing
                ? { background: '#192540', color: '#a3aac4' }
                : { background: '#3bbffa', color: '#060e20' }}
            >
              {syncing ? 'Updating…' : 'Re-sync balance'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
