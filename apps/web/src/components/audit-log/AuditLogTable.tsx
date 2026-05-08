'use client';
import { useAuditLog } from '@/hooks/useAuditLog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import type { AuditLogFilters } from '@/types/audit';

type Props = {
  filters: AuditLogFilters;
  onPageChange: (page: number) => void;
};

const outcomeColors = {
  allowed: 'text-emerald-400',
  blocked: 'text-red-400',
  flagged: 'text-yellow-400',
};

export default function AuditLogTable({ filters, onPageChange }: Props) {
  const { data, isLoading, isError } = useAuditLog(filters);

  const events = data?.events ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / filters.pageSize);

  if (isError) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950/30 p-4 text-sm text-red-400">
        Failed to load audit events — is the API running?
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-gray-800 bg-gray-900">
        {isLoading ? (
          <div className="space-y-px p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <LoadingSkeleton key={i} className="h-10" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            No events match the current filters
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                  <th className="px-5 py-3 font-medium">Timestamp</th>
                  <th className="px-5 py-3 font-medium">Event Type</th>
                  <th className="px-5 py-3 font-medium">Model</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                  <th className="px-5 py-3 font-medium">Outcome</th>
                  <th className="px-5 py-3 font-medium">Confidence</th>
                  <th className="px-5 py-3 font-medium">Violations</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer">
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">
                      {format(new Date(event.event_time), 'yyyy-MM-dd HH:mm:ss')}
                    </td>
                    <td className="px-5 py-3 text-gray-300">{event.event_type}</td>
                    <td className="px-5 py-3 text-white">{event.model_name || '—'}</td>
                    <td className="px-5 py-3 text-gray-300">{event.action}</td>
                    <td className={cn('px-5 py-3 font-medium capitalize', outcomeColors[event.outcome] ?? 'text-gray-400')}>
                      {event.outcome}
                    </td>
                    <td className="px-5 py-3 text-white">
                      {(event.confidence_score * 100).toFixed(1)}%
                    </td>
                    <td className="px-5 py-3 text-xs text-red-400">
                      {event.policy_violations?.length > 0
                        ? event.policy_violations.join(', ')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>{total.toLocaleString()} events</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(filters.page - 1)}
              disabled={filters.page <= 1}
              className="rounded border border-gray-700 px-3 py-1 hover:border-gray-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span>Page {filters.page} of {totalPages}</span>
            <button
              onClick={() => onPageChange(filters.page + 1)}
              disabled={filters.page >= totalPages}
              className="rounded border border-gray-700 px-3 py-1 hover:border-gray-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
