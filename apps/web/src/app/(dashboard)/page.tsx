'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import KpiCard from '@/components/dashboard/KpiCard';
import AlertFeed from '@/components/dashboard/AlertFeed';
import ModelHealthTable from '@/components/dashboard/ModelHealthTable';
import GovernanceScoreChart from '@/components/dashboard/GovernanceScoreChart';
import RecommendedActions from '@/components/dashboard/RecommendedActions';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import SummaryModal from '@/components/dashboard/SummaryModal';
import NlqPanel from '@/components/nlq/NlqPanel';
import { useGovernanceMetrics } from '@/hooks/useGovernanceMetrics';
import { useAlerts } from '@/hooks/useAlerts';
import { useModelHealth } from '@/hooks/useModelHealth';

const DAY_OPTIONS = [
  { label: 'Last 7 Days',  days: 7  },
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 },
];

export default function GovernanceDashboard() {
  const [days, setDays] = useState(7);
  const { data, isLoading, isError } = useGovernanceMetrics(days);
  const { data: alertsData } = useAlerts(days);
  const { data: modelData } = useModelHealth(days);

  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  function handleExport() {
    const esc = (v: string | number) => {
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const row = (...cols: (string | number)[]) => cols.map(esc).join(',');
    const periodLabel = DAY_OPTIONS.find((o) => o.days === days)?.label ?? `Last ${days} Days`;
    const today = new Date().toISOString().slice(0, 10);

    const sections: string[] = [];

    // ── Summary ──────────────────────────────────────────────────────────────
    sections.push('SUMMARY');
    sections.push(row('Period', 'AI Decisions', 'Avg Governance Score', 'Policy Violations', 'Compliance Coverage'));
    sections.push(row(
      periodLabel,
      data?.total_inferences ?? 0,
      data ? data.governance_score.toFixed(2) : '',
      data?.policy_violations_24h ?? 0,
      '100%',
    ));

    // ── Module Health ─────────────────────────────────────────────────────────
    sections.push('');
    sections.push('MODULE HEALTH');
    sections.push(row('Module', 'Model Version', 'Coverage', 'Avg Confidence', 'Governance Score', 'Total Inferences', 'Violations', 'Status'));
    for (const m of modelData?.models ?? []) {
      const status = m.governance_score >= 85 ? 'Healthy' : m.governance_score >= 70 ? 'Watch' : 'Critical';
      sections.push(row(m.name, m.type, '100%', m.confidence_avg.toFixed(2), `${m.governance_score.toFixed(1)}%`, m.total_inferences, m.violation_count, status));
    }

    // ── Governance Score Trend ────────────────────────────────────────────────
    sections.push('');
    sections.push('GOVERNANCE SCORE TREND');
    sections.push(row('Date', 'Score'));
    for (const pt of data?.trend ?? []) {
      sections.push(row(pt.date, pt.score));
    }

    // ── Active Alerts ─────────────────────────────────────────────────────────
    sections.push('');
    sections.push('ACTIVE ALERTS');
    sections.push(row('Severity', 'Title', 'Description', 'Timestamp'));
    for (const a of alertsData?.alerts ?? []) {
      sections.push(row(a.severity, a.title, a.description, new Date(a.timestamp).toISOString()));
    }

    const csv = sections.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `governance-report-${days}d-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSummarize() {
    setModalOpen(true);
    setSummaryLoading(true);
    setSummaryError(null);
    setSummary('');

    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          governance_score: data?.governance_score,
          decisions_today: '62,847',
          policy_violations: data?.policy_violations_24h,
          compliance_coverage: '100%',
          alerts: alertsData?.alerts ?? [],
          models: modelData?.models ?? [],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Request failed');
      setSummary(json.summary);
    } catch (e) {
      setSummaryError((e as Error).message);
    } finally {
      setSummaryLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <NlqPanel />

      <PageHeader
        title="Governance Dashboard"
        actions={
          <div className="flex items-center gap-2">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="appearance-none rounded-[5px] border border-[#D1D5DB] bg-white text-[12.5px] text-[#1F2937] focus:border-[#2563EB] focus:outline-none"
              style={{ padding: '7px 32px 7px 10px', width: 160, backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: 'right 8px center', backgroundRepeat: 'no-repeat', backgroundSize: '16px' }}
            >
              {DAY_OPTIONS.map(({ label, days: d }) => (
                <option key={d} value={d}>{label}</option>
              ))}
            </select>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-[6px] rounded-[5px] border border-[#D1D5DB] bg-white font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-all whitespace-nowrap"
              style={{ padding: '4px 10px', fontSize: 12 }}
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Export
            </button>
            <button
              onClick={() => router.push('/board-reports')}
              className="inline-flex items-center gap-[6px] rounded-[5px] bg-[#2563EB] font-semibold text-white hover:bg-[#1D4ED8] transition-all whitespace-nowrap"
              style={{ padding: '4px 10px', fontSize: 12 }}
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              Board Report
            </button>
            <button
              onClick={handleSummarize}
              className="inline-flex items-center gap-[6px] rounded-[5px] bg-[#7C3AED] font-semibold text-white hover:bg-[#6D28D9] transition-all whitespace-nowrap"
              style={{ padding: '4px 10px', fontSize: 12 }}
            >
              <Sparkles className="h-3 w-3" />
              Summarize with AI
            </button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 16 }}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-[116px]" />
          ))
        ) : isError ? (
          <div className="col-span-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-600">
            Could not load metrics — is the API running? (<code>make run</code> in <code>apps/api</code>)
          </div>
        ) : (
          <>
            <KpiCard
              title={`AI Decisions (${days}d)`}
              value={(data?.total_inferences ?? 0).toLocaleString()}
              trend="up"
              delta={`Last ${days} days`}
              accentGradient="linear-gradient(90deg,#2563EB,#60A5FA)"
              iconBg="#EFF6FF"
              icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#2563EB" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>}
            />
            <KpiCard
              title="Avg Confidence Score"
              value={data ? data.governance_score.toFixed(2) : '0.83'}
              trend="up"
              delta="+0.02 vs 30-day avg"
              accentGradient="linear-gradient(90deg,#16A34A,#4ADE80)"
              iconBg="#F0FDF4"
              valueColor="#16A34A"
              icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#16A34A" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
            />
            <KpiCard
              title={`Policy Violations (${days}d)`}
              value={data ? String(data.policy_violations_24h) : '3'}
              trend="down"
              delta="+1 vs prior period"
              accentGradient="linear-gradient(90deg,#DC2626,#F87171)"
              iconBg="#FEF2F2"
              valueColor="#DC2626"
              icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
            />
            <KpiCard
              title="Compliance Coverage"
              value="100%"
              trend="stable"
              delta="Autopilot · Copilot · Mpower"
              accentGradient="linear-gradient(90deg,#0D9488,#2DD4BF)"
              iconBg="#F0FDFA"
              valueColor="#0D9488"
              icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#0D9488" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>}
            />
          </>
        )}
      </div>

      {/* Charts row: 2fr 1fr */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <GovernanceScoreChart trend={data?.trend ?? []} isLoading={isLoading} days={days} />
        <AlertFeed days={days} />
      </div>

      {/* Bottom row */}
      <ModelHealthTable days={days} />

      <RecommendedActions
        governanceScore={data?.governance_score}
        policyViolations={data?.policy_violations_24h}
        alertCount={alertsData?.alerts?.length}
      />

      <SummaryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        summary={summary}
        isLoading={summaryLoading}
        error={summaryError}
      />
    </div>
  );
}
