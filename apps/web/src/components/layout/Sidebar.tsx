'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ScrollText,
  ShieldCheck,
  FileBarChart2,
  Bot,
  Database,
  Package,
  Clock,
  Lock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/stores/ui-store';

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
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const col = sidebarCollapsed;

  return (
    <aside
      className="flex flex-col border-r border-[#E5E7EB] bg-white"
      style={{
        width: col ? 52 : 216,
        minWidth: col ? 52 : 216,
        transition: 'width .2s cubic-bezier(.4,0,.2,1), min-width .2s cubic-bezier(.4,0,.2,1)',
        overflow: 'hidden',
      }}
    >
      <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden" style={{ padding: '8px 0' }}>

        {/* "AI Trust Center" top label */}
        <div style={{
          padding: '10px 16px 6px',
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '.08em',
          color: '#9CA3AF',
          maxHeight: col ? 0 : 32,
          opacity: col ? 0 : 1,
          overflow: 'hidden',
          transition: 'max-height .2s, opacity .15s',
        }}>
          AI Trust Center
        </div>

        {sections.map((section, sectionIndex) => (
          <div key={section.label}>
            {/* Section label */}
            <div style={{
              padding: '10px 16px 4px',
              fontSize: 10.5,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '.07em',
              color: '#9CA3AF',
              maxHeight: col ? 0 : 32,
              opacity: col ? 0 : 1,
              overflow: 'hidden',
              transition: 'max-height .2s, opacity .15s',
              ...(sectionIndex === 0
                ? { borderTop: 'none', marginTop: 0 }
                : { borderTop: col ? 'none' : '1px solid #F3F4F6', marginTop: col ? 0 : 4 }),
            }}>
              {section.label}
            </div>

            {section.items.map(({ href, label, icon: Icon, badge, disabled }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={disabled ? '#' : href}
                  title={col ? label : undefined}
                  onClick={disabled ? (e) => e.preventDefault() : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: col ? 'center' : 'flex-start',
                    gap: 9,
                    padding: col ? '8px 0' : '8px 16px',
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    borderLeft: `3px solid ${active ? '#2563EB' : 'transparent'}`,
                    whiteSpace: 'nowrap',
                    transition: 'background .12s, color .12s, padding .2s, justify-content .2s',
                    color: active ? '#1D4ED8' : disabled ? '#D1D5DB' : '#4B5563',
                    background: active ? '#EFF6FF' : 'transparent',
                    cursor: disabled ? 'default' : 'pointer',
                    textDecoration: 'none',
                  }}
                  className={cn(!active && !disabled && 'hover:bg-[#F9FAFB] hover:!text-[#1F2937]')}
                >
                  <Icon className="shrink-0 w-[14px] h-[14px]" />
                  <span style={{
                    flex: col ? 'none' : 1,
                    overflow: 'hidden',
                    maxWidth: col ? 0 : 160,
                    opacity: col ? 0 : 1,
                    transition: 'max-width .2s, opacity .15s',
                    whiteSpace: 'nowrap',
                  }}>
                    {label}
                  </span>
                  {badge != null && (
                    <span style={{
                      marginLeft: 'auto',
                      background: '#FEE2E2',
                      color: '#DC2626',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: 10,
                      overflow: 'hidden',
                      maxWidth: col ? 0 : 40,
                      opacity: col ? 0 : 1,
                      transition: 'max-width .2s, opacity .15s',
                    }}>
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}

        {/* Collapse toggle button */}
        <button
          onClick={toggleSidebar}
          title={col ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: col ? 'center' : 'flex-start',
            gap: 9,
            padding: col ? '8px 0' : '8px 16px',
            marginTop: 4,
            fontSize: 12,
            fontWeight: 500,
            color: '#9CA3AF',
            background: 'transparent',
            border: 'none',
            borderTop: '1px solid #F3F4F6',
            cursor: 'pointer',
            width: '100%',
            whiteSpace: 'nowrap',
            transition: 'padding .2s',
          }}
          className="hover:bg-[#F9FAFB] hover:!text-[#6B7280] transition-colors"
        >
          {col
            ? <ChevronRight className="shrink-0 w-[14px] h-[14px]" />
            : <ChevronLeft className="shrink-0 w-[14px] h-[14px]" />
          }
          <span style={{
            overflow: 'hidden',
            maxWidth: col ? 0 : 120,
            opacity: col ? 0 : 1,
            transition: 'max-width .2s, opacity .15s',
          }}>
            Collapse
          </span>
        </button>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 'auto',
        borderTop: '1px solid #F3F4F6',
        padding: col ? '10px 0' : '10px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: col ? 'center' : 'flex-start',
        transition: 'padding .2s',
      }}>
        <div style={{ fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span title={col ? 'Audit Coverage: 100%' : undefined} style={{ width: 7, height: 7, background: '#16A34A', borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
          <span style={{
            overflow: 'hidden',
            maxWidth: col ? 0 : 160,
            opacity: col ? 0 : 1,
            transition: 'max-width .2s, opacity .15s',
            whiteSpace: 'nowrap',
          }}>
            Audit Coverage: <strong style={{ color: '#16A34A' }}>100%</strong>
          </span>
        </div>
        <div style={{
          fontSize: 11,
          color: '#9CA3AF',
          overflow: 'hidden',
          maxWidth: col ? 0 : 200,
          opacity: col ? 0 : 1,
          transition: 'max-width .2s, opacity .15s',
          whiteSpace: 'nowrap',
        }}>
          Platform v2.8.0 · Trust Center v1.0
        </div>
      </div>
    </aside>
  );
}
