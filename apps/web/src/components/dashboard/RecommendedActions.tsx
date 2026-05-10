'use client';
import { useState } from 'react';
import { ShieldCheck, Activity, Lock, Settings, ChevronRight } from 'lucide-react';
import RecommendationDrawer from './RecommendationDrawer';

// ── Types (exported so the drawer can import them) ────────────────────────────

export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type Category =
  | 'Policy & Compliance'
  | 'Model Performance'
  | 'Security & Access'
  | 'Operational';

export type Recommendation = {
  id: string;
  category: Category;
  priority: Priority;
  title: string;
  summary: string;
  module: string;
  detail: string;
  actions: string[];
};

// ── Static recommendation data ────────────────────────────────────────────────

const RECOMMENDATIONS: Recommendation[] = [
  // ── Policy & Compliance ────────────────────────────────────────────────────
  {
    id: 'pc-1',
    category: 'Policy & Compliance',
    priority: 'high',
    title: 'EU AI Act Article 13 transparency requirement not fully met',
    summary: 'Explainability metadata is missing from 34% of Autopilot inference events logged in the last 7 days.',
    module: 'Autopilot',
    detail:
      'EU AI Act Article 13 requires that high-risk AI systems provide meaningful explanations of their decisions to affected individuals. Audit log analysis shows that 34% of Autopilot inference events are missing the "explanation" metadata field, which means those decisions cannot be retrospectively justified to regulators. This gap also affects the Board Report\'s compliance attestation accuracy.',
    actions: [
      'Audit the last 30 days of Autopilot inference events and quantify the exact percentage missing the explanation field.',
      'Update the Autopilot model integration to populate the explanation metadata field on every inference response before logging.',
      'Add a Policy Engine rule that flags any inference event where explanation metadata is absent.',
      'Re-run the Board Report compliance attestation once the explanation field backfill is confirmed.',
      'Schedule a quarterly review to verify explanation coverage remains above 99% threshold.',
    ],
  },
  {
    id: 'pc-2',
    category: 'Policy & Compliance',
    priority: 'medium',
    title: '4 active policies have zero violations in 90 days',
    summary: 'Policies with no trigger history may be misconfigured or no longer relevant — review for accuracy.',
    module: 'All modules',
    detail:
      'Four enabled policies have not triggered a single violation in the past 90 days. This is either because the conditions they monitor never occur (suggesting the rule is correctly configured but overly narrow), or because the rule_config condition does not match the actual field values in audit events (suggesting a misconfiguration). Dead policies consume evaluation cycles on every AI request and can give a false sense of coverage.',
    actions: [
      'Open the Policy Engine and identify the 4 policies with zero violations in the last 90 days.',
      'For each policy, use Policy Simulation (dry-run) against a sample of recent audit events to verify the rule condition fires correctly.',
      'Cross-check the condition field values against actual values present in audit_events to identify any mismatches.',
      'Either update the rule_config to match real event field values, or disable the policy if the scenario it covers is no longer applicable.',
      'Document the review outcome and resolution for each policy in the description field.',
    ],
  },
  {
    id: 'pc-3',
    category: 'Policy & Compliance',
    priority: 'high',
    title: 'Policy rule evaluation engine is not active',
    summary: 'Policies store rule_config but conditions are never evaluated against live events at ingestion time.',
    module: 'All modules',
    detail:
      'The Policy Engine UI allows administrators to define structured trigger conditions (field, operator, value, action). These conditions are persisted as rule_config JSON but are currently not executed by any backend process. Every AI event passes through the pipeline without being checked against active policies, meaning violations are not being detected or logged in real time. The policy list violation counts are placeholder data only.',
    actions: [
      'Build a Go policy evaluation service that loads all enabled policies with valid rule_config at startup.',
      'Integrate the evaluator into the audit event ingestion path so every incoming event is checked before being committed to the database.',
      'Implement the condition operators (below, above, equals, not_equals, contains) against the corresponding event fields.',
      'Write violations to the policy_violations table and trigger an alert if the policy action is "block" or "flag".',
      'Add an integration test that verifies a known rule fires correctly against a seeded audit event.',
    ],
  },

  // ── Model Performance ──────────────────────────────────────────────────────
  {
    id: 'mp-1',
    category: 'Model Performance',
    priority: 'critical',
    title: 'Bias scan failure rate exceeds 5% threshold on Autopilot',
    summary: 'GPT-4 Turbo bias scan events show a 7.2% failure rate over the last 7 days — above the 5% SLA.',
    module: 'Autopilot',
    detail:
      'Automated bias scans run on Autopilot\'s GPT-4 Turbo model are returning a failure rate of 7.2% over the last 7 days, breaching the 5% operational threshold. Bias scan failures indicate that the model\'s output distribution may be skewed across protected demographic attributes (age, gender, language). Each failure is flagged in the audit log but no downstream remediation is currently triggered. Sustained rates above threshold are reportable under NICE\'s AI ethics policy.',
    actions: [
      'Pull all bias_scan failure events from the last 7 days and segment by demographic attribute to identify which axis is driving the failures.',
      'Review the prompt templates and any system instructions supplied to GPT-4 Turbo for language that could introduce demographic skew.',
      'Temporarily increase the bias scan sampling rate from the default to 100% until the root cause is identified.',
      'Notify the AI Ethics team and open a formal incident ticket — this rate is above the reportable threshold under NICE\'s AI ethics policy.',
      'Implement a Policy Engine rule that automatically blocks the Autopilot response if a bias_scan event is flagged, pending human review.',
    ],
  },
  {
    id: 'mp-2',
    category: 'Model Performance',
    priority: 'high',
    title: 'GPT-4 Turbo confidence score declining — 7-day trend −0.04',
    summary: 'Average confidence has dropped from 0.87 to 0.83 over 7 days, approaching the 0.80 alert threshold.',
    module: 'Copilot',
    detail:
      'GPT-4 Turbo\'s average confidence score on Copilot has declined consistently over the past 7 days, from 0.87 to 0.83. If the trend continues at the same rate it will breach the 0.80 alert threshold within 3 days. Declining confidence typically signals distribution shift in incoming queries, model drift, or a change in the prompt template. The governance score will also decrease if this model\'s scores are included in the portfolio average.',
    actions: [
      'Export the last 14 days of Copilot inference events and chart daily average confidence to confirm the trend is linear rather than episodic.',
      'Check for any prompt template changes, system instruction updates, or configuration changes deployed to Copilot in the last 7–10 days.',
      'Segment confidence scores by query category or topic to identify whether the decline is broad or concentrated in a specific input type.',
      'Set a Policy Engine alert rule: if confidence_score falls below 0.80, flag the response and route to human review before delivery.',
      'If no configuration change is found, escalate to the model team to evaluate retraining or fine-tuning on recent query distributions.',
    ],
  },
  {
    id: 'mp-3',
    category: 'Model Performance',
    priority: 'medium',
    title: 'Claude Sonnet inference latency spike — p95 above 3s',
    summary: 'p95 latency for Claude Sonnet on Mpower Agent has spiked to 3.4s, up from a 1.8s baseline.',
    module: 'Mpower Agent',
    detail:
      'The 95th-percentile inference latency for Claude Sonnet on Mpower Agent has risen to 3.4 seconds, nearly double the 7-day baseline of 1.8 seconds. High latency directly impacts agent response quality in live contact centre interactions and can lead to timeout-driven fallbacks that bypass governance checks entirely. The spike began approximately 18 hours ago and coincides with a change in average session length.',
    actions: [
      'Confirm the latency spike in the raw audit_events data by computing p50, p95, and p99 latency for the last 48 hours vs the prior 7-day baseline.',
      'Investigate whether the spike correlates with an increase in average prompt length — longer sessions may be causing longer context windows.',
      'Check the Anthropic API status page and recent changelog for any known performance issues or model updates in the last 24 hours.',
      'Review Mpower Agent session configuration for any recent changes to system prompt length or tool definitions that could increase tokens-per-request.',
      'Implement a latency SLA policy rule: flag any inference event where response time exceeds 3s for monitoring and trend analysis.',
    ],
  },

  // ── Security & Access ──────────────────────────────────────────────────────
  {
    id: 'sa-1',
    category: 'Security & Access',
    priority: 'critical',
    title: 'No authentication layer — all tenant data is publicly accessible',
    summary: 'Every API endpoint returns data without validating any token, session, or identity claim.',
    module: 'All modules',
    detail:
      'The platform currently has no authentication or authorisation layer. All REST API endpoints respond to any request regardless of origin, token, or identity. In the current prototype state this uses a hardcoded seed tenant ID, but the implication is that any user with the API URL can read and modify all audit events, policies, model data, and governance metrics. This must be addressed before any non-development deployment.',
    actions: [
      'Define user roles and permissions matrix: Admin (full access), Analyst (read + export), Viewer (read only), and map each to API endpoint groups.',
      'Implement JWT-based authentication middleware in the Go API that validates tokens on every request before routing.',
      'Add a users and sessions table to PostgreSQL and build login/logout endpoints with bcrypt password hashing.',
      'Replace the hardcoded tenant_id with a claim extracted from the validated JWT so all queries are scoped to the authenticated tenant.',
      'Enable HTTPS and set Secure, HttpOnly, and SameSite=Strict on all session cookies before any non-localhost deployment.',
    ],
  },
  {
    id: 'sa-2',
    category: 'Security & Access',
    priority: 'medium',
    title: 'SIEM integration not configured — audit events are not being forwarded',
    summary: 'The SIEM Push modal is available but no real endpoint is connected; events stay local only.',
    module: 'All modules',
    detail:
      'The Audit Log SIEM Push feature provides a CEF-format preview and a simulated push confirmation, but is not connected to a real SIEM endpoint. Audit events are retained only in the local PostgreSQL database and are not replicated to Splunk, QRadar, or any other security information platform. For organisations with SOC 2 or ISO 27001 requirements, centralised SIEM ingestion of AI governance events is typically a mandatory control.',
    actions: [
      'Obtain SIEM endpoint credentials (Splunk HEC token, QRadar syslog host) from the security team and store them in environment variables.',
      'Build a Go SIEM forwarder service that reads new audit events from PostgreSQL and POSTs them in CEF format to the configured endpoint.',
      'Wire the existing SIEM Push UI (Configure button in the Audit Log) to persist configuration to the API rather than React state.',
      'Test forwarding with a sample of audit events and verify they appear correctly parsed in the SIEM dashboard.',
      'Set up a dead-letter queue or retry mechanism so SIEM delivery failures do not result in lost events.',
    ],
  },

  // ── Operational ────────────────────────────────────────────────────────────
  {
    id: 'op-1',
    category: 'Operational',
    priority: 'high',
    title: 'Alert acknowledgement state resets on page reload',
    summary: 'Acknowledged alerts return to unacknowledged state when the dashboard is refreshed.',
    module: 'All modules',
    detail:
      'The Alert Feed\'s acknowledge, escalate, and dismiss actions update UI state in memory only. Refreshing the dashboard or opening it in a new tab shows all alerts as unacknowledged again. This means the same alert can be acknowledged by multiple operators unknowingly, and there is no audit trail of who actioned which alert or when. A persistent acknowledgement state requires either a database write or localStorage persistence.',
    actions: [
      'Add a status column to the governance_alerts table (values: active, acknowledged, escalated, dismissed) with an actioned_by and actioned_at field.',
      'Build a PATCH /api/v1/governance/alerts/:id endpoint that updates the alert status and records the actor.',
      'Update the useAlerts hook and AlertFeed component to call the new endpoint on acknowledge/escalate/dismiss rather than updating local state.',
      'Filter the default Alert Feed view to show only active alerts, with a toggle to view resolved ones.',
      'Display the actor and timestamp on resolved alerts so there is a clear audit trail of who took action.',
    ],
  },
  {
    id: 'op-2',
    category: 'Operational',
    priority: 'medium',
    title: 'Dashboard updates on 30-second poll — real-time feed not active',
    summary: 'Alert and metric data refreshes on a timer rather than via WebSocket push, adding up to 30s lag.',
    module: 'All modules',
    detail:
      'The governance dashboard currently re-fetches alert and metric data on a 30-second polling interval. For a contact centre AI platform processing tens of thousands of decisions per hour, a 30-second lag between a critical policy violation and its appearance on the dashboard is operationally significant. The WebSocket infrastructure (Redis pub-sub, client-side hook) is scaffolded but not yet connected to a live server-side emitter.',
    actions: [
      'Build a Go WebSocket handler at /ws that upgrades HTTP connections and subscribes to the Redis pub-sub channel for new governance events.',
      'Publish a message to Redis every time a new blocked or flagged audit event is ingested by the API.',
      'Update the useWebSocket hook in the frontend to connect to /ws and call queryClient.invalidateQueries on receiving a push message.',
      'Replace the 30-second refetchInterval on useAlerts with the WebSocket-driven invalidation.',
      'Add a connection status indicator to the dashboard header showing whether the live feed is connected or polling.',
    ],
  },
  {
    id: 'op-3',
    category: 'Operational',
    priority: 'low',
    title: 'Audit log export cap may be insufficient for compliance audits',
    summary: 'Export is capped at 5,000 rows; the Go API clamps page_size to 200 — exports may be incomplete.',
    module: 'All modules',
    detail:
      'The Audit Log export sends a request with page_size=5000, but the Go API handler enforces a hard cap of 200 records per page. For organisations with high AI decision volumes, a compliance audit covering a 90-day period could involve millions of events. The current export will silently return only the first 200 records, which may give auditors an incomplete and potentially misleading picture of AI behaviour.',
    actions: [
      'Remove or raise the 200-row page_size cap in the Go audit log handler — replace with a configurable environment variable (default 10,000).',
      'Implement cursor-based or keyset pagination for the export path so large exports can be streamed in chunks without loading all rows into memory.',
      'Add a row count to the export filename and metadata envelope so auditors can immediately see if the export is a subset of the full dataset.',
      'Add a warning banner in the Audit Log UI if the active filter would return more rows than the export cap.',
      'Consider an async export flow for very large datasets: trigger export job, notify when ready, provide a download link.',
    ],
  },
];

// ── Category config ───────────────────────────────────────────────────────────

type CategoryConfig = {
  icon: React.ReactNode;
  bg: string;
  text: string;
  border: string;
  headerBg: string;
};

const CATEGORY_CONFIG: Record<Category, CategoryConfig> = {
  'Policy & Compliance': {
    icon:     <ShieldCheck className="h-4 w-4 text-[#2563EB]" />,
    bg:       '#EFF6FF',
    text:     '#2563EB',
    border:   '#BFDBFE',
    headerBg: '#DBEAFE',
  },
  'Model Performance': {
    icon:     <Activity className="h-4 w-4 text-[#16A34A]" />,
    bg:       '#F0FDF4',
    text:     '#16A34A',
    border:   '#BBF7D0',
    headerBg: '#DCFCE7',
  },
  'Security & Access': {
    icon:     <Lock className="h-4 w-4 text-[#DC2626]" />,
    bg:       '#FEF2F2',
    text:     '#DC2626',
    border:   '#FECACA',
    headerBg: '#FEE2E2',
  },
  'Operational': {
    icon:     <Settings className="h-4 w-4 text-[#7C3AED]" />,
    bg:       '#F5F3FF',
    text:     '#7C3AED',
    border:   '#DDD6FE',
    headerBg: '#EDE9FE',
  },
};

const PRIORITY_STYLES: Record<Priority, string> = {
  critical: 'bg-[#FEE2E2] text-[#DC2626]',
  high:     'bg-[#FFEDD5] text-[#C2410C]',
  medium:   'bg-[#FEF3C7] text-[#92400E]',
  low:      'bg-[#DBEAFE] text-[#1D4ED8]',
};

const PRIORITY_DOT: Record<Priority, string> = {
  critical: 'bg-[#DC2626]',
  high:     'bg-[#EA580C]',
  medium:   'bg-[#D97706]',
  low:      'bg-[#3B82F6]',
};

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  governanceScore?: number;
  policyViolations?: number;
  alertCount?: number;
};

export default function RecommendedActions({ governanceScore, policyViolations, alertCount }: Props) {
  const [selected, setSelected] = useState<Recommendation | null>(null);

  const categories = [...new Set(RECOMMENDATIONS.map((r) => r.category))] as Category[];
  const PRIORITY_ORDER: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

  const criticalCount = RECOMMENDATIONS.filter((r) => r.priority === 'critical').length;
  const highCount     = RECOMMENDATIONS.filter((r) => r.priority === 'high').length;

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-[#E5E7EB]" style={{ padding: '16px 16px 14px' }}>
          <div>
            <div className="text-[13.5px] font-bold text-[#111827]">Recommended Actions</div>
            <div className="text-[11.5px] text-[#9CA3AF]">
              {RECOMMENDATIONS.length} recommendations across {categories.length} categories
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {criticalCount > 0 && (
              <span className="rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[10.5px] font-bold text-[#DC2626]">
                {criticalCount} critical
              </span>
            )}
            {highCount > 0 && (
              <span className="rounded-full bg-[#FFEDD5] px-2 py-0.5 text-[10.5px] font-bold text-[#C2410C]">
                {highCount} high
              </span>
            )}
          </div>
        </div>

        {/* Category groups */}
        <div className="divide-y divide-[#F3F4F6]">
          {categories.map((category) => {
            const config = CATEGORY_CONFIG[category];
            const items  = RECOMMENDATIONS
              .filter((r) => r.category === category)
              .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

            return (
              <div key={category}>
                {/* Category header */}
                <div
                  className="flex items-center gap-2"
                  style={{ background: config.headerBg, padding: '8px 16px', borderBottom: `1px solid ${config.border}` }}
                >
                  {config.icon}
                  <span className="text-[11px] font-bold uppercase tracking-[.05em]" style={{ color: config.text }}>
                    {category}
                  </span>
                  <span
                    className="ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{ background: config.border, color: config.text }}
                  >
                    {items.length}
                  </span>
                </div>

                {/* Recommendation rows */}
                <div>
                  {items.map((rec) => (
                    <button
                      key={rec.id}
                      type="button"
                      onClick={() => setSelected(rec)}
                      className="flex w-full items-start gap-3 border-b border-[#F3F4F6] px-4 py-3 text-left transition-colors hover:bg-[#F9FAFB] last:border-b-0"
                    >
                      <div className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${PRIORITY_DOT[rec.priority]}`} />
                      <div className="min-w-0 flex-1">
                        <span className="text-[12.5px] font-semibold text-[#111827]">{rec.title}</span>
                        <p className="mt-0.5 text-[11.5px] leading-snug text-[#6B7280]">{rec.summary}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className={`rounded-full px-1.5 py-0.5 text-[9.5px] font-bold capitalize ${PRIORITY_STYLES[rec.priority]}`}>
                            {rec.priority}
                          </span>
                          <span className="rounded-full bg-[#F3F4F6] px-1.5 py-0.5 text-[9.5px] text-[#6B7280]">
                            {rec.module}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-[#D1D5DB]" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <RecommendationDrawer
        recommendation={selected}
        dashboardContext={{ governanceScore, policyViolations, alertCount }}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
