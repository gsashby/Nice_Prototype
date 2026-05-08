'use client';
import { useEffect, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { X } from 'lucide-react';
import { useAuditLog } from '@/hooks/useAuditLog';
import { useAlertsStore } from '@/stores/alerts-store';
import type { LiveAlert } from '@/hooks/useAlerts';

type Props = {
  alert: LiveAlert | null;
  onClose: () => void;
};

const severityBadge: Record<string, string> = {
  critical: 'bg-[#FEE2E2] text-[#DC2626]',
  high:     'bg-[#FFEDD5] text-[#C2410C]',
  medium:   'bg-[#FEF3C7] text-[#92400E]',
  low:      'bg-[#DBEAFE] text-[#1D4ED8]',
};

const severityDot: Record<string, string> = {
  critical: 'bg-[#EF4444]',
  high:     'bg-[#F97316]',
  medium:   'bg-[#F59E0B]',
  low:      'bg-[#3B82F6]',
};

const outcomeForSeverity: Record<string, string> = {
  critical: 'blocked',
  high:     'blocked',
  medium:   'flagged',
  low:      'flagged',
};

const outcomeBadge: Record<string, string> = {
  allowed:      'bg-[#DCFCE7] text-[#15803D]',
  blocked:      'bg-[#FEE2E2] text-[#DC2626]',
  flagged:      'bg-[#FEF3C7] text-[#92400E]',
  'auto-applied': 'bg-[#DBEAFE] text-[#1D4ED8]',
};

function MiniAuditList({ severity }: { severity: string }) {
  const outcome = outcomeForSeverity[severity] ?? 'flagged';
  const { data, isLoading } = useAuditLog({ page: 1, pageSize: 5, outcome });
  const events = data?.events ?? [];

  if (isLoading) {
    return <div className="py-4 text-center text-[12px] text-[#9CA3AF]">Loading events…</div>;
  }
  if (events.length === 0) {
    return <div className="py-4 text-center text-[12px] text-[#9CA3AF]">No related events found</div>;
  }

  return (
    <div className="divide-y divide-[#F3F4F6]">
      {events.map((e) => (
        <div key={e.id} className="flex items-start gap-2.5 py-2.5">
          <span className={`mt-0.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${outcomeBadge[e.outcome] ?? 'bg-[#F3F4F6] text-[#6B7280]'}`}>
            {e.outcome}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-mono text-[10.5px] text-[#374151]">{e.session_id?.slice(0, 16) ?? '—'}</div>
            <div className="text-[10.5px] text-[#9CA3AF]">
              {e.model_name} · {(e.confidence_score * 100).toFixed(1)}% conf · {format(new Date(e.event_time), 'HH:mm:ss')}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AlertDrawer({ alert, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const [action, setAction] = useState<'escalated' | 'dismissed' | null>(null);
  const acknowledgeAlert = useAlertsStore((s) => s.acknowledgeAlert);

  useEffect(() => {
    if (alert) {
      setVisible(true);
      setAction(null);
    } else {
      setVisible(false);
    }
  }, [alert]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!alert) return null;

  function handleAcknowledge() {
    acknowledgeAlert(alert!.id);
    onClose();
  }

  function handleEscalate() {
    setAction('escalated');
    setTimeout(onClose, 1200);
  }

  function handleDismiss() {
    setAction('dismissed');
    setTimeout(onClose, 800);
  }

  const sev = alert.severity;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity .2s' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 z-50 flex h-full w-[440px] flex-col bg-white shadow-[−4px_0_24px_rgba(0,0,0,.12)]"
        style={{
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform .25s cubic-bezier(.4,0,.2,1)',
          borderLeft: '1px solid #E5E7EB',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between" style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${severityDot[sev] ?? severityDot.low}`} />
            <div className="min-w-0">
              <div className="text-[13.5px] font-bold text-[#111827] leading-tight">{alert.title}</div>
              <div className="text-[11px] text-[#9CA3AF] mt-0.5">
                {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-3 flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-md text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '16px 20px' }}>

          {/* Alert details */}
          <div className="mb-4">
            <p className="text-[12.5px] text-[#374151] leading-relaxed">{alert.description}</p>
          </div>

          {/* Severity / policy callout */}
          <div
            className="mb-5 rounded-[6px]"
            style={{
              padding: '12px 14px',
              background: sev === 'critical' ? '#FEF2F2' : sev === 'high' ? '#FFF7ED' : sev === 'medium' ? '#FFFBEB' : '#EFF6FF',
              border: `1px solid ${sev === 'critical' ? '#FECACA' : sev === 'high' ? '#FED7AA' : sev === 'medium' ? '#FDE68A' : '#BFDBFE'}`,
            }}
          >
            <div className="mb-1.5 flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${severityBadge[sev] ?? severityBadge.low}`}>
                {sev} severity
              </span>
              <span className="text-[11px] text-[#6B7280]">Policy violation detected</span>
            </div>
            <p className="text-[11.5px] leading-relaxed" style={{ color: sev === 'critical' ? '#991B1B' : sev === 'high' ? '#9A3412' : sev === 'medium' ? '#78350F' : '#1E40AF' }}>
              {sev === 'critical' || sev === 'high'
                ? 'This alert requires immediate review. Affected AI decisions have been flagged and may be pending human approval.'
                : 'This alert has been flagged for review. Monitor related audit events for further context.'}
            </p>
          </div>

          {/* Mini audit list */}
          <div className="mb-5">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[.06em] text-[#9CA3AF]">
              Related Audit Events
            </div>
            <div className="rounded-[6px] border border-[#E5E7EB] bg-[#F9FAFB]" style={{ padding: '0 12px' }}>
              <MiniAuditList severity={sev} />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div
          className="flex items-center gap-2"
          style={{ padding: '14px 20px', borderTop: '1px solid #E5E7EB', background: '#F9FAFB' }}
        >
          {action ? (
            <div className="text-[12.5px] font-semibold text-[#16A34A]">
              {action === 'escalated' ? '↑ Escalated to team' : '✓ Dismissed'}
            </div>
          ) : (
            <>
              <button
                onClick={handleAcknowledge}
                className="inline-flex items-center rounded-[5px] bg-[#2563EB] font-semibold text-white hover:bg-[#1D4ED8] transition-all"
                style={{ padding: '5px 12px', fontSize: 12 }}
              >
                Acknowledge
              </button>
              <button
                onClick={handleEscalate}
                className="inline-flex items-center rounded-[5px] border border-[#D1D5DB] bg-white font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-all"
                style={{ padding: '5px 12px', fontSize: 12 }}
              >
                Escalate
              </button>
              <button
                onClick={handleDismiss}
                className="inline-flex items-center rounded-[5px] border border-[#D1D5DB] bg-white font-semibold text-[#6B7280] hover:bg-[#F9FAFB] transition-all"
                style={{ padding: '5px 12px', fontSize: 12 }}
              >
                Dismiss
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
