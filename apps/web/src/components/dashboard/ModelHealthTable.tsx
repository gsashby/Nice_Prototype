'use client';
import { useModelHealth } from '@/hooks/useModelHealth';
import StatusBadge from '@/components/shared/StatusBadge';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';

function modelStatus(score: number): 'healthy' | 'warning' | 'critical' {
  if (score >= 85) return 'healthy';
  if (score >= 70) return 'warning';
  return 'critical';
}

export default function ModelHealthTable() {
  const { data, isLoading } = useModelHealth();
  const models = data?.models ?? [];

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900">
      <div className="border-b border-gray-800 px-5 py-4">
        <h2 className="text-sm font-medium text-gray-300">Model Health Overview</h2>
      </div>

      {isLoading ? (
        <div className="space-y-px p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-10" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                <th className="px-5 py-3 font-medium">Model</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Gov. Score</th>
                <th className="px-5 py-3 font-medium">Bias Score</th>
                <th className="px-5 py-3 font-medium">Avg Confidence</th>
                <th className="px-5 py-3 font-medium">Inferences (7d)</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-5 py-3 font-medium text-white">{m.name}</td>
                  <td className="px-5 py-3 text-gray-400">{m.type}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={modelStatus(m.governance_score)} />
                  </td>
                  <td className="px-5 py-3 text-white">{m.governance_score.toFixed(1)}%</td>
                  <td className="px-5 py-3 text-white">{m.bias_score.toFixed(3)}</td>
                  <td className="px-5 py-3 text-white">
                    {(m.confidence_avg * 100).toFixed(1)}%
                  </td>
                  <td className="px-5 py-3 text-gray-400">
                    {m.total_inferences.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
