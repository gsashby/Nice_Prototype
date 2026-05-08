'use client';
import { useAlerts } from '@/hooks/useAlerts';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';

const severityColors = {
  critical: 'border-l-red-500 bg-red-500/5',
  high:     'border-l-orange-500 bg-orange-500/5',
  medium:   'border-l-yellow-500 bg-yellow-500/5',
  low:      'border-l-blue-500 bg-blue-500/5',
};

export default function AlertFeed() {
  const { data, isLoading } = useAlerts();
  const alerts = data?.alerts ?? [];

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-300">Live Alerts</h2>
        {!isLoading && (
          <span className="text-xs text-gray-500">{alerts.length} active</span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-14" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">No active alerts</p>
      ) : (
        <div className="space-y-2">
          {alerts.slice(0, 8).map((alert) => (
            <div
              key={alert.id}
              className={cn('rounded border-l-2 p-3', severityColors[alert.severity] ?? severityColors.low)}
            >
              <div className="flex justify-between">
                <span className="text-sm font-medium text-white">{alert.title}</span>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-400">{alert.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
