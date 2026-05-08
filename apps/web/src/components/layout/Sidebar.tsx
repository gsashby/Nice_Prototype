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
  Database,
  Package,
  Clock,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  disabled?: boolean;
};

type Section = {
  label: string;
  items: NavItem[];
};

const sections: Section[] = [
  {
    label: 'AI Governance',
    items: [
      { href: '/', label: 'Governance Dashboard', icon: LayoutDashboard },
      { href: '/audit-log', label: 'Audit Log Explorer', icon: ScrollText },
      { href: '/policy-engine', label: 'Policy Engine', icon: ShieldCheck, badge: 3 },
    ],
  },
  {
    label: 'Reports & Queries',
    items: [
      { href: '/board-reports', label: 'Board Report Builder', icon: FileBarChart2 },
      { href: '/nlq', label: 'Natural Language Query', icon: MessageSquareCode },
    ],
  },
  {
    label: 'Agent Tools',
    items: [
      { href: '/ai-agents', label: 'Agent Trust Panel', icon: Bot },
    ],
  },
  {
    label: 'Administration',
    items: [
      { href: '/data-flow', label: 'Data Flow Visualizer', icon: Database, disabled: true },
    ],
  },
  {
    label: 'Models & Incidents',
    items: [
      { href: '/model-registry', label: 'Model Registry', icon: Package, disabled: true },
      { href: '/incidents', label: 'Incident Timeline', icon: Clock, disabled: true, badge: 2 },
      { href: '/access-controls', label: 'Access Controls', icon: Lock, disabled: true },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col border-r border-[#E5E7EB] bg-white" style={{ width: 216, minWidth: 216 }}>
      <div className="flex flex-col flex-1 overflow-y-auto py-2">
        <div className="px-4 pb-1.5 pt-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-[#9CA3AF]">
          AI Trust Center
        </div>

        {sections.map((section) => (
          <div key={section.label}>
            <div className="mt-1 border-t border-[#F3F4F6] px-4 pb-1 pt-2.5 text-[10.5px] font-bold uppercase tracking-[.07em] text-[#9CA3AF]">
              {section.label}
            </div>
            {section.items.map(({ href, label, icon: Icon, badge, disabled }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={disabled ? '#' : href}
                  onClick={disabled ? (e) => e.preventDefault() : undefined}
                  className={cn(
                    'flex items-center gap-[9px] border-l-[3px] px-4 py-2 text-[13px] font-medium transition-all whitespace-nowrap',
                    active
                      ? 'border-l-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8] font-semibold'
                      : disabled
                      ? 'border-l-transparent text-[#D1D5DB] cursor-default'
                      : 'border-l-transparent text-[#4B5563] hover:bg-[#F9FAFB] hover:text-[#1F2937]'
                  )}
                >
                  <Icon className="h-[14px] w-[14px] shrink-0" />
                  <span className="flex-1">{label}</span>
                  {badge != null && (
                    <span className="ml-auto rounded-[10px] bg-[#FEE2E2] px-[6px] py-[1px] text-[10px] font-bold text-[#DC2626]">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-[#F3F4F6] px-4 py-2.5">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] text-[#6B7280]">
          <span className="h-[7px] w-[7px] rounded-full bg-[#16A34A] inline-block" />
          Audit Coverage: <strong className="text-[#16A34A]">100%</strong>
        </div>
        <div className="text-[11px] text-[#9CA3AF]">Platform v2.8.0 · Trust Center v1.0</div>
      </div>
    </aside>
  );
}
