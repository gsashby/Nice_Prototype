'use client';
import { useEffect, useState } from 'react';
import { X, Eye, EyeOff, CheckCircle } from 'lucide-react';

export type SiemConfig = {
  name: string;
  endpointUrl: string;
  hecToken: string;
  index: string;
  source: string;
  sourcetype: string;
  format: 'CEF' | 'JSON';
  batchSize: number;
  sslVerify: boolean;
  enabled: boolean;
};

export const DEFAULT_SIEM_CONFIG: SiemConfig = {
  name: 'NICE AI Trust Center → Splunk',
  endpointUrl: 'https://splunk.internal:8088/services/collector/event',
  hecToken: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  index: 'ai_governance',
  source: 'nice-ai-trust-center',
  sourcetype: '_json',
  format: 'CEF',
  batchSize: 500,
  sslVerify: true,
  enabled: true,
};

type Props = {
  open: boolean;
  config: SiemConfig;
  onClose: () => void;
  onSave: (config: SiemConfig) => void;
};

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-[.05em] text-[#6B7280] mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="ml-1.5 text-[10px] font-normal normal-case tracking-normal text-[#9CA3AF]">— {hint}</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full rounded-[5px] border border-[#D1D5DB] bg-white px-3 py-2 text-[12.5px] text-[#374151] placeholder-[#9CA3AF] outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20";

export default function SiemConfigModal({ open, config, onClose, onSave }: Props) {
  const [visible, setVisible] = useState(false);
  const [form, setForm] = useState<SiemConfig>(config);
  const [showToken, setShowToken] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setVisible(open); setForm(config); setSaved(false); }, [open, config]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!open) return null;

  function set<K extends keyof SiemConfig>(key: K, value: SiemConfig[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    onSave(form);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1200);
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/30"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity .2s' }}
        onClick={onClose}
      />
      <div
        className="fixed left-1/2 top-1/2 z-[60] w-full max-w-[620px] max-h-[90vh] overflow-y-auto rounded-xl bg-white"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translate(-50%,-50%) scale(1)' : 'translate(-50%,-50%) scale(.96)',
          transition: 'opacity .2s, transform .2s',
          border: '1px solid #E5E7EB',
          boxShadow: '0 8px 40px rgba(0,0,0,.18)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between sticky top-0 bg-white z-10" style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
          <div>
            <div className="text-[13.5px] font-bold text-[#111827]">SIEM Integration Configuration</div>
            <div className="text-[11px] text-[#9CA3AF] mt-0.5">Splunk HTTP Event Collector (HEC)</div>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-[#6B7280] hover:bg-[#F3F4F6] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form body */}
        <div className="space-y-5" style={{ padding: '20px' }}>

          {/* Status toggle — top of form */}
          <div className="flex items-center justify-between rounded-[6px] border border-[#E5E7EB] bg-[#F9FAFB]" style={{ padding: '10px 14px' }}>
            <div>
              <div className="text-[12.5px] font-semibold text-[#111827]">Integration Status</div>
              <div className="text-[11px] text-[#9CA3AF]">Disable to pause event forwarding without deleting configuration</div>
            </div>
            <button
              onClick={() => set('enabled', !form.enabled)}
              className="relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none"
              style={{ background: form.enabled ? '#2563EB' : '#D1D5DB' }}
            >
              <span
                className="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                style={{ transform: form.enabled ? 'translateX(16px)' : 'translateX(0)' }}
              />
            </button>
          </div>

          {/* Integration details */}
          <div>
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[.06em] text-[#9CA3AF]">Integration Details</div>
            <div className="space-y-3">
              <Field label="Integration Name" required>
                <input
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  className={inputCls}
                  placeholder="e.g. Production Splunk"
                />
              </Field>
            </div>
          </div>

          {/* Endpoint */}
          <div>
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[.06em] text-[#9CA3AF]">Endpoint</div>
            <div className="space-y-3">
              <Field label="HEC Endpoint URL" hint="include port and /services/collector/event path" required>
                <input
                  value={form.endpointUrl}
                  onChange={(e) => set('endpointUrl', e.target.value)}
                  className={inputCls}
                  placeholder="https://splunk.example.com:8088/services/collector/event"
                />
              </Field>
              <Field label="HEC Token" hint="Splunk HTTP Event Collector authentication token" required>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={form.hecToken}
                    onChange={(e) => set('hecToken', e.target.value)}
                    className={inputCls + ' pr-10'}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => set('sslVerify', !form.sslVerify)}
                  className="relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors"
                  style={{ background: form.sslVerify ? '#2563EB' : '#D1D5DB' }}
                >
                  <span
                    className="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                    style={{ transform: form.sslVerify ? 'translateX(16px)' : 'translateX(0)' }}
                  />
                </button>
                <span className="text-[12.5px] text-[#374151]">Verify SSL certificate</span>
                {!form.sslVerify && (
                  <span className="inline-flex items-center rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10.5px] font-semibold text-[#92400E]">Not recommended in production</span>
                )}
              </div>
            </div>
          </div>

          {/* Data settings */}
          <div>
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[.06em] text-[#9CA3AF]">Data Settings</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Index" hint="Splunk destination index">
                <input
                  value={form.index}
                  onChange={(e) => set('index', e.target.value)}
                  className={inputCls}
                  placeholder="main"
                />
              </Field>
              <Field label="Source">
                <input
                  value={form.source}
                  onChange={(e) => set('source', e.target.value)}
                  className={inputCls}
                  placeholder="ai-trust-center"
                />
              </Field>
              <Field label="Sourcetype">
                <input
                  value={form.sourcetype}
                  onChange={(e) => set('sourcetype', e.target.value)}
                  className={inputCls}
                  placeholder="_json"
                />
              </Field>
              <Field label="Event Format">
                <select
                  value={form.format}
                  onChange={(e) => set('format', e.target.value as 'CEF' | 'JSON')}
                  className={inputCls}
                >
                  <option value="CEF">CEF (Common Event Format)</option>
                  <option value="JSON">JSON</option>
                </select>
              </Field>
              <Field label="Batch Size" hint="events per push">
                <input
                  type="number"
                  min={1}
                  max={5000}
                  value={form.batchSize}
                  onChange={(e) => set('batchSize', Number(e.target.value))}
                  className={inputCls}
                />
              </Field>
            </div>
          </div>

          {/* Connection test banner */}
          <div className="rounded-[6px] border border-[#BFDBFE] bg-[#EFF6FF]" style={{ padding: '10px 14px' }}>
            <div className="text-[12px] font-semibold text-[#1D4ED8] mb-0.5">Connection not tested</div>
            <div className="text-[11.5px] text-[#3B82F6]">Save the configuration and use the SIEM Push button to verify connectivity.</div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between sticky bottom-0 bg-[#F9FAFB]" style={{ padding: '12px 20px', borderTop: '1px solid #E5E7EB' }}>
          <div className="text-[11.5px] text-[#9CA3AF]">
            Integration type: <span className="font-medium text-[#374151]">Splunk HEC</span>
          </div>
          <div className="flex gap-2">
            {saved && (
              <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#16A34A]">
                <CheckCircle className="h-3.5 w-3.5" /> Saved
              </span>
            )}
            <button
              onClick={onClose}
              className="inline-flex items-center rounded-[5px] border border-[#D1D5DB] bg-white font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-all"
              style={{ padding: '5px 12px', fontSize: 12 }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saved}
              className="inline-flex items-center rounded-[5px] bg-[#2563EB] font-semibold text-white hover:bg-[#1D4ED8] transition-all disabled:opacity-60"
              style={{ padding: '5px 14px', fontSize: 12 }}
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
