'use client';
import { useState } from 'react';
import { subDays, startOfDay, format } from 'date-fns';
import PageHeader from '@/components/shared/PageHeader';
import AgentTable from '@/components/agent-monitor/AgentTable';
import AgentDetailDrawer from '@/components/agent-monitor/AgentDetailDrawer';
import { useAgents, type AgentSummary } from '@/hooks/useAgents';

type Period = '7d' | '30d' | 'all';

function periodStartDate(period: Period): string | undefined {
  if (period === 'all') return undefined;
  const days = period === '7d' ? 7 : 30;
  return format(startOfDay(subDays(new Date(), days)), "yyyy-MM-dd'T'HH:mm:ss'Z'");
}

function KpiChip({
  label, value, sub, color,
}: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]" style={{ padding: '12px 16px', flex: 1 }}>
      <div className="text-[10.5px] font-semibold uppercase tracking-[.05em] text-[#9CA3AF] mb-1">{label}</div>
      <div className="text-[22px] font-bold tabular-nums" style={{ color: color ?? '#111827' }}>{value}</div>
      {sub && <div className="text-[10.5px] text-[#9CA3AF] mt-0.5">{sub}</div>}
    </div>
  );
}

export default function AiAgentsPage() {
  const [period, setPeriod] = useState<Period>('7d');
  const [selected, setSelected] = useState<AgentSummary | null>(null);

  const startDate = periodStartDate(period);
  const { agents, fleet, isLoading, isError, eventTotal } = useAgents(startDate);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Agent Trust Panel"
        actions={
          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="appearance-none rounded-[5px] border border-[#D1D5DB] bg-white text-[12.5px] text-[#1F2937] focus:border-[#2563EB] focus:outline-none"
              style={{ padding: '6px 32px 6px 10px', backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: 'right 8px center', backgroundRepeat: 'no-repeat', backgroundSize: '16px' }}
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        }
      />

      {/* Page description */}
      <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB]" style={{ padding: '14px 18px' }}>
        <p className="text-[13px] text-[#374151] leading-relaxed">
          This panel shows governance health for every AI agent active in the selected period, derived from audit event data.
          Each agent is assigned a <span className="font-semibold text-[#111827]">Trust Score</span> (0–100) computed from three weighted signals:
          how often the agent&apos;s actions are <span className="font-semibold text-[#16A34A]">allowed</span> (50%),
          its average <span className="font-semibold text-[#111827]">confidence score</span> (35%),
          and the proportion of events with <span className="font-semibold text-[#111827]">no policy violations</span> (15%).
          Scores below 70% are flagged as high-risk. Click any row to open the full agent detail — outcome breakdown, top violations, and recent sessions.
        </p>
      </div>

      {/* Fleet KPI chips */}
      <div className="flex gap-3">
        <KpiChip
          label="Active Agents"
          value={isLoading ? '…' : String(fleet?.active_agents ?? 0)}
          sub={`from ${eventTotal > 0 ? `${Math.min(eventTotal, 200)} events sampled` : '0 events'}`}
        />
        <KpiChip
          label="Fleet Block Rate"
          value={isLoading ? '…' : fleet ? `${(fleet.fleet_block_rate * 100).toFixed(1)}%` : '—'}
          color={fleet && fleet.fleet_block_rate >= 0.10 ? '#DC2626' : fleet && fleet.fleet_block_rate >= 0.05 ? '#D97706' : '#16A34A'}
        />
        <KpiChip
          label="Fleet Avg Confidence"
          value={isLoading ? '…' : fleet ? `${(fleet.fleet_avg_confidence * 100).toFixed(1)}%` : '—'}
          color={fleet && fleet.fleet_avg_confidence >= 0.85 ? '#16A34A' : fleet && fleet.fleet_avg_confidence >= 0.70 ? '#D97706' : '#DC2626'}
        />
        <KpiChip
          label="High-Risk Agents"
          value={isLoading ? '…' : String(fleet?.high_risk_count ?? 0)}
          color={fleet && fleet.high_risk_count > 0 ? '#DC2626' : '#9CA3AF'}
          sub="trust score < 70%"
        />
      </div>

      {/* Agent table */}
      <AgentTable
        agents={agents}
        isLoading={isLoading}
        isError={isError}
        onSelect={setSelected}
      />

      {/* Detail drawer */}
      <AgentDetailDrawer agent={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
