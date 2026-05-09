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
      { href: '/data-flow', label: 'Data Flow Visualizer', icon: Database },
    ],
  },
  {
    label: 'Models & Incidents',
    items: [
      { href: '/model-registry', label: 'Model Registry', icon: Package },
      { href: '/incidents', label: 'Incident Timeline', icon: Clock, disabled: true, badge: 2 },
      { href: '/access-controls', label: 'Access Controls', icon: Lock, disabled: true },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex flex-col border-r border-[#E5E7EB] bg-white"
      style={{ width: 216, minWidth: 216 }}
    >
      {/* Scrollable nav area — padding:8px 0 matches design */}
      <div className="flex flex-1 flex-col overflow-y-auto" style={{ padding: '8px 0' }}>

        {/* "AI Trust Center" top label */}
        <div style={{ padding: '10px 16px 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9CA3AF' }}>
          AI Trust Center
        </div>

        {sections.map((section, sectionIndex) => (
          <div key={section.label}>
            {/* Section label — first one has no border/margin per design */}
            <div
              style={{
                padding: '10px 16px 4px',
                fontSize: 10.5,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '.07em',
                color: '#9CA3AF',
                ...(sectionIndex === 0
                  ? { borderTop: 'none', marginTop: 0 }
                  : { borderTop: '1px solid #F3F4F6', marginTop: 4 }),
              }}
            >
              {section.label}
            </div>

            {/* Nav items */}
            {section.items.map(({ href, label, icon: Icon, badge, disabled }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={disabled ? '#' : href}
                  onClick={disabled ? (e) => e.preventDefault() : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    borderLeft: `3px solid ${active ? '#2563EB' : 'transparent'}`,
                    whiteSpace: 'nowrap',
                    transition: 'all .12s',
                    color: active ? '#1D4ED8' : disabled ? '#D1D5DB' : '#4B5563',
                    background: active ? '#EFF6FF' : 'transparent',
                    cursor: disabled ? 'default' : 'pointer',
                    textDecoration: 'none',
                  }}
                  className={cn(!active && !disabled && 'hover:bg-[#F9FAFB] hover:!text-[#1F2937]')}
                >
                  <Icon className="shrink-0 w-[14px] h-[14px]" />
                  <span style={{ flex: 1 }}>{label}</span>
                  {badge != null && (
                    <span style={{ marginLeft: 'auto', background: '#FEE2E2', color: '#DC2626', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>
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
      <div style={{ marginTop: 'auto', borderTop: '1px solid #F3F4F6', padding: '10px 16px' }}>
        <div style={{ fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ width: 7, height: 7, background: '#16A34A', borderRadius: '50%', display: 'inline-block' }} />
          Audit Coverage: <strong style={{ color: '#16A34A' }}>100%</strong>
        </div>
        <div style={{ fontSize: 11, color: '#9CA3AF' }}>Platform v2.8.0 · Trust Center v1.0</div>
      </div>
    </aside>
  );
}
