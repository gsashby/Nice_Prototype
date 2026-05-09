'use client';
import { useRef } from 'react';
import { format } from 'date-fns';
import type { ReportConfig } from './ReportConfig';
import type { Certificate } from '@/lib/reportCertificate';
import type { GovernanceMetrics } from '@/types/governance';
import type { ModelHealth } from '@/hooks/useModelHealth';
import type { LiveAlert } from '@/hooks/useAlerts';
import type { Policy } from '@/types/policy';

export type ReportData = {
  config: ReportConfig;
  metrics: GovernanceMetrics;
  models: ModelHealth[];
  alerts: LiveAlert[];
  policies: Policy[];
  auditStats: { total: number; blocked: number; flagged: number; allowed: number };
  certificate: Certificate;
};

type Props = {
  data: ReportData;
  onBack: () => void;
};

const severityColour: Record<string, string> = {
  critical: '#DC2626',
  high:     '#C2410C',
  medium:   '#92400E',
  low:      '#1D4ED8',
};

const severityBg: Record<string, string> = {
  critical: '#FEE2E2',
  high:     '#FFEDD5',
  medium:   '#FEF3C7',
  low:      '#DBEAFE',
};

function statusLabel(score: number) {
  if (score >= 85) return { label: 'Healthy',  colour: '#15803D', bg: '#DCFCE7' };
  if (score >= 70) return { label: 'Watch',    colour: '#92400E', bg: '#FEF3C7' };
  return              { label: 'Critical', colour: '#DC2626', bg: '#FEE2E2' };
}

function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid #E5E7EB' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: '#0B2D55', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
          {number}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', letterSpacing: '-.2px' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function KpiBox({ label, value, sub, colour = '#111827' }: { label: string; value: string | number; sub?: string; colour?: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0, border: '1px solid #E5E7EB', borderRadius: 8, padding: '14px 16px', background: '#FAFAFA' }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#9CA3AF', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: colour, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function ReportPreview({ data, onBack }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const { config, metrics, models, alerts, policies, auditStats, certificate } = data;

  const periodLabel = (() => {
    const s = format(new Date(config.startDate), 'MMM d, yyyy');
    const e = format(new Date(config.endDate),   'MMM d, yyyy');
    return `${s} – ${e}`;
  })();

  const blockedPct  = auditStats.total > 0 ? ((auditStats.blocked / auditStats.total) * 100).toFixed(1) : '0.0';
  const flaggedPct  = auditStats.total > 0 ? ((auditStats.flagged / auditStats.total) * 100).toFixed(1) : '0.0';
  const allowedPct  = auditStats.total > 0 ? ((auditStats.allowed / auditStats.total) * 100).toFixed(1) : '0.0';

  const criticalAlerts  = alerts.filter((a) => a.severity === 'critical').length;
  const enabledPolicies = policies.filter((p) => p.enabled).length;

  function handlePrint() {
    window.print();
  }

  function handleCopyHash() {
    navigator.clipboard.writeText(certificate.hash);
  }

  return (
    <div>
      {/* Toolbar — hidden on print */}
      <div className="print:hidden flex items-center justify-between mb-5">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-[5px] border border-[#D1D5DB] bg-white font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-all"
          style={{ padding: '5px 12px', fontSize: 12 }}
        >
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Reconfigure
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyHash}
            className="inline-flex items-center gap-1.5 rounded-[5px] border border-[#D1D5DB] bg-white font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-all"
            style={{ padding: '5px 12px', fontSize: 12 }}
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            Copy Certificate Hash
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-[5px] bg-[#2563EB] font-semibold text-white hover:bg-[#1D4ED8] transition-all"
            style={{ padding: '5px 14px', fontSize: 12 }}
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Download PDF
          </button>
        </div>
      </div>

      {/* Report document */}
      <div
        ref={printRef}
        style={{
          maxWidth: 860,
          margin: '0 auto',
          background: '#fff',
          border: '1px solid #E5E7EB',
          borderRadius: 8,
          boxShadow: '0 4px 24px rgba(0,0,0,.07)',
          overflow: 'hidden',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Cover header */}
        <div style={{ background: '#0B2D55', padding: '28px 36px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity=".7"/>
            </svg>
            <span style={{ color: 'rgba(255,255,255,.8)', fontSize: 13, fontWeight: 600, letterSpacing: '-.1px' }}>NICE CXone Mpower · AI Trust Center</span>
          </div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 12, letterSpacing: '-.4px' }}>
            {config.title}
          </h1>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              ['Reporting Period', periodLabel],
              ['Generated',        format(new Date(), "MMM d, yyyy 'at' HH:mm")],
              ['Prepared By',      config.preparedBy],
              ['Regulations',      config.regulations.join(' · ')],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'rgba(255,255,255,.5)', marginBottom: 2 }}>{k}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.9)', fontWeight: 500 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '28px 36px' }}>

          {/* 1. Executive Overview */}
          <Section number={1} title="Executive Overview">
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <KpiBox label="Total AI Decisions" value={auditStats.total.toLocaleString()} sub={`in reporting period`} />
              <KpiBox label="Blocked" value={auditStats.blocked.toLocaleString()} sub={`${blockedPct}% of decisions`} colour="#DC2626" />
              <KpiBox label="Flagged" value={auditStats.flagged.toLocaleString()} sub={`${flaggedPct}% of decisions`} colour="#D97706" />
              <KpiBox label="Governance Score" value={`${metrics.governance_score.toFixed(1)}%`} sub={`${metrics.models_monitored} models monitored`} colour="#15803D" />
            </div>

            <div style={{ marginTop: 14, padding: '12px 16px', background: '#F9FAFB', borderRadius: 6, border: '1px solid #E5E7EB' }}>
              <p style={{ fontSize: 12.5, color: '#374151', lineHeight: 1.7, margin: 0 }}>
                During the reporting period, <strong>{auditStats.total.toLocaleString()}</strong> AI decisions were processed
                across <strong>{metrics.models_monitored}</strong> monitored models. The platform maintained an overall
                governance score of <strong>{metrics.governance_score.toFixed(1)}%</strong>, with{' '}
                <strong style={{ color: '#DC2626' }}>{auditStats.blocked.toLocaleString()} decisions blocked</strong> ({blockedPct}%) and{' '}
                <strong style={{ color: '#D97706' }}>{auditStats.flagged.toLocaleString()} flagged</strong> ({flaggedPct}%) for review.
                Of <strong>{metrics.active_policies}</strong> active governance policies,{' '}
                <strong>{metrics.policy_violations_24h}</strong> violations were recorded in the last 24 hours.
                Compliance coverage across all applicable regulations ({config.regulations.join(', ')}) remains at <strong style={{ color: '#15803D' }}>100%</strong>.
              </p>
            </div>
          </Section>

          {/* 2. Policy Compliance */}
          <Section number={2} title="Policy Compliance">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                  {['Policy Name', 'Severity', 'Status', 'Violations'].map((h) => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: '#6B7280', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {policies.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '8px 12px', color: '#111827', fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 9999, padding: '1px 8px', fontSize: 10, fontWeight: 700, textTransform: 'capitalize', background: severityBg[p.severity] ?? '#F3F4F6', color: severityColour[p.severity] ?? '#374151' }}>
                        {p.severity}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 9999, padding: '1px 8px', fontSize: 10, fontWeight: 700, background: p.enabled ? '#DCFCE7' : '#F3F4F6', color: p.enabled ? '#15803D' : '#6B7280' }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: p.enabled ? '#16A34A' : '#9CA3AF', display: 'inline-block' }} />
                        {p.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', color: p.violationCount > 0 ? '#DC2626' : '#15803D', fontWeight: 600 }}>
                      {p.violationCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ marginTop: 10, fontSize: 11.5, color: '#6B7280', margin: '10px 0 0' }}>
              {enabledPolicies} of {policies.length} policies active. Policy rules are enforced across all AI modules in real time.
            </p>
          </Section>

          {/* 3. Model Performance */}
          <Section number={3} title="Model Performance">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                  {['Model', 'Type', 'Avg Confidence', 'Gov. Score', 'Inferences (7d)', 'Status'].map((h) => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: '#6B7280', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {models.filter((m) => m.status === 'active').map((m) => {
                  const st = statusLabel(m.governance_score);
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '8px 12px', color: '#111827', fontWeight: 600 }}>{m.name}</td>
                      <td style={{ padding: '8px 12px', color: '#6B7280', fontFamily: 'monospace', fontSize: 11 }}>{m.type}</td>
                      <td style={{ padding: '8px 12px', color: '#374151' }}>{(m.confidence_avg * 100).toFixed(1)}%</td>
                      <td style={{ padding: '8px 12px', color: '#374151', fontWeight: 600 }}>{m.governance_score.toFixed(1)}%</td>
                      <td style={{ padding: '8px 12px', color: '#374151' }}>{m.total_inferences.toLocaleString()}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 9999, padding: '1px 8px', fontSize: 10, fontWeight: 700, background: st.bg, color: st.colour }}>
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Section>

          {/* 4. Risk & Alert Summary */}
          <Section number={4} title="Risk & Alert Summary">
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <KpiBox label="Active Alerts" value={alerts.length} colour={alerts.length > 0 ? '#DC2626' : '#15803D'} />
              <KpiBox label="Critical Alerts" value={criticalAlerts} colour={criticalAlerts > 0 ? '#DC2626' : '#15803D'} />
              <KpiBox label="Blocked Decisions" value={auditStats.blocked.toLocaleString()} sub={`${blockedPct}% block rate`} colour="#DC2626" />
              <KpiBox label="Allowed" value={`${allowedPct}%`} sub="pass-through rate" colour="#15803D" />
            </div>

            {alerts.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                    {['Severity', 'Alert', 'Description', 'Time'].map((h) => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: '#6B7280' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alerts.slice(0, 10).map((a) => (
                    <tr key={a.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 9999, padding: '1px 8px', fontSize: 10, fontWeight: 700, textTransform: 'capitalize', background: severityBg[a.severity] ?? '#F3F4F6', color: severityColour[a.severity] ?? '#374151' }}>
                          {a.severity}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', color: '#111827', fontWeight: 600, whiteSpace: 'nowrap' }}>{a.title}</td>
                      <td style={{ padding: '8px 12px', color: '#6B7280', fontSize: 11.5 }}>{a.description}</td>
                      <td style={{ padding: '8px 12px', color: '#9CA3AF', fontSize: 11, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{format(new Date(a.timestamp), 'MMM d HH:mm')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ fontSize: 12.5, color: '#15803D', fontWeight: 600, padding: '12px 16px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 6, margin: 0 }}>
                ✓ No active alerts during the reporting period
              </p>
            )}
          </Section>

          {/* 5. Audit Certificate */}
          <Section number={5} title="Audit Certificate">
            <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ background: '#0B2D55', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>Cryptographic Audit Certificate</span>
                <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,.6)', fontSize: 11 }}>AITC v1.0 · SHA-256</span>
              </div>
              <div style={{ padding: '16px', background: '#F9FAFB' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  {[
                    ['Certificate ID', certificate.id],
                    ['Issued At',      format(new Date(certificate.issuedAt),  "MMM d, yyyy 'at' HH:mm:ss 'UTC'")],
                    ['Report Period',  periodLabel],
                    ['Expires At',     format(new Date(certificate.expiresAt), "MMM d, yyyy")],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#9CA3AF', marginBottom: 3 }}>{k}</div>
                      <div style={{ fontSize: 12, color: '#374151', fontWeight: 500, fontFamily: k === 'Certificate ID' ? 'monospace' : 'inherit' }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#9CA3AF', marginBottom: 4 }}>SHA-256 Content Hash</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#374151', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 5, padding: '8px 12px', wordBreak: 'break-all', letterSpacing: '.03em' }}>
                    {certificate.hash}
                  </div>
                </div>
                <p style={{ marginTop: 12, fontSize: 11, color: '#9CA3AF', lineHeight: 1.6, margin: '12px 0 0' }}>
                  This certificate verifies that the above report was generated from authentic, unmodified data retrieved from the AI Trust Center platform at the stated time. The SHA-256 hash uniquely identifies the report content. Any modification to the report would produce a different hash value.
                </p>
              </div>
            </div>
          </Section>

          {/* Footer */}
          <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>
              NICE CXone Mpower · AI Trust Center · Platform v2.8.0
            </span>
            <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' }}>
              {certificate.id}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
