'use client';
import PageHeader from '@/components/shared/PageHeader';
import KpiCard from '@/components/dashboard/KpiCard';
import AlertFeed from '@/components/dashboard/AlertFeed';
import ModelHealthTable from '@/components/dashboard/ModelHealthTable';
import GovernanceScoreChart from '@/components/dashboard/GovernanceScoreChart';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import { useGovernanceMetrics } from '@/hooks/useGovernanceMetrics';

export default function GovernanceDashboard() {
  const { data, isLoading, isError } = useGovernanceMetrics();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Governance Dashboard"
        actions={
          <div className="flex items-center gap-2">
            <select className="h-8 rounded-[5px] border border-[#D1D5DB] bg-white px-2 pr-7 text-[12.5px] text-[#1F2937] focus:border-[#2563EB] focus:outline-none appearance-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: 'right 6px center', backgroundRepeat: 'no-repeat', backgroundSize: '14px' }}>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>Last 90 Days</option>
            </select>
            <button className="flex items-center gap-1.5 rounded-[5px] border border-[#D1D5DB] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-colors">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Export
            </button>
            <button className="flex items-center gap-1.5 rounded-[5px] bg-[#2563EB] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-[#1D4ED8] transition-colors">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              Board Report
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
              title="AI Decisions Today"
              value="62,847"
              trend="up"
              delta="+8.3% vs yesterday"
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
              title="Policy Violations (7d)"
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
        <GovernanceScoreChart trend={data?.trend ?? []} isLoading={isLoading} />
        <AlertFeed />
      </div>

      {/* Bottom row: 1fr 1fr */}
      <ModelHealthTable />
    </div>
  );
}
