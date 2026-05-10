'use client';
import { useEffect, useState } from 'react';
import { X, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { DEFAULT_SIEM_CONFIG, type SiemConfig } from './SiemConfigModal';

type Tab = 'preview' | 'configure';

type Props = {
  open: boolean;
  onClose: () => void;
  payload: string;
  eventCount: number;
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

export default function SiemModal({ open, onClose, payload, eventCount }: Props) {
  const [visible, setVisible] = useState(false);
  const [pushed, setPushed] = useState(false);
  const [tab, setTab] = useState<Tab>('preview');
  const [config, setConfig] = useState<SiemConfig>(DEFAULT_SIEM_CONFIG);
  const [showToken, setShowToken] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);

  useEffect(() => { setVisible(open); setPushed(false); setTab('preview'); }, [open]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!open) return null;

  function set<K extends keyof SiemConfig>(key: K, value: SiemConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  function handleSaveConfig() {
    setConfigSaved(true);
    setTimeout(() => { setConfigSaved(false); setTab('preview'); }, 1000);
  }

  const displayEndpoint = (() => {
    try {
      const url = new URL(config.endpointUrl);
      return `${url.hostname}:${url.port || (url.protocol === 'https:' ? '443' : '80')}`;
    } catch {
      return config.endpointUrl || '—';
    }
  })();

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity .2s' }}
        onClick={onClose}
      />

      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-[700px] max-h-[90vh] overflow-hidden rounded-xl bg-white flex flex-col"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translate(-50%,-50%) scale(1)' : 'translate(-50%,-50%) scale(.96)',
          transition: 'opacity .2s, transform .2s',
          border: '1px solid #E5E7EB',
          boxShadow: '0 8px 40px rgba(0,0,0,.14)',
        }}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between" style={{ padding: '14px 20px 0', borderBottom: '1px solid #E5E7EB' }}>
          <div className="flex flex-col gap-3 w-full">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13.5px] font-bold text-[#111827]">SIEM Push</div>
                <div className="text-[11px] text-[#9CA3AF]">
                  {config.format} format · {eventCount.toLocaleString()} events · Splunk HEC
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-md text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-0">
              {(['preview', 'configure'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="relative pb-2.5 px-1 mr-5 text-[12.5px] font-semibold transition-colors"
                  style={{ color: tab === t ? '#2563EB' : '#6B7280' }}
                >
                  {t === 'preview' ? 'Preview' : 'Configuration'}
                  {tab === t && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[#2563EB]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto">

          {/* ── PREVIEW TAB ── */}
          {tab === 'preview' && (
            <>
              {/* Integration summary strip */}
              <div className="flex items-center gap-4 border-b border-[#F3F4F6] bg-[#F9FAFB]" style={{ padding: '8px 20px' }}>
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full flex-shrink-0 ${config.enabled ? 'bg-[#16A34A]' : 'bg-[#9CA3AF]'}`} />
                  <span className="text-[11.5px] font-semibold text-[#374151]">{config.name}</span>
                </div>
                <span className="text-[11px] text-[#9CA3AF]">→</span>
                <span className="font-mono text-[11px] text-[#374151]">{displayEndpoint}</span>
                <span className="ml-auto text-[11px] text-[#9CA3AF]">
                  Index: <span className="font-mono text-[#374151]">{config.index || '—'}</span>
                </span>
                <button
                  onClick={() => setTab('configure')}
                  className="text-[11px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
                >
                  Configure →
                </button>
              </div>

              <div style={{ padding: '16px 20px' }}>
                <div className="mb-3 text-[11px] font-bold uppercase tracking-[.06em] text-[#9CA3AF]">
                  Payload Preview ({config.format})
                </div>
                <pre className="overflow-x-auto rounded-[6px] border border-[#E5E7EB] bg-[#F9FAFB] p-4 font-mono text-[10.5px] leading-relaxed text-[#374151] whitespace-pre-wrap">
                  {payload}
                </pre>

                {!config.enabled && (
                  <div className="mt-3 rounded-[6px] border border-[#FDE68A] bg-[#FFFBEB] px-4 py-2.5 text-[12.5px] font-semibold text-[#92400E]">
                    Integration is disabled — enable it in Configuration before pushing events.
                  </div>
                )}

                {pushed && config.enabled && (
                  <div className="mt-3 rounded-[6px] border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-2.5 text-[12.5px] font-semibold text-[#15803D]">
                    ✓ {eventCount.toLocaleString()} events pushed to {displayEndpoint}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── CONFIGURATION TAB ── */}
          {tab === 'configure' && (
            <div className="space-y-5" style={{ padding: '20px' }}>

              {/* Status toggle */}
              <div className="flex items-center justify-between rounded-[6px] border border-[#E5E7EB] bg-[#F9FAFB]" style={{ padding: '10px 14px' }}>
                <div>
                  <div className="text-[12.5px] font-semibold text-[#111827]">Integration Status</div>
                  <div className="text-[11px] text-[#9CA3AF]">Disable to pause event forwarding without deleting configuration</div>
                </div>
                <button
                  onClick={() => set('enabled', !config.enabled)}
                  className="relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none"
                  style={{ background: config.enabled ? '#2563EB' : '#D1D5DB' }}
                >
                  <span
                    className="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                    style={{ transform: config.enabled ? 'translateX(16px)' : 'translateX(0)' }}
                  />
                </button>
              </div>

              {/* Integration details */}
              <div>
                <div className="mb-3 text-[11px] font-bold uppercase tracking-[.06em] text-[#9CA3AF]">Integration Details</div>
                <Field label="Integration Name" required>
                  <input
                    value={config.name}
                    onChange={(e) => set('name', e.target.value)}
                    className={inputCls}
                    placeholder="e.g. Production Splunk"
                  />
                </Field>
              </div>

              {/* Endpoint */}
              <div>
                <div className="mb-3 text-[11px] font-bold uppercase tracking-[.06em] text-[#9CA3AF]">Endpoint</div>
                <div className="space-y-3">
                  <Field label="HEC Endpoint URL" hint="include port and /services/collector/event path" required>
                    <input
                      value={config.endpointUrl}
                      onChange={(e) => set('endpointUrl', e.target.value)}
                      className={inputCls}
                      placeholder="https://splunk.example.com:8088/services/collector/event"
                    />
                  </Field>
                  <Field label="HEC Token" hint="Splunk HTTP Event Collector authentication token" required>
                    <div className="relative">
                      <input
                        type={showToken ? 'text' : 'password'}
                        value={config.hecToken}
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
                      onClick={() => set('sslVerify', !config.sslVerify)}
                      className="relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors"
                      style={{ background: config.sslVerify ? '#2563EB' : '#D1D5DB' }}
                    >
                      <span
                        className="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                        style={{ transform: config.sslVerify ? 'translateX(16px)' : 'translateX(0)' }}
                      />
                    </button>
                    <span className="text-[12.5px] text-[#374151]">Verify SSL certificate</span>
                    {!config.sslVerify && (
                      <span className="inline-flex items-center rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10.5px] font-semibold text-[#92400E]">
                        Not recommended in production
                      </span>
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
                      value={config.index}
                      onChange={(e) => set('index', e.target.value)}
                      className={inputCls}
                      placeholder="main"
                    />
                  </Field>
                  <Field label="Source">
                    <input
                      value={config.source}
                      onChange={(e) => set('source', e.target.value)}
                      className={inputCls}
                      placeholder="ai-trust-center"
                    />
                  </Field>
                  <Field label="Sourcetype">
                    <input
                      value={config.sourcetype}
                      onChange={(e) => set('sourcetype', e.target.value)}
                      className={inputCls}
                      placeholder="_json"
                    />
                  </Field>
                  <Field label="Event Format">
                    <select
                      value={config.format}
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
                      value={config.batchSize}
                      onChange={(e) => set('batchSize', Number(e.target.value))}
                      className={inputCls}
                    />
                  </Field>
                </div>
              </div>

              {/* Connection test banner */}
              <div className="rounded-[6px] border border-[#BFDBFE] bg-[#EFF6FF]" style={{ padding: '10px 14px' }}>
                <div className="text-[12px] font-semibold text-[#1D4ED8] mb-0.5">Connection not tested</div>
                <div className="text-[11.5px] text-[#3B82F6]">
                  Save the configuration and use the Push button to verify connectivity.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex-shrink-0 flex items-center justify-between"
          style={{ padding: '12px 20px', borderTop: '1px solid #E5E7EB', background: '#F9FAFB' }}
        >
          {tab === 'preview' ? (
            <>
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
            </>
          ) : (
            <>
              <div className="text-[11.5px] text-[#9CA3AF]">
                Integration type: <span className="font-medium text-[#374151]">Splunk HEC</span>
              </div>
              <div className="flex items-center gap-2">
                {configSaved && (
                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#16A34A]">
                    <CheckCircle className="h-3.5 w-3.5" /> Saved
                  </span>
                )}
                <button
                  onClick={() => setTab('preview')}
                  className="inline-flex items-center rounded-[5px] border border-[#D1D5DB] bg-white font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-all"
                  style={{ padding: '5px 12px', fontSize: 12 }}
                >
                  Back to Preview
                </button>
                <button
                  onClick={handleSaveConfig}
                  disabled={configSaved}
                  className="inline-flex items-center rounded-[5px] bg-[#2563EB] font-semibold text-white hover:bg-[#1D4ED8] transition-all disabled:opacity-60"
                  style={{ padding: '5px 14px', fontSize: 12 }}
                >
                  Save Configuration
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
