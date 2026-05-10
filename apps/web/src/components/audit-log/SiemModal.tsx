'use client';
import { useEffect, useState } from 'react';
import { X, Settings } from 'lucide-react';
import SiemConfigModal, { DEFAULT_SIEM_CONFIG, type SiemConfig } from './SiemConfigModal';

type Props = {
  open: boolean;
  onClose: () => void;
  payload: string;
  eventCount: number;
};

export default function SiemModal({ open, onClose, payload, eventCount }: Props) {
  const [visible, setVisible] = useState(false);
  const [pushed, setPushed] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [config, setConfig] = useState<SiemConfig>(DEFAULT_SIEM_CONFIG);

  useEffect(() => { setVisible(open); setPushed(false); }, [open]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !configOpen) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, configOpen]);

  if (!open) return null;

  const displayEndpoint = (() => {
    try {
      const url = new URL(config.endpointUrl);
      return `${url.hostname}:${url.port || (url.protocol === 'https:' ? '443' : '80')}`;
    } catch {
      return config.endpointUrl;
    }
  })();

  return (
    <>
      {/* Backdrop — behind config modal when config is open */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity .2s' }}
        onClick={() => { if (!configOpen) onClose(); }}
      />

      {/* SIEM modal */}
      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-[680px] overflow-hidden rounded-xl bg-white"
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
            <div className="text-[11px] text-[#9CA3AF]">
              {config.format} format · {eventCount.toLocaleString()} events · showing first 5
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setConfigOpen(true)}
              title="Configure SIEM integration"
              className="flex h-7 w-7 items-center justify-center rounded-md text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] transition-colors"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Integration summary strip */}
        <div className="flex items-center gap-4 border-b border-[#F3F4F6] bg-[#F9FAFB]" style={{ padding: '8px 20px' }}>
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${config.enabled ? 'bg-[#16A34A]' : 'bg-[#9CA3AF]'}`} />
            <span className="text-[11.5px] font-semibold text-[#374151]">{config.name}</span>
          </div>
          <span className="text-[11px] text-[#9CA3AF]">→</span>
          <span className="font-mono text-[11px] text-[#374151]">{displayEndpoint}</span>
          <span className="ml-auto text-[11px] text-[#9CA3AF]">Index: <span className="font-mono text-[#374151]">{config.index}</span></span>
          <button
            onClick={() => setConfigOpen(true)}
            className="text-[11px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
          >
            Configure →
          </button>
        </div>

        {/* Payload preview */}
        <div style={{ padding: '16px 20px' }}>
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[.06em] text-[#9CA3AF]">Payload Preview ({config.format})</div>
          <pre className="overflow-x-auto rounded-[6px] border border-[#E5E7EB] bg-[#F9FAFB] p-4 font-mono text-[10.5px] leading-relaxed text-[#374151] whitespace-pre-wrap">
            {payload}
          </pre>

          {!config.enabled && (
            <div className="mt-3 rounded-[6px] border border-[#FDE68A] bg-[#FFFBEB] px-4 py-2.5 text-[12.5px] font-semibold text-[#92400E]">
              ⚠ Integration is disabled — enable it in Configuration before pushing events.
            </div>
          )}

          {pushed && config.enabled && (
            <div className="mt-3 rounded-[6px] border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-2.5 text-[12.5px] font-semibold text-[#15803D]">
              ✓ {eventCount.toLocaleString()} events pushed to {displayEndpoint}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between" style={{ padding: '12px 20px', borderTop: '1px solid #E5E7EB', background: '#F9FAFB' }}>
          <div className="text-[11.5px] text-[#9CA3AF]">
            Batch size: <span className="font-mono text-[#374151]">{config.batchSize.toLocaleString()}</span>
            <span className="mx-2">·</span>
            Sourcetype: <span className="font-mono text-[#374151]">{config.sourcetype}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="inline-flex items-center rounded-[5px] border border-[#D1D5DB] bg-white font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-all"
              style={{ padding: '5px 12px', fontSize: 12 }}
            >
              Cancel
            </button>
            <button
              onClick={() => setPushed(true)}
              disabled={pushed || !config.enabled}
              className="inline-flex items-center rounded-[5px] bg-[#2563EB] font-semibold text-white hover:bg-[#1D4ED8] transition-all disabled:opacity-60"
              style={{ padding: '5px 12px', fontSize: 12 }}
            >
              {pushed ? 'Pushed' : `Push ${eventCount.toLocaleString()} Events`}
            </button>
          </div>
        </div>
      </div>

      {/* Config modal — rendered at z-60, above the SIEM modal */}
      <SiemConfigModal
        open={configOpen}
        config={config}
        onClose={() => setConfigOpen(false)}
        onSave={(updated) => { setConfig(updated); setConfigOpen(false); }}
      />
    </>
  );
}
