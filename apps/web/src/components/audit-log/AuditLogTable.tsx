'use client';
import { useEffect, useState } from 'react';
import { useAuditLog } from '@/hooks/useAuditLog';
import { format } from 'date-fns';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import AuditLogDrawer from '@/components/audit-log/AuditLogDrawer';
import type { AuditEvent, AuditLogFilters } from '@/types/audit';

type Props = {
  filters: AuditLogFilters;
  onPageChange: (page: number) => void;
  onTotalChange?: (total: number) => void;
};

const actionBadge: Record<string, string> = {
  accepted:       'bg-[#DCFCE7] text-[#15803D]',
  allowed:        'bg-[#DCFCE7] text-[#15803D]',
  rejected:       'bg-[#FEE2E2] text-[#DC2626]',
  blocked:        'bg-[#FEE2E2] text-[#DC2626]',
  modified:       'bg-[#FEF3C7] text-[#92400E]',
  flagged:        'bg-[#FEF3C7] text-[#92400E]',
  'auto-applied': 'bg-[#DBEAFE] text-[#1D4ED8]',
};

function ActionBadge({ value }: { value: string }) {
  const cls = actionBadge[value.toLowerCase()] ?? 'bg-[#F3F4F6] text-[#4B5563]';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {value}
    </span>
  );
}

export default function AuditLogTable({ filters, onPageChange, onTotalChange }: Props) {
  const { data, isLoading, isError } = useAuditLog(filters);
  const [selected, setSelected] = useState<AuditEvent | null>(null);

  const events = data?.events ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / filters.pageSize);

  useEffect(() => {
    if (onTotalChange && total > 0) onTotalChange(total);
  }, [total, onTotalChange]);

  if (isError) {
    return (
      <div className="rounded-b-lg border-t-0 border border-[#E5E7EB] bg-red-50 p-4 text-sm text-red-600">
        Failed to load audit events — is the API running?
      </div>
    );
  }

  return (
    <>
      {isLoading ? (
        <div className="space-y-px p-4">
          {Array.from({ length: 8 }).map((_, i) => <LoadingSkeleton key={i} className="h-10" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="py-12 text-center text-sm text-[#6B7280]">
          No events match the current filters
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-[#E5E7EB] bg-[#F9FAFB] text-left">
                <th className="pl-4 pr-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[.05em] text-[#6B7280] whitespace-nowrap">Event ID</th>
                <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[.05em] text-[#6B7280] whitespace-nowrap">Timestamp</th>
                <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[.05em] text-[#6B7280] whitespace-nowrap">Module</th>
                <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[.05em] text-[#6B7280] whitespace-nowrap">Model Version</th>
                <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[.05em] text-[#6B7280] whitespace-nowrap">Session / Agent</th>
                <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[.05em] text-[#6B7280] whitespace-nowrap">Confidence</th>
                <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[.05em] text-[#6B7280] whitespace-nowrap">Action</th>
                <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[.05em] text-[#6B7280] whitespace-nowrap">Regulations</th>
                <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[.05em] text-[#6B7280]"></th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr
                  key={event.id}
                  className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors"
                >
                  <td className="pl-4 pr-3.5 py-2.5 font-mono text-[11px] text-[#6B7280]">
                    {event.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#6B7280] whitespace-nowrap">
                    {format(new Date(event.event_time), 'yyyy-MM-dd HH:mm:ss')}
                  </td>
                  <td className="px-3.5 py-2.5 text-[12.5px] text-[#374151]">
                    {event.event_type}
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-[11.5px] text-[#374151]">
                    {event.model_name || '—'}
                  </td>
                  <td className="px-3.5 py-2.5 text-[11.5px] text-[#374151]">
                    <div className="font-mono text-[10.5px]">{event.session_id?.slice(0, 12) ?? '—'}</div>
                    <div className="text-[10.5px] text-[#9CA3AF]">{event.agent_id?.slice(0, 8) ?? ''}</div>
                  </td>
                  <td className="px-3.5 py-2.5 text-[12.5px] text-[#374151]">
                    {(event.confidence_score * 100).toFixed(1)}%
                  </td>
                  <td className="px-3.5 py-2.5">
                    <ActionBadge value={event.outcome} />
                  </td>
                  <td className="px-3.5 py-2.5 text-[11px] text-[#6B7280]">
                    {event.policy_violations?.length > 0
                      ? event.policy_violations.map((v, i) => (
                          <span key={i} className="mr-1 inline-flex items-center rounded-full bg-[#DBEAFE] px-1.5 py-0.5 text-[10px] font-semibold text-[#1D4ED8]">{v}</span>
                        ))
                      : <span className="text-[#D1D5DB]">—</span>
                    }
                  </td>
                  <td className="px-3.5 py-2.5">
                    <button
                      onClick={() => setSelected(event)}
                      className="rounded-[5px] border border-[#D1D5DB] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-colors whitespace-nowrap"
                    >
                      Show Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-[#E5E7EB] bg-[#F9FAFB] px-3.5 py-3">
        <span className="text-[12px] text-[#6B7280]">
          {totalPages > 0 ? `Page ${filters.page} of ${totalPages.toLocaleString()}` : ''}
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={() => onPageChange(filters.page - 1)}
            disabled={filters.page <= 1}
            className="rounded-[5px] border border-[#D1D5DB] bg-white px-3 py-1 text-[12px] font-semibold text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Prev
          </button>
          <button
            onClick={() => onPageChange(filters.page + 1)}
            disabled={filters.page >= totalPages}
            className="rounded-[5px] border border-[#D1D5DB] bg-white px-3 py-1 text-[12px] font-semibold text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      </div>

      <AuditLogDrawer event={selected} onClose={() => setSelected(null)} />
    </>
  );
}
