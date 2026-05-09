'use client';
import { useState } from 'react';
import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';
import { useAuditLog } from '@/hooks/useAuditLog';
import AuditLogDrawer from '@/components/audit-log/AuditLogDrawer';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import type { AuditEvent } from '@/types/audit';

type Outcome = 'blocked' | 'flagged';
type Severity = 'critical' | 'high' | 'medium' | 'low';

const PAGE_SIZE = 25;

function deriveSeverity(outcome: string, violationCount: number): Severity {
  if (outcome === 'blocked') return violationCount > 0 ? 'critical' : 'high';
  return violationCount > 0 ? 'medium' : 'low';
}

const severityStyles: Record<Severity, { badge: string; dot: string; ring: string }> = {
  critical: { badge: 'bg-[#FEE2E2] text-[#DC2626]', dot: '#EF4444', ring: '#FCA5A5' },
  high:     { badge: 'bg-[#FFEDD5] text-[#C2410C]', dot: '#F97316', ring: '#FDBA74' },
  medium:   { badge: 'bg-[#FEF3C7] text-[#92400E]', dot: '#F59E0B', ring: '#FCD34D' },
  low:      { badge: 'bg-[#DBEAFE] text-[#1D4ED8]', dot: '#3B82F6', ring: '#93C5FD' },
};

function formatDateLabel(iso: string): string {
  const d = parseISO(iso);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMMM d, yyyy');
}

function groupByDay(events: AuditEvent[]): { label: string; events: AuditEvent[] }[] {
  const map = new Map<string, AuditEvent[]>();
  for (const e of events) {
    const key = format(parseISO(e.event_time), 'yyyy-MM-dd');
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return Array.from(map.entries()).map(([key, evts]) => ({
    label: formatDateLabel(key + 'T00:00:00'),
    events: evts,
  }));
}

function IncidentCard({ event, onClick }: { event: AuditEvent; onClick: () => void }) {
  const severity = deriveSeverity(event.outcome, event.policy_violations?.length ?? 0);
  const { badge, dot } = severityStyles[severity];
  const confColor = event.confidence_score >= 0.85 ? '#16A34A' : event.confidence_score >= 0.70 ? '#D97706' : '#DC2626';
  const title = event.outcome === 'blocked' ? 'Action Blocked' : 'Action Flagged';

  return (
    <div className="relative pl-8 pb-5">
      {/* Timeline dot */}
      <span
        className="absolute left-0 top-1.5 flex h-3.5 w-3.5 -translate-x-1/2 items-center justify-center rounded-full border-2 border-white"
        style={{ background: dot }}
      />

      {/* Card */}
      <div
        className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.05)] hover:shadow-[0_2px_8px_rgba(0,0,0,.08)] transition-shadow cursor-pointer"
        onClick={onClick}
      >
        {/* Card header */}
        <div className="flex items-start justify-between gap-3" style={{ padding: '12px 14px', borderBottom: '1px solid #F3F4F6' }}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[.04em] ${badge}`}>
              {severity}
            </span>
            <span className="text-[13px] font-semibold text-[#111827]">{title}</span>
            <span className="text-[12px] text-[#6B7280]">— {event.event_type}</span>
          </div>
          <div className="flex-shrink-0 text-right">
            <div className="font-mono text-[11px] text-[#9CA3AF]">
              {format(parseISO(event.event_time), 'HH:mm:ss')}
            </div>
            <div className="text-[10.5px] text-[#9CA3AF]">
              {formatDistanceToNow(parseISO(event.event_time), { addSuffix: true })}
            </div>
          </div>
        </div>

        {/* Card body */}
        <div style={{ padding: '10px 14px' }}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2">
            <span className="text-[12px] text-[#374151]">
              <span className="text-[#9CA3AF]">Model </span>
              <span className="font-medium">{event.model_name || '—'}</span>
            </span>
            <span className="text-[12px]">
              <span className="text-[#9CA3AF]">Confidence </span>
              <span className="font-semibold tabular-nums" style={{ color: confColor }}>
                {(event.confidence_score * 100).toFixed(1)}%
              </span>
            </span>
            {event.action && (
              <span className="text-[12px] text-[#374151]">
                <span className="text-[#9CA3AF]">Action </span>
                <span className="font-mono text-[11px]">{event.action}</span>
              </span>
            )}
          </div>

          {event.policy_violations?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {event.policy_violations.map((v, i) => (
                <span key={i} className="inline-flex items-center rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[10.5px] font-semibold text-[#DC2626]">
                  {v}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="font-mono text-[10.5px] text-[#9CA3AF] truncate max-w-[280px]">
              {event.session_id || event.agent_id || event.id.slice(0, 12).toUpperCase()}
            </span>
            <span className="text-[11.5px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] flex-shrink-0">
              View Details →
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

type Props = { outcome: Outcome };

export default function IncidentTimeline({ outcome }: Props) {
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<AuditEvent | null>(null);

  const { data, isLoading, isFetching } = useAuditLog({ page: 1, pageSize, outcome });
  const events = data?.events ?? [];
  const total = data?.total ?? 0;
  const hasMore = events.length < total;
  const groups = groupByDay(events);

  if (isLoading) {
    return (
      <div className="space-y-3 pl-4">
        {Array.from({ length: 5 }).map((_, i) => <LoadingSkeleton key={i} className="h-24 rounded-lg" />)}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-[13px] text-[#9CA3AF]">
        No {outcome} incidents in this period
      </div>
    );
  }

  return (
    <>
      {/* Timeline */}
      <div className="relative ml-4" style={{ borderLeft: '1px solid #E5E7EB' }}>
        {groups.map(({ label, events: dayEvents }) => (
          <div key={label}>
            {/* Date separator */}
            <div className="relative pl-8 pb-3 pt-1">
              <span className="absolute left-0 top-2.5 flex h-2 w-2 -translate-x-1/2 rounded-full bg-[#D1D5DB]" />
              <span className="text-[11px] font-bold uppercase tracking-[.07em] text-[#9CA3AF]">{label}</span>
            </div>

            {dayEvents.map((event) => (
              <IncidentCard key={event.id} event={event} onClick={() => setSelected(event)} />
            ))}
          </div>
        ))}

        {/* Load More */}
        {hasMore && (
          <div className="relative pl-8 pt-1 pb-2">
            <span className="absolute left-0 top-3 flex h-2 w-2 -translate-x-1/2 rounded-full bg-[#E5E7EB]" />
            <button
              onClick={() => setPageSize((s) => s + PAGE_SIZE)}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 rounded-[5px] border border-[#D1D5DB] bg-white font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-all disabled:opacity-60"
              style={{ padding: '5px 14px', fontSize: 12 }}
            >
              {isFetching ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#D1D5DB] border-t-[#374151]" />
              ) : null}
              {isFetching ? 'Loading…' : `Load More (${(total - events.length).toLocaleString()} remaining)`}
            </button>
          </div>
        )}
      </div>

      <AuditLogDrawer event={selected} onClose={() => setSelected(null)} />
    </>
  );
}
