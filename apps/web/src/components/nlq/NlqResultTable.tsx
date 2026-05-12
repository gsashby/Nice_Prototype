'use client';
import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Sparkles, Info } from 'lucide-react';
import { useAuditLog } from '@/hooks/useAuditLog';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import AuditLogDrawer from '@/components/audit-log/AuditLogDrawer';
import SortTh from '@/components/shared/SortTh';
import { useSortable } from '@/lib/useSortable';
import type { AuditEvent } from '@/types/audit';
import type { NlqResult } from '@/lib/parseNlq';

type Props = {
  result: NlqResult | null;
  onClear?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

const outcomeBadge: Record<string, string> = {
  allowed:        'bg-[#DCFCE7] text-[#15803D]',
  blocked:        'bg-[#FEE2E2] text-[#DC2626]',
  flagged:        'bg-[#FEF3C7] text-[#92400E]',
  'auto-applied': 'bg-[#DBEAFE] text-[#1D4ED8]',
};

function EmptyState() {
  return (
    <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
      <div style={{ padding: '16px 16px 14px', borderBottom: '1px solid #E5E7EB' }}>
        <div className="text-[13.5px] font-bold text-[#111827]">Query Results</div>
        <div className="text-[11.5px] text-[#9CA3AF]">Results will appear here after you run a query</div>
      </div>
      <div className="flex items-center justify-center py-16 text-[13px] text-[#9CA3AF]">
        Run a query above to see results
      </div>
    </div>
  );
}

function TagRow({ result, onClear, onToggleCollapsed, collapsed }: Props & { collapsed?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 justify-end">
      {result?.source === 'ai' && (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#F5F3FF] px-2 py-0.5 text-[11px] font-semibold text-[#7C3AED]">
          <Sparkles className="h-2.5 w-2.5" />
          AI
        </span>
      )}
      {result?.tags.map((tag) => (
        <span key={tag} className="inline-flex items-center rounded-full bg-[#EFF6FF] px-2 py-0.5 text-[11px] font-semibold text-[#2563EB]">
          {tag}
        </span>
      ))}
      {onClear && (
        <button
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          className="inline-flex items-center rounded-[5px] border border-[#D1D5DB] bg-white font-semibold text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#374151] transition-all"
          style={{ padding: '3px 10px', fontSize: 12 }}
        >
          Clear
        </button>
      )}
      {onToggleCollapsed && (
        collapsed
          ? <ChevronDown className="h-4 w-4 text-[#9CA3AF]" />
          : <ChevronUp className="h-4 w-4 text-[#9CA3AF]" />
      )}
    </div>
  );
}

// Renders a text answer for governance knowledge questions
function AnswerCard({ result, onClear }: { result: NlqResult; onClear?: () => void }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #E5E7EB' }}>
        <div className="flex items-center justify-between">
          <div className="text-[13.5px] font-bold text-[#111827]">Governance Answer</div>
          <TagRow result={result} onClear={onClear} />
        </div>
      </div>
      <div className="p-4">
        <p className="text-[13.5px] leading-relaxed text-[#374151]">{result.answer}</p>
      </div>
    </div>
  );
}

export default function NlqResultTable({ result, onClear, collapsed, onToggleCollapsed }: Props) {
  const { data, isLoading, isError } = useAuditLog(
    result?.filters ?? { page: 1, pageSize: 25 },
  );
  const [selected, setSelected] = useState<AuditEvent | null>(null);

  const events = data?.events ?? [];
  const total = data?.total ?? 0;
  const { sorted, sort, toggle } = useSortable<AuditEvent>(events);

  if (!result) return <EmptyState />;

  // Text answer — no event table
  if (result.answer) return <AnswerCard result={result} onClear={onClear} />;

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
        {/* Header */}
        <div
          className={onToggleCollapsed ? 'cursor-pointer hover:bg-[#F9FAFB] transition-colors' : ''}
          style={{ padding: '14px 16px', borderBottom: collapsed ? 'none' : '1px solid #E5E7EB' }}
          onClick={onToggleCollapsed}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13.5px] font-bold text-[#111827]">Query Results</div>
              {!isLoading && !collapsed && (
                <div className="text-[11.5px] text-[#9CA3AF]">{total.toLocaleString()} events matched — click any row for full detail</div>
              )}
            </div>
            <TagRow result={result} onClear={onClear} onToggleCollapsed={onToggleCollapsed} collapsed={collapsed} />
          </div>
        </div>

        {/* Context banner for analytical questions */}
        {!collapsed && result.context && (
          <div className="flex items-center gap-2 border-b border-[#E5E7EB] bg-[#F0F9FF] px-4 py-2">
            <Info className="h-3.5 w-3.5 shrink-0 text-[#0284C7]" />
            <p className="text-[12px] text-[#0369A1]">{result.context}</p>
          </div>
        )}

        {/* Body */}
        {!collapsed && (
          isLoading ? (
            <div className="space-y-px p-4">
              {Array.from({ length: 6 }).map((_, i) => <LoadingSkeleton key={i} className="h-10" />)}
            </div>
          ) : isError ? (
            <div className="p-4 text-[13px] text-red-600">Failed to load results — is the API running?</div>
          ) : events.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-[13px] text-[#9CA3AF]">
              No events matched your query
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#E5E7EB] bg-[#F9FAFB] text-left">
                    <SortTh label="Event ID"    colKey="id"               sort={sort} onToggle={toggle} className="pl-4 pr-3.5" />
                    <SortTh label="Timestamp"   colKey="event_time"       sort={sort} onToggle={toggle} className="px-3.5" />
                    <SortTh label="Module"      colKey="event_type"       sort={sort} onToggle={toggle} className="px-3.5" />
                    <SortTh label="Model"       colKey="model_name"       sort={sort} onToggle={toggle} className="px-3.5" />
                    <SortTh label="Confidence"  colKey="confidence_score" sort={sort} onToggle={toggle} className="px-3.5" />
                    <SortTh label="Outcome"     colKey="outcome"          sort={sort} onToggle={toggle} className="px-3.5" />
                    <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[.05em] text-[#6B7280] whitespace-nowrap">Policy Violations</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((event) => (
                    <tr
                      key={event.id}
                      onClick={() => setSelected(event)}
                      className="border-b border-[#F3F4F6] hover:bg-[#EFF6FF] cursor-pointer transition-colors"
                    >
                      <td className="pl-4 pr-3.5 py-2.5 font-mono text-[11px] text-[#6B7280]">
                        {event.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#6B7280] whitespace-nowrap">
                        {format(new Date(event.event_time), 'yyyy-MM-dd HH:mm:ss')}
                      </td>
                      <td className="px-3.5 py-2.5 text-[12.5px] text-[#374151]">{event.event_type}</td>
                      <td className="px-3.5 py-2.5 font-mono text-[11.5px] text-[#374151]">{event.model_name || '—'}</td>
                      <td className="px-3.5 py-2.5 text-[12.5px] text-[#374151]">
                        {(event.confidence_score * 100).toFixed(1)}%
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${outcomeBadge[event.outcome] ?? 'bg-[#F3F4F6] text-[#4B5563]'}`}>
                          {event.outcome}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-[11px] text-[#6B7280]">
                        {event.policy_violations?.length > 0
                          ? event.policy_violations.map((v, i) => (
                              <span key={i} className="mr-1 inline-flex items-center rounded-full bg-[#DBEAFE] px-1.5 py-0.5 text-[10px] font-semibold text-[#1D4ED8]">{v}</span>
                            ))
                          : <span className="text-[#D1D5DB]">—</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      <AuditLogDrawer event={selected} onClose={() => setSelected(null)} />
    </>
  );
}
