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
    <div className="space-y-6">
      <PageHeader
        title="Governance Dashboard"
        description="Real-time AI governance health across your CXone environment"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-28" />
          ))
        ) : isError ? (
          <div className="col-span-4 rounded-lg border border-red-800 bg-red-950/30 p-4 text-sm text-red-400">
            Could not load metrics — is the API running? (<code>make run</code> in <code>apps/api</code>)
          </div>
        ) : (
          <>
            <KpiCard
              title="Governance Score"
              value={data!.governance_score.toFixed(1)}
              unit="%"
              trend={data!.governance_score >= 90 ? 'up' : data!.governance_score >= 75 ? 'stable' : 'down'}
              delta=""
            />
            <KpiCard
              title="Active Policies"
              value={String(data!.active_policies)}
              unit=""
              trend="stable"
              delta=""
            />
            <KpiCard
              title="Violations (24h)"
              value={String(data!.policy_violations_24h)}
              unit=""
              trend={data!.policy_violations_24h === 0 ? 'up' : 'down'}
              delta=""
            />
            <KpiCard
              title="Models Monitored"
              value={String(data!.models_monitored)}
              unit=""
              trend="stable"
              delta=""
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <GovernanceScoreChart trend={data?.trend ?? []} isLoading={isLoading} />
        </div>
        <AlertFeed />
      </div>

      <ModelHealthTable />
    </div>
  );
}
