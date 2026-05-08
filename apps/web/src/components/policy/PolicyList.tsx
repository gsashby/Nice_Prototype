'use client';
import { usePolicies } from '@/hooks/usePolicies';
import StatusBadge from '@/components/shared/StatusBadge';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import { cn } from '@/lib/utils';

const severityColors: Record<string, string> = {
  critical: 'text-red-400',
  high:     'text-orange-400',
  medium:   'text-yellow-400',
  low:      'text-blue-400',
};

export default function PolicyList() {
  const { data, isLoading, isError } = usePolicies();
  const policies = data ?? [];

  if (isError) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950/30 p-4 text-sm text-red-400">
        Failed to load policies — is the API running?
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900">
      {isLoading ? (
        <div className="space-y-px p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-10" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                <th className="px-5 py-3 font-medium">Policy Name</th>
                <th className="px-5 py-3 font-medium">Description</th>
                <th className="px-5 py-3 font-medium">Severity</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Violations (7d)</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((policy) => (
                <tr key={policy.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-5 py-3 font-medium text-white">{policy.name}</td>
                  <td className="px-5 py-3 text-gray-400">{policy.description}</td>
                  <td className={cn('px-5 py-3 font-medium capitalize', severityColors[policy.severity] ?? 'text-gray-400')}>
                    {policy.severity}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={policy.enabled ? 'active' : 'inactive'} />
                  </td>
                  <td className="px-5 py-3 text-white">{policy.violationCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
