'use client';
import { useState } from 'react';
import PageHeader from '@/components/shared/PageHeader';
import IncidentTimeline from '@/components/incidents/IncidentTimeline';
import { useAuditLog } from '@/hooks/useAuditLog';

type Tab = 'blocked' | 'flagged';

function SummaryKpis() {
  const blocked = useAuditLog({ page: 1, pageSize: 1, outcome: 'blocked' });
  const flagged  = useAuditLog({ page: 1, pageSize: 1, outcome: 'flagged' });

  const totalBlocked = blocked.data?.total ?? 0;
  const totalFlagged  = flagged.data?.total  ?? 0;
  const loading = blocked.isLoading || flagged.isLoading;

  const kpis = [
    {
      label: 'Total Incidents',
      value: loading ? '…' : (totalBlocked + totalFlagged).toLocaleString(),
      color: '#111827',
    },
    {
      label: 'Blocked (Critical/High)',
      value: loading ? '…' : totalBlocked.toLocaleString(),
      color: '#DC2626',
    },
    {
      label: 'Flagged (Medium/Low)',
      value: loading ? '…' : totalFlagged.toLocaleString(),
      color: '#D97706',
    },
    {
      label: 'Audit Period',
      value: 'All time',
      color: '#6B7280',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {kpis.map(({ label, value, color }) => (
        <div
          key={label}
          className="rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]"
          style={{ padding: '12px 16px' }}
        >
          <div className="text-[10.5px] font-semibold uppercase tracking-[.05em] text-[#9CA3AF] mb-1">{label}</div>
          <div className="text-[22px] font-bold tabular-nums" style={{ color }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

const tabs: { key: Tab; label: string; description: string }[] = [
  { key: 'blocked', label: 'Blocked', description: 'Critical & High — AI actions stopped by policy' },
  { key: 'flagged', label: 'Flagged', description: 'Medium & Low — AI actions marked for review' },
];

export default function IncidentsPage() {
  const [tab, setTab] = useState<Tab>('blocked');

  return (
    <div className="space-y-5">
      <PageHeader
        title="Incident Timeline"
        description="Chronological log of AI policy violations and blocked actions"
      />

      <SummaryKpis />

      {/* Tab bar */}
      <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
        <div className="flex items-center justify-between" style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB' }}>
          <div className="flex items-center gap-1 rounded-[6px] bg-[#F3F4F6] p-0.5">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="rounded-[5px] font-semibold transition-all"
                style={{
                  padding: '5px 14px',
                  fontSize: 12,
                  background: tab === key ? '#fff' : 'transparent',
                  color: tab === key ? '#111827' : '#6B7280',
                  boxShadow: tab === key ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="text-[12px] text-[#9CA3AF]">
            {tabs.find((t) => t.key === tab)?.description}
          </span>
        </div>

        <div style={{ padding: '16px' }}>
          <IncidentTimeline key={tab} outcome={tab} />
        </div>
      </div>
    </div>
  );
}
