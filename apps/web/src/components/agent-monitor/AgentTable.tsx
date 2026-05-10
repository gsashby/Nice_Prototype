'use client';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useSortable } from '@/lib/useSortable';
import SortTh from '@/components/shared/SortTh';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import type { AgentSummary } from '@/hooks/useAgents';

function TrustBar({ score }: { score: number }) {
  const color = score >= 85 ? '#16A34A' : score >= 70 ? '#D97706' : '#DC2626';
  const label = score >= 85 ? 'Healthy' : score >= 70 ? 'Watch' : 'Critical';
  const labelCls = score >= 85
    ? 'bg-[#DCFCE7] text-[#15803D]'
    : score >= 70
    ? 'bg-[#FEF3C7] text-[#92400E]'
    : 'bg-[#FEE2E2] text-[#DC2626]';

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-20 rounded-full bg-[#E5E7EB] overflow-hidden flex-shrink-0">
        <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-[12px] font-semibold tabular-nums" style={{ color }}>{score.toFixed(1)}%</span>
      <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${labelCls}`}>{label}</span>
    </div>
  );
}

type Props = {
  agents: AgentSummary[];
  isLoading: boolean;
  isError: boolean;
  onSelect: (agent: AgentSummary) => void;
};

export default function AgentTable({ agents, isLoading, isError, onSelect }: Props) {
  const [search, setSearch] = useState('');

  const filtered = agents.filter((a) =>
    !search || a.agent_id.toLowerCase().includes(search.toLowerCase())
  );

  const { sorted, sort, toggle } = useSortable<AgentSummary>(filtered);

  if (isError) {
    return (
      <div className="rounded-[6px] border border-red-200 bg-red-50 p-4 text-[13px] text-red-600">
        Failed to load agent data — is the API running?
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
      {/* Search bar */}
      <div className="flex items-center gap-3" style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB' }}>
        <div className="relative" style={{ width: 240 }}>
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9CA3AF]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agent ID…"
            className="w-full rounded-[5px] border border-[#D1D5DB] bg-white pl-8 pr-3 py-1.5 text-[12.5px] text-[#374151] placeholder-[#9CA3AF] outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20"
          />
        </div>
        <span className="ml-auto text-[12px] text-[#9CA3AF]">
          {isLoading ? '…' : `${filtered.length} agent${filtered.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-px p-4">
          {Array.from({ length: 8 }).map((_, i) => <LoadingSkeleton key={i} className="h-10" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-[13px] text-[#9CA3AF]">
          {search ? 'No agents match the search' : 'No agent events in this period'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-[#E5E7EB] bg-[#F9FAFB] text-left">
                <SortTh label="Agent ID"     colKey="agent_id"       sort={sort} onToggle={toggle} className="pl-4 pr-3" />
                <SortTh label="Trust Score"  colKey="trust_score"    sort={sort} onToggle={toggle} className="px-3" />
                <SortTh label="Events"       colKey="total_events"   sort={sort} onToggle={toggle} className="px-3" />
                <SortTh label="Sessions"     colKey="session_count"  sort={sort} onToggle={toggle} className="px-3" />
                <SortTh label="Block Rate"   colKey="block_rate"     sort={sort} onToggle={toggle} className="px-3" />
                <SortTh label="Avg Conf."    colKey="avg_confidence" sort={sort} onToggle={toggle} className="px-3" />
                <SortTh label="Violations"   colKey="total_violations" sort={sort} onToggle={toggle} className="px-3" />
                <SortTh label="Last Seen"    colKey="last_seen"      sort={sort} onToggle={toggle} className="px-3" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((agent) => {
                const blockColor = agent.block_rate >= 0.15 ? '#DC2626' : agent.block_rate >= 0.05 ? '#D97706' : '#6B7280';
                const confColor  = agent.avg_confidence >= 0.85 ? '#16A34A' : agent.avg_confidence >= 0.70 ? '#D97706' : '#DC2626';
                return (
                  <tr
                    key={agent.agent_id}
                    className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                    onClick={() => onSelect(agent)}
                  >
                    <td className="pl-4 pr-3 py-2.5 font-mono text-[12.5px] font-semibold text-[#111827]">
                      {agent.agent_id}
                    </td>
                    <td className="px-3 py-2.5">
                      <TrustBar score={agent.trust_score} />
                    </td>
                    <td className="px-3 py-2.5 text-[12.5px] tabular-nums text-[#374151]">
                      {agent.total_events.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-[12.5px] tabular-nums text-[#374151]">
                      {agent.session_count}
                    </td>
                    <td className="px-3 py-2.5 text-[12.5px] tabular-nums font-semibold" style={{ color: blockColor }}>
                      {(agent.block_rate * 100).toFixed(1)}%
                    </td>
                    <td className="px-3 py-2.5 text-[12.5px] tabular-nums font-semibold" style={{ color: confColor }}>
                      {(agent.avg_confidence * 100).toFixed(1)}%
                    </td>
                    <td className="px-3 py-2.5 text-[12.5px] tabular-nums text-[#374151]">
                      {agent.total_violations > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[11px] font-semibold text-[#DC2626]">
                          {agent.total_violations}
                        </span>
                      ) : (
                        <span className="text-[#9CA3AF]">0</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-[#9CA3AF] whitespace-nowrap">
                      {formatDistanceToNow(parseISO(agent.last_seen), { addSuffix: true })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
