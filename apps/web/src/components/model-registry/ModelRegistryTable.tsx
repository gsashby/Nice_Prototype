'use client';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { useModelRegistry, type RegistryModel } from '@/hooks/useModelRegistry';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import SortTh from '@/components/shared/SortTh';
import { useSortable } from '@/lib/useSortable';

const typeStyles: Record<string, string> = {
  llm:        'bg-[#EDE9FE] text-[#6D28D9]',
  classifier: 'bg-[#DBEAFE] text-[#1D4ED8]',
  rag:        'bg-[#CCFBF1] text-[#0F766E]',
  regression: 'bg-[#FEF3C7] text-[#92400E]',
};

function typeColor(t: string) {
  return typeStyles[t.toLowerCase()] ?? 'bg-[#F3F4F6] text-[#4B5563]';
}

function govBadge(score: number) {
  if (score >= 85) return { cls: 'bg-[#DCFCE7] text-[#15803D]', label: 'Healthy' };
  if (score >= 70) return { cls: 'bg-[#FEF3C7] text-[#92400E]', label: 'Watch' };
  return { cls: 'bg-[#FEE2E2] text-[#DC2626]', label: 'Critical' };
}

function GovBar({ score }: { score: number }) {
  const color = score >= 85 ? '#16A34A' : score >= 70 ? '#D97706' : '#DC2626';
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-20 rounded-full bg-[#E5E7EB] overflow-hidden">
        <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-[12px] font-semibold tabular-nums" style={{ color }}>{score.toFixed(1)}%</span>
    </div>
  );
}

type Props = {
  onSelect: (model: RegistryModel) => void;
};

export default function ModelRegistryTable({ onSelect }: Props) {
  const { data: models = [], isLoading } = useModelRegistry();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = models.filter((m) => {
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.version?.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter && m.type.toLowerCase() !== typeFilter) return false;
    if (statusFilter && m.status !== statusFilter) return false;
    return true;
  });

  const { sorted, sort, toggle } = useSortable<RegistryModel>(filtered);

  const types = Array.from(new Set(models.map((m) => m.type.toLowerCase()))).sort();

  return (
    <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap" style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB' }}>
        <div className="relative flex-1" style={{ minWidth: 180, maxWidth: 280 }}>
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9CA3AF]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search models…"
            className="w-full rounded-[5px] border border-[#D1D5DB] bg-white pl-8 pr-3 py-1.5 text-[12.5px] text-[#374151] placeholder-[#9CA3AF] outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-[5px] border border-[#D1D5DB] bg-white px-2.5 py-1.5 text-[12.5px] text-[#374151] outline-none focus:border-[#2563EB]"
        >
          <option value="">All Types</option>
          {types.map((t) => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-[5px] border border-[#D1D5DB] bg-white px-2.5 py-1.5 text-[12.5px] text-[#374151] outline-none focus:border-[#2563EB]"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <span className="ml-auto text-[12px] text-[#9CA3AF]">
          {isLoading ? '…' : `${filtered.length} model${filtered.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-px p-4">
          {Array.from({ length: 6 }).map((_, i) => <LoadingSkeleton key={i} className="h-10" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-[13px] text-[#9CA3AF]">
          No models match the current filters
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-[#E5E7EB] bg-[#F9FAFB] text-left">
                <SortTh label="Name"          colKey="name"              sort={sort} onToggle={toggle} className="pl-4 pr-3" />
                <SortTh label="Type"          colKey="type"              sort={sort} onToggle={toggle} className="px-3" />
                <SortTh label="Version"       colKey="version"           sort={sort} onToggle={toggle} className="px-3" />
                <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-[.05em] text-[#6B7280] whitespace-nowrap">Status</th>
                <SortTh label="Gov. Score"    colKey="governance_score"  sort={sort} onToggle={toggle} className="px-3" />
                <SortTh label="Avg Conf."     colKey="confidence_avg"    sort={sort} onToggle={toggle} className="px-3" />
                <SortTh label="Inferences"    colKey="total_inferences"  sort={sort} onToggle={toggle} className="px-3" />
                <SortTh label="Violations"    colKey="violation_count"   sort={sort} onToggle={toggle} className="px-3" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((m) => {
                const { cls: govCls, label: govLabel } = govBadge(m.governance_score);
                return (
                  <tr
                    key={m.id}
                    className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                    onClick={() => onSelect(m)}
                  >
                    <td className="pl-4 pr-3 py-2.5 text-[12.5px] font-semibold text-[#111827]">{m.name}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${typeColor(m.type)}`}>
                        {m.type}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11.5px] text-[#374151]">{m.version || '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${m.status === 'active' ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#F3F4F6] text-[#4B5563]'}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <GovBar score={m.governance_score} />
                    </td>
                    <td className="px-3 py-2.5 text-[12.5px] tabular-nums text-[#374151]">
                      {(m.confidence_avg * 100).toFixed(1)}%
                    </td>
                    <td className="px-3 py-2.5 text-[12.5px] tabular-nums text-[#374151]">
                      {m.total_inferences.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5">
                      {m.violation_count > 0 ? (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${govCls}`}>
                          {m.violation_count} {govLabel}
                        </span>
                      ) : (
                        <span className="text-[12px] text-[#9CA3AF]">0</span>
                      )}
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
