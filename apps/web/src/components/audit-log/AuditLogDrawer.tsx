'use client';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import type { AuditEvent } from '@/types/audit';

type Props = { event: AuditEvent | null; onClose: () => void };

const outcomeBadge: Record<string, string> = {
  allowed:        'bg-[#DCFCE7] text-[#15803D]',
  blocked:        'bg-[#FEE2E2] text-[#DC2626]',
  flagged:        'bg-[#FEF3C7] text-[#92400E]',
  'auto-applied': 'bg-[#DBEAFE] text-[#1D4ED8]',
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2.5 border-b border-[#F3F4F6] last:border-0">
      <div className="w-32 flex-shrink-0 text-[11px] font-semibold uppercase tracking-[.05em] text-[#9CA3AF] pt-0.5">{label}</div>
      <div className="flex-1 min-w-0 text-[12.5px] text-[#374151]">{children}</div>
    </div>
  );
}

export default function AuditLogDrawer({ event, onClose }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!!event);
  }, [event]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!event) return null;

  const confidence = (event.confidence_score * 100).toFixed(1);
  const confColor = event.confidence_score >= 0.85 ? '#16A34A' : event.confidence_score >= 0.70 ? '#D97706' : '#DC2626';
  const metadata = event.metadata && Object.keys(event.metadata).length > 0 ? event.metadata : null;

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
        className="fixed right-0 top-0 z-50 flex h-full w-[480px] flex-col bg-white"
        style={{
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform .25s cubic-bezier(.4,0,.2,1)',
          borderLeft: '1px solid #E5E7EB',
          boxShadow: '-4px 0 24px rgba(0,0,0,.08)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between" style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
          <div>
            <div className="text-[13.5px] font-bold text-[#111827]">Audit Event Detail</div>
            <div className="mt-0.5 font-mono text-[11px] text-[#9CA3AF]">{event.id}</div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '16px 20px' }}>

          {/* Outcome callout */}
          <div
            className="mb-5 flex items-center gap-3 rounded-[6px]"
            style={{
              padding: '12px 14px',
              background: event.outcome === 'blocked' ? '#FEF2F2' : event.outcome === 'flagged' ? '#FFFBEB' : '#F0FDF4',
              border: `1px solid ${event.outcome === 'blocked' ? '#FECACA' : event.outcome === 'flagged' ? '#FDE68A' : '#BBF7D0'}`,
            }}
          >
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${outcomeBadge[event.outcome] ?? 'bg-[#F3F4F6] text-[#4B5563]'}`}>
              {event.outcome}
            </span>
            <div>
              <div className="text-[12px] font-semibold text-[#111827]">{event.event_type}</div>
              <div className="text-[11px] text-[#6B7280]">
                {format(new Date(event.event_time), "MMM d, yyyy 'at' HH:mm:ss")}
              </div>
            </div>
          </div>

          {/* Detail rows */}
          <div className="rounded-[6px] border border-[#E5E7EB] bg-white" style={{ padding: '0 14px' }}>
            <Row label="Event ID">
              <span className="font-mono text-[11.5px]">{event.id.toUpperCase()}</span>
            </Row>
            <Row label="Timestamp">
              <span className="font-mono">{format(new Date(event.event_time), 'yyyy-MM-dd HH:mm:ss')}</span>
            </Row>
            <Row label="Module">
              {event.event_type}
            </Row>
            <Row label="Model Version">
              <span className="font-mono">{event.model_name || '—'}</span>
            </Row>
            <Row label="Session ID">
              <span className="break-all font-mono text-[11px]">{event.session_id || '—'}</span>
            </Row>
            <Row label="Agent ID">
              <span className="break-all font-mono text-[11px]">{event.agent_id || '—'}</span>
            </Row>
            <Row label="Confidence">
              <span className="font-semibold" style={{ color: confColor }}>{confidence}%</span>
            </Row>
            <Row label="Action">
              {event.action || '—'}
            </Row>
          </div>

          {/* Policy violations */}
          {event.policy_violations?.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[.06em] text-[#9CA3AF]">Policy Violations</div>
              <div className="flex flex-wrap gap-1.5">
                {event.policy_violations.map((v, i) => (
                  <span key={i} className="inline-flex items-center rounded-full bg-[#FEE2E2] px-2.5 py-1 text-[11px] font-semibold text-[#DC2626]">
                    {v}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          {metadata && (
            <div className="mt-4">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[.06em] text-[#9CA3AF]">Metadata</div>
              <pre className="overflow-x-auto rounded-[6px] border border-[#E5E7EB] bg-[#F9FAFB] p-3 font-mono text-[11px] text-[#374151]">
                {JSON.stringify(metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2"
          style={{ padding: '14px 20px', borderTop: '1px solid #E5E7EB', background: '#F9FAFB' }}
        >
          <button
            onClick={onClose}
            className="inline-flex items-center rounded-[5px] border border-[#D1D5DB] bg-white font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-all"
            style={{ padding: '5px 12px', fontSize: 12 }}
          >
            Close
          </button>
          <button
            className="inline-flex items-center rounded-[5px] bg-[#2563EB] font-semibold text-white hover:bg-[#1D4ED8] transition-all"
            style={{ padding: '5px 12px', fontSize: 12 }}
          >
            Export Event
          </button>
        </div>
      </div>
    </>
  );
}
