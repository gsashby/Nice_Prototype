'use client';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  payload: string;
  eventCount: number;
};

export default function SiemModal({ open, onClose, payload, eventCount }: Props) {
  const [visible, setVisible] = useState(false);
  const [pushed, setPushed] = useState(false);

  useEffect(() => { setVisible(open); setPushed(false); }, [open]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity .2s' }}
        onClick={onClose}
      />
      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-[680px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-white"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translate(-50%,-50%) scale(1)' : 'translate(-50%,-50%) scale(.96)',
          transition: 'opacity .2s, transform .2s',
          border: '1px solid #E5E7EB',
          boxShadow: '0 8px 40px rgba(0,0,0,.14)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between" style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
          <div>
            <div className="text-[13.5px] font-bold text-[#111827]">SIEM Push Preview</div>
            <div className="text-[11px] text-[#9CA3AF]">CEF format — {eventCount.toLocaleString()} events · showing first 5</div>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-[#6B7280] hover:bg-[#F3F4F6] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Payload preview */}
        <div style={{ padding: '16px 20px' }}>
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[.06em] text-[#9CA3AF]">Payload Preview (CEF)</div>
          <pre className="overflow-x-auto rounded-[6px] border border-[#E5E7EB] bg-[#F9FAFB] p-4 font-mono text-[10.5px] leading-relaxed text-[#374151] whitespace-pre-wrap">
            {payload}
          </pre>

          {pushed && (
            <div className="mt-3 rounded-[6px] border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-2.5 text-[12.5px] font-semibold text-[#15803D]">
              ✓ {eventCount.toLocaleString()} events pushed to SIEM endpoint
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between" style={{ padding: '12px 20px', borderTop: '1px solid #E5E7EB', background: '#F9FAFB' }}>
          <div className="text-[11.5px] text-[#9CA3AF]">Target: <span className="font-mono text-[#374151]">siem.internal:514</span></div>
          <div className="flex gap-2">
            <button onClick={onClose} className="inline-flex items-center rounded-[5px] border border-[#D1D5DB] bg-white font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-all" style={{ padding: '5px 12px', fontSize: 12 }}>
              Cancel
            </button>
            <button
              onClick={() => setPushed(true)}
              disabled={pushed}
              className="inline-flex items-center rounded-[5px] bg-[#2563EB] font-semibold text-white hover:bg-[#1D4ED8] transition-all disabled:opacity-60"
              style={{ padding: '5px 12px', fontSize: 12 }}
            >
              {pushed ? 'Pushed' : `Push ${eventCount.toLocaleString()} Events`}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
