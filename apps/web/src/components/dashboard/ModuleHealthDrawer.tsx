'use client';
import { useEffect, useState } from 'react';
import { X, ShieldCheck, Activity, BarChart2, Layers } from 'lucide-react';
import type { ModelHealth } from '@/hooks/useModelHealth';

type Props = {
  module: ModelHealth | null;
  onClose: () => void;
};

const moduleDescriptions: Record<string, string> = {
  autopilot:
    'NICE CXone Autopilot is a fully autonomous AI agent that handles end-to-end customer interactions without human intervention. It resolves inquiries across voice and digital channels using retrieval-augmented generation and dynamic policy enforcement.',
  copilot:
    'NICE CXone Copilot assists live agents in real time — surfacing next-best-action recommendations, auto-summarising call context, and suggesting responses. It augments human judgement rather than replacing it.',
  mpower:
    'NICE CXone mPower orchestrates AI workflows across the contact centre, coordinating Autopilot and Copilot tasks, managing escalation paths, and aggregating performance signals into governance dashboards.',
};

function moduleDesc(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('autopilot')) return moduleDescriptions.autopilot;
  if (lower.includes('copilot'))   return moduleDescriptions.copilot;
  return moduleDescriptions.mpower;
}

const moduleStyles: Record<string, string> = {
  autopilot: 'bg-[#EDE9FE] text-[#6D28D9]',
  copilot:   'bg-[#DBEAFE] text-[#1D4ED8]',
  mpower:    'bg-[#CCFBF1] text-[#0F766E]',
};

function moduleColor(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('autopilot')) return moduleStyles.autopilot;
  if (lower.includes('copilot'))   return moduleStyles.copilot;
  return moduleStyles.mpower;
}

function GovGauge({ score }: { score: number }) {
  const color  = score >= 85 ? '#16A34A' : score >= 70 ? '#D97706' : '#DC2626';
  const label  = score >= 85 ? 'Healthy'  : score >= 70 ? 'Watch'   : 'Critical';
  const badge  = score >= 85
    ? 'bg-[#DCFCE7] text-[#15803D]'
    : score >= 70
    ? 'bg-[#FEF3C7] text-[#92400E]'
    : 'bg-[#FEE2E2] text-[#DC2626]';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[22px] font-bold tabular-nums" style={{ color }}>{score.toFixed(1)}%</span>
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge}`}>{label}</span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-[#E5E7EB] overflow-hidden">
        <div className="absolute left-0 top-0 h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
      <div className="text-[11px] text-[#6B7280] leading-relaxed">
        The governance score represents the percentage of interactions that satisfied every active policy rule in the Policy Engine.
        Scores of <span className="font-semibold text-[#15803D]">≥85%</span> are Healthy,{' '}
        <span className="font-semibold text-[#92400E]">70–84%</span> trigger a Watch status, and{' '}
        <span className="font-semibold text-[#DC2626]">&lt;70%</span> are Critical and require immediate attention.
      </div>
    </div>
  );
}

function MetricBlock({
  icon,
  label,
  value,
  explanation,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  explanation: string;
  accent?: string;
}) {
  return (
    <div className="rounded-[6px] border border-[#E5E7EB] bg-[#F9FAFB]" style={{ padding: '12px 14px' }}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[#9CA3AF]">{icon}</span>
        <span className="text-[10.5px] font-bold uppercase tracking-[.05em] text-[#9CA3AF]">{label}</span>
      </div>
      <div className="text-[18px] font-bold tabular-nums mb-1" style={{ color: accent ?? '#111827' }}>{value}</div>
      <div className="text-[11px] text-[#6B7280] leading-relaxed">{explanation}</div>
    </div>
  );
}

export default function ModuleHealthDrawer({ module: mod, onClose }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => { setVisible(!!mod); }, [mod]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!mod) return null;

  const violationRate = mod.total_inferences > 0
    ? ((mod.violation_count / mod.total_inferences) * 100).toFixed(2)
    : '0.00';

  const biasPercent  = (mod.bias_score * 100).toFixed(2);
  const biasColor    = mod.bias_score < 0.01 ? '#16A34A' : mod.bias_score < 0.05 ? '#D97706' : '#DC2626';
  const confColor    = mod.confidence_avg >= 0.85 ? '#16A34A' : mod.confidence_avg >= 0.70 ? '#D97706' : '#DC2626';

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity .2s' }}
        onClick={onClose}
      />

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
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${moduleColor(mod.name)}`}>
                {mod.name}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-[#9CA3AF] font-mono">{mod.type}</div>
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

          {/* About */}
          <div className="mb-4">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[.06em] text-[#9CA3AF]">About this module</div>
            <p className="text-[12px] text-[#374151] leading-relaxed">{moduleDesc(mod.name)}</p>
          </div>

          {/* Governance Score */}
          <div className="mb-4">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[.06em] text-[#9CA3AF]">Governance Score</div>
            <div className="rounded-[6px] border border-[#E5E7EB] bg-white" style={{ padding: '14px 16px' }}>
              <GovGauge score={mod.governance_score} />
            </div>
          </div>

          {/* Metric grid */}
          <div className="mb-4">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[.06em] text-[#9CA3AF]">Metrics explained</div>
            <div className="flex flex-col gap-2">

              <MetricBlock
                icon={<BarChart2 className="h-3.5 w-3.5" />}
                label="Avg Confidence"
                value={mod.confidence_avg.toFixed(2)}
                accent={confColor}
                explanation="The average certainty score (0–1) the model assigns to its own responses. Values closer to 1 mean the model is producing high-certainty outputs; lower values can indicate ambiguous inputs or an under-trained domain. Target ≥0.85."
              />

              <MetricBlock
                icon={<Layers className="h-3.5 w-3.5" />}
                label="Audit Coverage"
                value="100%"
                accent="#16A34A"
                explanation="Every request and response processed by this module is captured in the audit log. 100% coverage means there are no gaps in the governance record — every decision is traceable and inspectable."
              />

              <MetricBlock
                icon={<ShieldCheck className="h-3.5 w-3.5" />}
                label="Policy Violations"
                value={`${mod.violation_count.toLocaleString()} (${violationRate}%)`}
                accent={mod.violation_count === 0 ? '#16A34A' : '#DC2626'}
                explanation={`Out of ${mod.total_inferences.toLocaleString()} total inferences, ${mod.violation_count} were flagged as violating one or more active policy rules. A violation rate above 1% warrants policy review.`}
              />

              <MetricBlock
                icon={<Activity className="h-3.5 w-3.5" />}
                label="Bias Score"
                value={`${biasPercent}%`}
                accent={biasColor}
                explanation="Measures distributional skew in model outputs across protected attributes (e.g. language, region, agent group). Below 1% is acceptable; 1–5% triggers monitoring; above 5% requires immediate remediation to meet fairness standards."
              />

            </div>
          </div>

          {/* Status legend */}
          <div className="rounded-[6px] border border-[#E5E7EB] bg-[#F9FAFB]" style={{ padding: '12px 14px' }}>
            <div className="mb-2 text-[10.5px] font-bold uppercase tracking-[.05em] text-[#9CA3AF]">Status thresholds</div>
            <div className="flex flex-col gap-1.5">
              {[
                { badge: 'bg-[#DCFCE7] text-[#15803D]', label: 'Healthy',  rule: 'Governance score ≥ 85%' },
                { badge: 'bg-[#FEF3C7] text-[#92400E]', label: 'Watch',    rule: 'Governance score 70–84%' },
                { badge: 'bg-[#FEE2E2] text-[#DC2626]', label: 'Critical', rule: 'Governance score < 70%' },
              ].map(({ badge, label, rule }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge}`}>{label}</span>
                  <span className="text-[11px] text-[#6B7280]">{rule}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end"
          style={{ padding: '14px 20px', borderTop: '1px solid #E5E7EB', background: '#F9FAFB' }}
        >
          <button
            onClick={onClose}
            className="inline-flex items-center rounded-[5px] border border-[#D1D5DB] bg-white font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-all"
            style={{ padding: '5px 12px', fontSize: 12 }}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
