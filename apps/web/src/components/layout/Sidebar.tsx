'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ScrollText,
  ShieldCheck,
  FileBarChart2,
  MessageSquareCode,
  Bot,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/stores/ui-store';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/audit-log', label: 'Audit Log', icon: ScrollText },
  { href: '/policy-engine', label: 'Policy Engine', icon: ShieldCheck },
  { href: '/nlq', label: 'NL Query', icon: MessageSquareCode },
  { href: '/board-reports', label: 'Board Reports', icon: FileBarChart2 },
  { href: '/ai-agents', label: 'AI Agents', icon: Bot },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-gray-800 bg-gray-900 transition-all duration-200',
        sidebarCollapsed ? 'w-16' : 'w-56'
      )}
    >
      <div className="flex h-14 items-center justify-between px-4 border-b border-gray-800">
        {!sidebarCollapsed && (
          <span className="text-sm font-semibold text-white">AI Trust Center</span>
        )}
        <button
          onClick={toggleSidebar}
          className="ml-auto text-gray-400 hover:text-white transition-colors"
          aria-label="Toggle sidebar"
        >
          <ChevronLeft
            className={cn('h-4 w-4 transition-transform', sidebarCollapsed && 'rotate-180')}
          />
        </button>
      </div>
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-800">
        {!sidebarCollapsed && (
          <p className="text-xs text-gray-500">NICE CXone Mpower</p>
        )}
      </div>
    </aside>
  );
}
