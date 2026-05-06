#!/usr/bin/env tsx
/**
 * scripts/screenshot.ts
 *
 * Captures 4 showcase screenshots of the Folio dashboard using Playwright.
 * Requires the dev server to be running at http://localhost:3000.
 *
 * Usage:
 *   npm run screenshots
 */

import path from 'path';
import fs from 'fs';
import { chromium } from 'playwright';

const BASE    = 'http://localhost:3000';
const OUT_DIR = path.resolve(process.cwd(), 'public', 'screenshots');

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // Guard: verify dev server is reachable before launching browser
  try {
    const res = await fetch(`${BASE}/api/accounts`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch {
    console.error('\nError: dev server not reachable at', BASE);
    console.error('Run "npm run dev" in another terminal first.\n');
    process.exit(1);
  }

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport:          { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  async function shot(filename: string) {
    await page.screenshot({ path: path.join(OUT_DIR, filename), fullPage: false });
    console.log(`  saved ${filename}`);
  }

  // ── 1. Dashboard Overview ───────────────────────────────────────────────────
  console.log('1/4  Dashboard Overview…');
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.recharts-wrapper', { timeout: 15_000 });
  await page.waitForTimeout(1000);
  await shot('dashboard.png');

  // ── 2. Category Investigation ───────────────────────────────────────────────
  console.log('2/4  Category Investigation…');
  const foodRow = page.locator('table tbody tr').filter({ hasText: 'Food & Drink' }).first();
  await foodRow.click();
  await page.waitForSelector('text=Category: Food & Drink', { timeout: 8_000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await shot('investigation.png');

  // ── 3. Transactions + Search ────────────────────────────────────────────────
  console.log('3/4  Transactions + Search…');
  await page.goto(`${BASE}/transactions`, { waitUntil: 'networkidle' });
  const searchInput = page.locator('input[placeholder="Search transactions…"]');
  await searchInput.waitFor({ timeout: 10_000 });
  await searchInput.fill('spotify');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(400);
  await shot('transactions.png');

  // ── 4. Settings / Category Rules ────────────────────────────────────────────
  console.log('4/4  Settings…');
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Category Rules', { timeout: 10_000 });
  await page.waitForLoadState('networkidle');
  await shot('settings.png');

  await browser.close();
  console.log('\nAll screenshots saved to public/screenshots/');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
