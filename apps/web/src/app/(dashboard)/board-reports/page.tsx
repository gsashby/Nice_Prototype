'use client';
import { useState } from 'react';
import PageHeader from '@/components/shared/PageHeader';
import ReportConfig from '@/components/board-reports/ReportConfig';
import ReportPreview from '@/components/board-reports/ReportPreview';
import { generateCertificate } from '@/lib/reportCertificate';
import { apiGet } from '@/lib/api-client';
import type { ReportConfig as Config } from '@/components/board-reports/ReportConfig';
import type { ReportData } from '@/components/board-reports/ReportPreview';
import type { GovernanceMetrics } from '@/types/governance';
import type { ModelHealth } from '@/hooks/useModelHealth';
import type { LiveAlert } from '@/hooks/useAlerts';
import type { Policy } from '@/types/policy';
import type { AuditEvent } from '@/types/audit';

type AuditPage = { events: AuditEvent[]; total: number };

function buildAuditParams(config: Config, outcome?: string) {
  const p = new URLSearchParams({ page: '1', page_size: '1', start_date: config.startDate, end_date: config.endDate });
  if (outcome) p.set('outcome', outcome);
  return p.toString();
}

export default function BoardReportsPage() {
  const [step, setStep]               = useState<1 | 2>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [reportData, setReportData]   = useState<ReportData | null>(null);

  async function handleGenerate(config: Config) {
    setIsGenerating(true);
    setError(null);

    try {
      const [metrics, modelsRes, alertsRes, policiesRes, totalRes, blockedRes, flaggedRes] =
        await Promise.all([
          apiGet<GovernanceMetrics>('/api/v1/governance/metrics'),
          apiGet<{ models: ModelHealth[] }>('/api/v1/governance/models'),
          apiGet<{ alerts: LiveAlert[] }>('/api/v1/governance/alerts'),
          apiGet<{ policies: Policy[] }>('/api/v1/policies'),
          apiGet<AuditPage>(`/api/v1/audit-log?${buildAuditParams(config)}`),
          apiGet<AuditPage>(`/api/v1/audit-log?${buildAuditParams(config, 'blocked')}`),
          apiGet<AuditPage>(`/api/v1/audit-log?${buildAuditParams(config, 'flagged')}`),
        ]);

      const total   = totalRes.total;
      const blocked = blockedRes.total;
      const flagged = flaggedRes.total;
      const allowed = Math.max(0, total - blocked - flagged);

      const certPayload = { config, metrics, total, blocked, flagged, allowed, generatedAt: new Date().toISOString() };
      const certificate = await generateCertificate(certPayload);

      setReportData({
        config,
        metrics,
        models:     modelsRes.models ?? [],
        alerts:     alertsRes.alerts ?? [],
        policies:   policiesRes.policies ?? [],
        auditStats: { total, blocked, flagged, allowed },
        certificate,
      });
      setStep(2);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-6" style={{ paddingLeft: 24 }}>
      <PageHeader
        title="Board Report Builder"
        description="Automated executive-ready AI compliance reports"
      />

      {/* Step indicator */}
      <div className="print:hidden flex items-center gap-3 max-w-2xl">
        {[
          { n: 1, label: 'Configure' },
          { n: 2, label: 'Preview & Export' },
        ].map(({ n, label }, i) => {
          const active = step === n;
          const done   = step > n;
          return (
            <div key={n} className="flex items-center gap-3">
              {i > 0 && <div className={`h-px w-12 ${done ? 'bg-[#2563EB]' : 'bg-[#E5E7EB]'}`} />}
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold flex-shrink-0 ${
                    active ? 'bg-[#2563EB] text-white' : done ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#F3F4F6] text-[#9CA3AF]'
                  }`}
                >
                  {done ? '✓' : n}
                </span>
                <span className={`text-[12.5px] font-semibold ${active ? 'text-[#111827]' : 'text-[#9CA3AF]'}`}>
                  {label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error banner */}
      {error && (
        <div className="max-w-2xl rounded-[6px] border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-600">
          Failed to generate report: {error}
        </div>
      )}

      {/* Steps */}
      {step === 1 && (
        <ReportConfig onGenerate={handleGenerate} isGenerating={isGenerating} />
      )}

      {step === 2 && reportData && (
        <ReportPreview data={reportData} onBack={() => setStep(1)} />
      )}
    </div>
  );
}
