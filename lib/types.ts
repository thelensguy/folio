// Shared TypeScript interfaces — no `any` types allowed

export interface NormalizedTransaction {
  id:          string;   // SHA256(date|description|amount) — 16-char hex dedup key
  date:        string;   // "YYYY-MM-DD"
  description: string;   // cleaned description
  amount:      number;   // negative = debit, positive = credit
  type:        'debit' | 'credit';
  category:    string | null;
  account:     string;   // passed in from user on upload
  rawDesc:     string;   // original unmodified description
  importedAt:  number;   // Date.now()
  balance:     number | null;  // running balance after tx (checking only; null for credit cards)
}

export interface ImportRecord {
  id:         string;
  filename:   string;
  account:    string;
  rowCount:   number;
  dupeCount:  number;
  importedAt: number;
}

export interface UploadResult {
  imported: number;
  dupes:    number;
  account:  string;
  filename: string;
}

export interface CategoryRule {
  id:       string;
  pattern:  string;
  category: string;
  priority: number;
}
