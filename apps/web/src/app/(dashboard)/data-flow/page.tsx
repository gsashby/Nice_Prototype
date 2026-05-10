'use client';

import { useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { format } from 'date-fns';
import PageHeader from '@/components/shared/PageHeader';
import FlowGraph, { type NodeId } from '@/components/data-flow/FlowGraph';
import { useGovernanceMetrics } from '@/hooks/useGovernanceMetrics';
import { useAuditLog } from '@/hooks/useAuditLog';

// ── Static node metadata ─────────────────────────────────────────────────────

const NODE_INFO: Record<NodeId, { role: string; description: string; color: string }> = {
  agent: {
    role: 'Request Source',
    color: '#2563EB',
    description:
      'AI agents and end users that submit requests into the governed AI pipeline. Each request is tagged with an agent ID and session ID before entering the trust layer.',
  },
  policy: {
    role: 'Governance Gate',
    color: '#D97706',
    description:
      'Evaluates every incoming request against all active governance policies in real time. Requests are allowed, flagged for review, or blocked based on violation severity.',
  },
  model: {
    role: 'AI Inference',
    color: '#7C3AED',
    description:
      'The underlying language model (Claude, GPT-4, etc.) that processes approved requests. Model identity, version, and confidence score are captured for every inference.',
  },
  response: {
    role: 'Output Validator',
    color: '#059669',
    description:
      'Filters model outputs for policy compliance before they are returned to the client. Catches any post-inference drift or newly triggered violations.',
  },
  client: {
    role: 'Destination',
    color: '#374151',
    description:
      'The end user or downstream system that receives the fully governed, validated AI response. Only responses that passed all governance checks reach this node.',
  },
  audit: {
    role: 'Event Capture',
    color: '#2563EB',
    description:
      'Records every request, policy decision, model inference, and response as an immutable audit event. Creates the complete evidence trail required for compliance reporting.',
  },
  postgres: {
    role: 'Persistence Layer',
    color: '#059669',
    description:
      'PostgreSQL with TimescaleDB stores audit events as a time-series hypertable, enabling efficient range queries over billions of rows while preserving full history.',
  },
  alert: {
    role: 'Alert Dispatcher',
    color: '#DC2626',
    description:
      'Monitors the incoming audit stream for policy violations and anomalies. Triggers real-time alerts and escalations when governance thresholds are crossed.',
  },
  governance: {
    role: 'KPI Dashboard',
    color: '#7C3AED',
    description:
      'Aggregates governance scores, model health, policy performance, and violation trends into executive dashboards, board reports, and NLQ-accessible analytics.',
  },
};

// ── Pipeline steps shown when no node is selected ────────────────────────────

const PIPELINE_STEPS = [
  { n: 1, text: 'AI agent submits a request to the trust layer' },
  { n: 2, text: 'Policy Engine checks all active governance rules' },
  { n: 3, text: 'Compliant requests forwarded to the AI Model' },
  { n: 4, text: 'Response Filter validates the model output' },
  { n: 5, text: 'Governed response delivered to the client' },
  { n: 6, text: 'All events recorded by the Audit Logger' },
  { n: 7, text: 'Events persisted to PostgreSQL / TimescaleDB' },
  { n: 8, text: 'Violations trigger the Alert System' },
  { n: 9, text: 'Governance Dashboard aggregates KPIs & reports' },
];

// ── Outcome colours ───────────────────────────────────────────────────────────

const OUTCOME_BADGE: Record<string, string> = {
  allowed:  'bg-[#DCFCE7] text-[#15803D]',
  blocked:  'bg-[#FEE2E2] text-[#DC2626]',
  flagged:  'bg-[#FEF3C7] text-[#92400E]',
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DataFlowPage() {
  const [animated, setAnimated] = useState(true);
  const [selectedNode, setSelectedNode] = useState<NodeId | null>(null);

  const { data: metrics } = useGovernanceMetrics();
  const { data: auditData } = useAuditLog({ page: 1, pageSize: 8 });

  const recentEvents = auditData?.events ?? [];

  function handleNodeClick(id: NodeId) {
    setSelectedNode((prev) => (prev === id ? null : id));
  }

  const nodeDetail = selectedNode ? NODE_INFO[selectedNode] : null;

  return (
    <div className="space-y-5" style={{ paddingLeft: 24 }}>
      <PageHeader
        title="Data Flow Visualizer"
        description="Live AI governance pipeline"
        actions={
          <div className="flex items-center gap-2">
            <a
              href="https://www.niceactimize.com/terms-and-conditions/ai-services-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-[5px] border border-[#D1D5DB] bg-white font-semibold text-[#2563EB] hover:bg-[#EFF6FF] hover:border-[#BFDBFE] transition-all"
              style={{ padding: '4px 10px', fontSize: 12 }}
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              AI Usage Policy
            </a>
            <button
              onClick={() => setAnimated((a) => !a)}
              className="inline-flex items-center gap-1.5 rounded-[5px] border border-[#D1D5DB] bg-white font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-all"
              style={{ padding: '4px 10px', fontSize: 12 }}
            >
              {animated ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              {animated ? 'Pause flow' : 'Resume flow'}
            </button>
          </div>
        }
      />

      {/* ── Architecture summary ─────────────────────────────────────────── */}
      <div className="rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]" style={{ padding: '16px 20px' }}>
        <div className="mb-2 text-[12px] font-bold text-[#111827]">What this diagram shows</div>
        <p className="text-[12px] leading-relaxed text-[#4B5563]">
          Every AI decision processed by NICE CXone travels through a two-layer governance pipeline before it reaches the end user.
          The <span className="font-semibold text-[#2563EB]">Request Pipeline</span> (top row) handles the real-time path: an AI agent submits
          a request → the Policy Engine applies all active governance rules → compliant requests reach the AI Model → the Response Filter
          validates the output → the governed response is delivered to the client.
          The <span className="font-semibold text-[#7C3AED]">Governance Layer</span> (bottom row) runs in parallel: every request, decision,
          and policy event is written to the Audit Logger → persisted as a time-series event in PostgreSQL / TimescaleDB →
          scanned for violations by the Alert System → and aggregated into KPI dashboards and board reports by the Governance engine.
        </p>
        <div className="mt-3 flex flex-wrap gap-4">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-white text-[9px] font-bold" style={{ background: '#2563EB' }}>1</span>
            <span className="text-[11px] text-[#6B7280] leading-snug"><span className="font-semibold text-[#374151]">Policy-first:</span> No request reaches the model until all governance rules pass.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-white text-[9px] font-bold" style={{ background: '#059669' }}>2</span>
            <span className="text-[11px] text-[#6B7280] leading-snug"><span className="font-semibold text-[#374151]">Immutable audit trail:</span> Every event is recorded and cannot be modified after capture.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-white text-[9px] font-bold" style={{ background: '#DC2626' }}>3</span>
            <span className="text-[11px] text-[#6B7280] leading-snug"><span className="font-semibold text-[#374151]">Real-time alerting:</span> Violations trigger automated escalations before the next request cycle.</span>
          </div>
        </div>
      </div>

      <div className="flex gap-5 items-start">

        {/* ── Left: flow graph ─────────────────────────────────────── */}
        <div
          className="flex-1 min-w-0 rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]"
          style={{ padding: '20px 24px 16px' }}
        >
          <div className="mb-1">
            <div className="text-[13.5px] font-bold text-[#111827]">AI Request Pipeline</div>
            <div className="text-[11.5px] text-[#9CA3AF]">
              Click any node to inspect its role in the governance lifecycle
            </div>
          </div>
          <div className="mb-3 grid grid-cols-2 gap-2 mt-3">
            <div className="rounded-[6px] border border-[#DBEAFE] bg-[#EFF6FF]" style={{ padding: '8px 10px' }}>
              <div className="text-[10px] font-bold uppercase tracking-[.06em] text-[#2563EB] mb-0.5">Request Pipeline (top row)</div>
              <div className="text-[11px] text-[#374151] leading-snug">
                The synchronous path a request takes from submission through policy check, model inference, response filtering, and final delivery. Latency target: &lt;200 ms p99.
              </div>
            </div>
            <div className="rounded-[6px] border border-[#E9D5FF] bg-[#F5F3FF]" style={{ padding: '8px 10px' }}>
              <div className="text-[10px] font-bold uppercase tracking-[.06em] text-[#7C3AED] mb-0.5">Governance Layer (bottom row)</div>
              <div className="text-[11px] text-[#374151] leading-snug">
                The asynchronous observability plane. All events are captured, persisted to TimescaleDB, violations surface as alerts, and KPIs roll up into executive dashboards.
              </div>
            </div>
          </div>
          <FlowGraph
            selectedNode={selectedNode}
            onNodeClick={handleNodeClick}
            animated={animated}
          />
          <div className="mt-3 border-t border-[#F3F4F6] pt-3 text-[11px] text-[#9CA3AF] leading-relaxed">
            <span className="font-semibold text-[#6B7280]">Animated arrows</span> represent live event flow across the pipeline. Each colour corresponds to a distinct data stream — request flow (blue), governance events (amber), AI inference log (purple), persistence/metrics (green), and violation alerts (red). Pause the animation to inspect individual connections.
          </div>
        </div>

        {/* ── Right: detail + metrics panel ────────────────────────── */}
        <div className="flex flex-col gap-4" style={{ width: 280, flexShrink: 0 }}>

          {/* Node detail card */}
          <div className="rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]" style={{ padding: '16px' }}>
            {nodeDetail ? (
              <>
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{ background: `${nodeDetail.color}18`, color: nodeDetail.color }}
                  >
                    {nodeDetail.role}
                  </span>
                </div>
                <div className="mb-2 text-[13px] font-bold text-[#111827]">
                  {selectedNode === 'postgres' ? 'PostgreSQL' : selectedNode!.charAt(0).toUpperCase() + selectedNode!.slice(1)}
                </div>
                <p className="text-[11.5px] leading-relaxed text-[#6B7280]">{nodeDetail.description}</p>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="mt-3 text-[10.5px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                >
                  ✕ Deselect node
                </button>
              </>
            ) : (
              <>
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[.06em] text-[#9CA3AF]">Pipeline Steps</div>
                <ol className="space-y-1.5">
                  {PIPELINE_STEPS.map(({ n, text }) => (
                    <li key={n} className="flex items-start gap-2">
                      <span
                        className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                        style={{ background: '#2563EB', fontSize: 9 }}
                      >
                        {n}
                      </span>
                      <span className="text-[11px] text-[#374151] leading-snug">{text}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>

          {/* KPI chips */}
          <div className="rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]" style={{ padding: '14px 16px' }}>
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[.06em] text-[#9CA3AF]">Pipeline Health</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  label: 'Governance Score',
                  value: metrics ? `${metrics.governance_score}%` : '—',
                  color: '#16A34A',
                },
                {
                  label: 'Active Policies',
                  value: metrics?.active_policies ?? '—',
                  color: '#D97706',
                },
                {
                  label: 'Violations (24h)',
                  value: metrics?.policy_violations_24h ?? '—',
                  color: '#DC2626',
                },
                {
                  label: 'Models Monitored',
                  value: metrics?.models_monitored ?? '—',
                  color: '#7C3AED',
                },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="rounded-[6px] border border-[#F3F4F6] bg-[#F9FAFB]"
                  style={{ padding: '8px 10px' }}
                >
                  <div className="text-[18px] font-bold" style={{ color }}>{value}</div>
                  <div className="text-[9.5px] text-[#9CA3AF] leading-snug mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent audit events feed */}
          <div className="rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]" style={{ padding: '14px 16px' }}>
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[.06em] text-[#9CA3AF]">
              Recent Events
            </div>
            {recentEvents.length === 0 ? (
              <div className="py-4 text-center text-[11.5px] text-[#9CA3AF]">No events loaded</div>
            ) : (
              <div className="space-y-2">
                {recentEvents.slice(0, 6).map((e) => (
                  <div key={e.id} className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 inline-flex flex-shrink-0 items-center rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold ${OUTCOME_BADGE[e.outcome] ?? 'bg-[#F3F4F6] text-[#4B5563]'}`}
                    >
                      {e.outcome}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] font-medium text-[#374151]">{e.event_type}</div>
                      <div className="text-[10px] text-[#9CA3AF]">
                        {format(new Date(e.event_time), 'HH:mm:ss')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
