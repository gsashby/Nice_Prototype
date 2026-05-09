'use client';
import { useEffect, useState } from 'react';
import { X, ExternalLink, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import type { RegistryModel } from '@/hooks/useModelRegistry';

type Props = {
  model: RegistryModel | null;
  onClose: () => void;
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2.5 border-b border-[#F3F4F6] last:border-0">
      <div className="w-36 flex-shrink-0 text-[11px] font-semibold uppercase tracking-[.05em] text-[#9CA3AF] pt-0.5">{label}</div>
      <div className="flex-1 min-w-0 text-[12.5px] text-[#374151]">{children}</div>
    </div>
  );
}

function GovGauge({ score }: { score: number }) {
  const color = score >= 85 ? '#16A34A' : score >= 70 ? '#D97706' : '#DC2626';
  const label = score >= 85 ? 'Healthy' : score >= 70 ? 'Watch' : 'Critical';
  const labelCls = score >= 85 ? 'bg-[#DCFCE7] text-[#15803D]' : score >= 70 ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-[#FEE2E2] text-[#DC2626]';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[22px] font-bold tabular-nums" style={{ color }}>{score.toFixed(1)}%</span>
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${labelCls}`}>{label}</span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-[#E5E7EB] overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-[6px] border border-[#E5E7EB] bg-[#F9FAFB]" style={{ padding: '10px 12px' }}>
      <div className="text-[10.5px] font-semibold uppercase tracking-[.05em] text-[#9CA3AF] mb-0.5">{label}</div>
      <div className="text-[17px] font-bold text-[#111827] tabular-nums">{value}</div>
      {sub && <div className="text-[10.5px] text-[#9CA3AF] mt-0.5">{sub}</div>}
    </div>
  );
}

const typeStyles: Record<string, string> = {
  llm:        'bg-[#EDE9FE] text-[#6D28D9]',
  classifier: 'bg-[#DBEAFE] text-[#1D4ED8]',
  rag:        'bg-[#CCFBF1] text-[#0F766E]',
  regression: 'bg-[#FEF3C7] text-[#92400E]',
};

export default function ModelDetailDrawer({ model, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  useEffect(() => { setVisible(!!model); }, [model]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!model) return null;

  const typeColor = typeStyles[model.type.toLowerCase()] ?? 'bg-[#F3F4F6] text-[#4B5563]';
  const biasPercent = (model.bias_score * 100).toFixed(2);
  const biasColor = model.bias_score < 0.01 ? '#16A34A' : model.bias_score < 0.05 ? '#D97706' : '#DC2626';

  function goToAuditLog() {
    router.push(`/audit-log?model_id=${model!.id}`);
    onClose();
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity .2s' }}
        onClick={onClose}
      />

      <div
        className="fixed right-0 top-0 z-50 flex h-full w-[500px] flex-col bg-white"
        style={{
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform .25s cubic-bezier(.4,0,.2,1)',
          borderLeft: '1px solid #E5E7EB',
          boxShadow: '-4px 0 24px rgba(0,0,0,.08)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between" style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-[14px] font-bold text-[#111827] truncate">{model.name}</div>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${model.status === 'active' ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#F3F4F6] text-[#4B5563]'}`}>
                {model.status}
              </span>
            </div>
            <div className="mt-0.5 font-mono text-[11px] text-[#9CA3AF]">{model.id}</div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '16px 20px' }}>

          {/* Governance Score */}
          <div className="mb-4">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[.06em] text-[#9CA3AF]">Governance Score</div>
            <div className="rounded-[6px] border border-[#E5E7EB] bg-white" style={{ padding: '14px 16px' }}>
              <GovGauge score={model.governance_score} />
            </div>
          </div>

          {/* Performance metrics */}
          <div className="mb-4">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[.06em] text-[#9CA3AF]">Performance (Last 7 Days)</div>
            <div className="grid grid-cols-2 gap-2">
              <MetricCard
                label="Avg Confidence"
                value={`${(model.confidence_avg * 100).toFixed(1)}%`}
              />
              <MetricCard
                label="Total Inferences"
                value={model.total_inferences.toLocaleString()}
              />
              <MetricCard
                label="Violations"
                value={String(model.violation_count)}
                sub={model.total_inferences > 0 ? `${((model.violation_count / model.total_inferences) * 100).toFixed(2)}% rate` : undefined}
              />
              <MetricCard
                label="Bias Score"
                value={`${biasPercent}%`}
              />
            </div>
          </div>

          {/* Model details */}
          <div className="mb-4">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[.06em] text-[#9CA3AF]">Model Details</div>
            <div className="rounded-[6px] border border-[#E5E7EB] bg-white" style={{ padding: '0 14px' }}>
              <Row label="Type">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${typeColor}`}>
                  {model.type}
                </span>
              </Row>
              <Row label="Version">
                <span className="font-mono">{model.version || '—'}</span>
              </Row>
              {model.created_at && (
                <Row label="Registered">
                  {format(new Date(model.created_at), 'MMM d, yyyy')}
                </Row>
              )}
              {model.updated_at && (
                <Row label="Last Updated">
                  {format(new Date(model.updated_at), 'MMM d, yyyy HH:mm')}
                </Row>
              )}
            </div>
          </div>

          {/* Bias callout */}
          <div
            className="mb-4 rounded-[6px] p-3"
            style={{
              background: model.bias_score < 0.01 ? '#F0FDF4' : model.bias_score < 0.05 ? '#FFFBEB' : '#FEF2F2',
              border: `1px solid ${model.bias_score < 0.01 ? '#BBF7D0' : model.bias_score < 0.05 ? '#FDE68A' : '#FECACA'}`,
            }}
          >
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 flex-shrink-0" style={{ color: biasColor }} />
              <span className="text-[12px] font-semibold" style={{ color: biasColor }}>
                Bias Score: {biasPercent}%
              </span>
            </div>
            <div className="mt-1 text-[11.5px]" style={{ color: biasColor }}>
              {model.bias_score < 0.01
                ? 'Bias is within acceptable limits. No action required.'
                : model.bias_score < 0.05
                ? 'Bias is elevated. Monitor closely and review recent audit events.'
                : 'Bias exceeds threshold. Immediate review recommended.'}
            </div>
          </div>

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
            onClick={goToAuditLog}
            className="inline-flex items-center gap-1.5 rounded-[5px] bg-[#2563EB] font-semibold text-white hover:bg-[#1D4ED8] transition-all"
            style={{ padding: '5px 12px', fontSize: 12 }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View Audit Events
          </button>
        </div>
      </div>
    </>
  );
}
