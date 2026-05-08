'use client';
import { useEffect, useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuditLog } from '@/hooks/useAuditLog';
import { useAlertsStore } from '@/stores/alerts-store';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import type { LiveAlert } from '@/hooks/useAlerts';

type Props = { alert: LiveAlert | null; onClose: () => void };

type Parsed = { eventType?: string; outcome?: string; action?: string; modelName?: string };

// Description format from API: "[event_type] outcome: action on model model_name"
function parseDescription(description: string): Parsed {
  const match = description.match(/^\[([^\]]+)\]\s+([^:]+):\s+(\S+)\s+on model\s+(.+)$/);
  if (!match) return {};
  return { eventType: match[1], outcome: match[2], action: match[3], modelName: match[4] };
}

const severityStyles: Record<LiveAlert['severity'], { bg: string; border: string; dot: string; text: string; label: string }> = {
  critical: { bg: '#FEF2F2', border: '#FECACA', dot: '#EF4444', text: '#991B1B', label: 'Critical' },
  high:     { bg: '#FFFBEB', border: '#FDE68A', dot: '#F59E0B', text: '#92400E', label: 'High' },
  medium:   { bg: '#FFFBEB', border: '#FDE68A', dot: '#F59E0B', text: '#92400E', label: 'Medium' },
  low:      { bg: '#EFF6FF', border: '#BFDBFE', dot: '#3B82F6', text: '#1E40AF', label: 'Low' },
};

const outcomeBadge: Record<string, string> = {
  blocked: 'bg-[#FEE2E2] text-[#DC2626]',
  flagged: 'bg-[#FEF3C7] text-[#92400E]',
  allowed: 'bg-[#DCFCE7] text-[#15803D]',
};

export default function InvestigateDrawer({ alert, onClose }: Props) {
  const [status, setStatus] = useState<'open' | 'acknowledged' | 'escalated' | 'dismissed'>('open');
  const acknowledgeAlert = useAlertsStore((s) => s.acknowledgeAlert);

  const parsed = useMemo(() => (alert ? parseDescription(alert.description) : {}), [alert]);

  const auditFilters = useMemo(
    () => ({
      page: 1,
      pageSize: 5,
      eventType: parsed.eventType,
      outcome: parsed.outcome,
    }),
    [parsed.eventType, parsed.outcome],
  );

  const { data: auditData, isLoading: auditLoading } = useAuditLog(auditFilters);
  const events = auditData?.events ?? [];

  // Reset status when a new alert is opened
  useEffect(() => {
    if (alert) setStatus('open');
  }, [alert?.id]);

  // ESC to close
  useEffect(() => {
    if (!alert) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [alert, onClose]);

  if (!alert) return null;

  const sev = severityStyles[alert.severity] ?? severityStyles.low;

  const handleAcknowledge = () => {
    acknowledgeAlert(alert.id);
    setStatus('acknowledged');
  };
  const handleEscalate = () => setStatus('escalated');
  const handleDismiss = () => {
    setStatus('dismissed');
    onClose();
  };

  const statusBanner =
    status === 'acknowledged'
      ? { text: 'Alert acknowledged', cls: 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]' }
      : status === 'escalated'
      ? { text: 'Escalated to security on-call', cls: 'bg-[#DBEAFE] text-[#1D4ED8] border-[#BFDBFE]' }
      : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Alert investigation">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="relative flex h-full w-[460px] flex-col border-l border-[#E5E7EB] bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#E5E7EB] px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: sev.dot }} />
              <span className="text-[10.5px] font-bold uppercase tracking-[.06em]" style={{ color: sev.text }}>
                {sev.label}
              </span>
              <span className="font-mono text-[10.5px] text-[#9CA3AF]">{alert.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <h2 className="mt-1 text-[15px] font-bold text-[#111827] leading-snug">{alert.title}</h2>
            <p className="mt-0.5 text-[11.5px] text-[#9CA3AF]">
              {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-3 flex-shrink-0 rounded-md p-1 text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>

        {/* Status banner */}
        {statusBanner && (
          <div className={`border-b px-5 py-2 text-[12px] font-semibold ${statusBanner.cls}`}>
            {statusBanner.text}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Severity / Policy callout */}
          <div
            className="rounded-md border px-3.5 py-2.5"
            style={{ background: sev.bg, borderColor: sev.border }}
          >
            <div className="text-[11px] font-bold uppercase tracking-[.05em]" style={{ color: sev.text }}>
              {sev.label} severity · {parsed.outcome ?? 'policy'} action
            </div>
            <p className="mt-1 text-[12.5px] leading-snug" style={{ color: sev.text }}>
              {alert.description}
            </p>
          </div>

          {/* Alert detail grid */}
          <section>
            <div className="text-[11px] font-bold uppercase tracking-[.05em] text-[#6B7280] mb-2">Details</div>
            <dl className="grid grid-cols-[110px_1fr] gap-y-1.5 text-[12px]">
              <dt className="text-[#6B7280]">Module</dt>
              <dd className="text-[#111827] font-medium">{parsed.eventType ?? '—'}</dd>
              <dt className="text-[#6B7280]">Action</dt>
              <dd className="text-[#111827] font-mono text-[11.5px]">{parsed.action ?? '—'}</dd>
              <dt className="text-[#6B7280]">Model</dt>
              <dd className="text-[#111827] font-medium">{parsed.modelName ?? '—'}</dd>
              <dt className="text-[#6B7280]">Outcome</dt>
              <dd>
                {parsed.outcome ? (
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${outcomeBadge[parsed.outcome] ?? 'bg-[#F3F4F6] text-[#4B5563]'}`}>
                    {parsed.outcome}
                  </span>
                ) : (
                  '—'
                )}
              </dd>
              <dt className="text-[#6B7280]">Timestamp</dt>
              <dd className="text-[#111827] font-mono text-[11.5px]">
                {format(new Date(alert.timestamp), 'yyyy-MM-dd HH:mm:ss')}
              </dd>
            </dl>
          </section>

          {/* Mini audit event list */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-[.05em] text-[#6B7280]">
                Related Audit Events
              </div>
              {parsed.eventType && (
                <span className="text-[10.5px] text-[#9CA3AF]">
                  filtered: {parsed.eventType}
                  {parsed.outcome ? ` · ${parsed.outcome}` : ''}
                </span>
              )}
            </div>

            {auditLoading ? (
              <div className="space-y-1.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <LoadingSkeleton key={i} className="h-10" />
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="rounded-md border border-dashed border-[#E5E7EB] bg-[#F9FAFB] py-6 text-center text-[12px] text-[#6B7280]">
                No matching audit events
              </div>
            ) : (
              <ul className="divide-y divide-[#F3F4F6] rounded-md border border-[#E5E7EB] bg-white">
                {events.map((e) => (
                  <li key={e.id} className="px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10.5px] text-[#6B7280]">
                        {e.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${outcomeBadge[e.outcome] ?? 'bg-[#F3F4F6] text-[#4B5563]'}`}
                      >
                        {e.outcome}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[12px] text-[#111827] leading-snug truncate">
                      {e.action} <span className="text-[#9CA3AF]">on</span> {e.model_name || '—'}
                    </div>
                    <div className="mt-0.5 font-mono text-[10.5px] text-[#9CA3AF]">
                      {format(new Date(e.event_time), 'yyyy-MM-dd HH:mm:ss')}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Action buttons */}
        <div className="border-t border-[#E5E7EB] bg-[#F9FAFB] px-5 py-3 flex items-center gap-2">
          <button
            onClick={handleAcknowledge}
            disabled={status === 'acknowledged'}
            className="flex-1 rounded-[5px] bg-[#2563EB] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Acknowledge
          </button>
          <button
            onClick={handleEscalate}
            disabled={status === 'escalated'}
            className="flex-1 rounded-[5px] border border-[#D1D5DB] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#374151] hover:bg-[#F3F4F6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Escalate
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 rounded-[5px] border border-[#D1D5DB] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
          >
            Dismiss
          </button>
        </div>
      </aside>
    </div>
  );
}
