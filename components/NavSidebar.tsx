'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, List, Upload, Bookmark, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions',  icon: List },
  { href: '/upload',       label: 'Import',        icon: Upload },
  { href: '/settings',     label: 'Settings',      icon: Settings },
];

export default function NavSidebar() {
  const path = usePathname();

  return (
    <aside className="w-56 shrink-0 flex flex-col h-screen sticky top-0 border-r border-white/[0.06]"
      style={{ background: '#060e20' }}>

      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <Bookmark className="w-5 h-5" style={{ color: '#3bbffa' }} />
          <span className="text-base font-bold tracking-tight font-heading" style={{ color: '#dee5ff' }}>
            Folio
          </span>
        </div>
        <p className="text-xs mt-0.5" style={{ color: '#a3aac4' }}>Personal Finance</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'text-[#dee5ff]'
                  : 'text-[#a3aac4] hover:text-[#dee5ff]',
              )}
              style={active ? { background: '#192540' } : undefined}
            >
              <Icon className={cn('w-4 h-4', active ? 'text-[#3bbffa]' : 'text-[#a3aac4]')} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/[0.06]">
        <p className="text-xs" style={{ color: '#a3aac4' }}>Local · SQLite</p>
      </div>
    </aside>
  );
}
