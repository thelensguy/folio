import type { Metadata } from 'next';
import { Manrope, Inter } from 'next/font/google';
import './globals.css';
import NavSidebar from '@/components/NavSidebar';

// Display / headline typeface — wide, editorial, expensive-feeling
const manrope = Manrope({
  variable: '--font-manrope',
  subsets:  ['latin'],
  display:  'swap',
});

// Body / label typeface — tall x-height, excellent tabular-number support
const inter = Inter({
  variable: '--font-inter',
  subsets:  ['latin'],
  display:  'swap',
});

export const metadata: Metadata = {
  title: 'Folio — Personal Finance',
  description: 'Local-first personal finance dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${manrope.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex bg-background text-foreground">
        <NavSidebar />
        <main className="flex-1 min-w-0 overflow-auto">{children}</main>
      </body>
    </html>
  );
}
