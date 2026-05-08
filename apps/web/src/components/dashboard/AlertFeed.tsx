'use client';
import { useAlerts } from '@/hooks/useAlerts';
import { formatDistanceToNow } from 'date-fns';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';

const dotColors = {
  critical: 'bg-[#EF4444]',
  high:     'bg-[#F59E0B]',
  medium:   'bg-[#F59E0B]',
  low:      'bg-[#3B82F6]',
};

export default function AlertFeed() {
  const { data, isLoading } = useAlerts();
  const alerts = data?.alerts ?? [];

  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,.06)]">
      <div className="mb-3.5 flex items-center justify-between">
        <div className="text-[13.5px] font-bold text-[#111827]">Active Alerts</div>
        {!isLoading && alerts.length > 0 && (
          <span className="rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[11px] font-semibold text-[#DC2626]">
            {alerts.filter(a => a.severity === 'critical').length} Critical
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <LoadingSkeleton key={i} className="h-14" />)}
        </div>
      ) : alerts.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#6B7280]">No active alerts</p>
      ) : (
        <div className="space-y-2">
          {alerts.slice(0, 5).map((alert) => (
            <div key={alert.id} className="flex items-start gap-2.5 rounded-[6px] border border-[#F3F4F6] bg-white p-2.5">
              <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${dotColors[alert.severity] ?? dotColors.low}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[12.5px] font-semibold text-[#111827] leading-tight">{alert.title}</div>
                  <button className="flex-shrink-0 rounded-[5px] border border-[#D1D5DB] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-colors whitespace-nowrap">
                    Investigate
                  </button>
                </div>
                <p className="mt-0.5 text-[11.5px] text-[#6B7280]">{alert.description}</p>
                <p className="mt-1 text-[11px] text-[#9CA3AF]">
                  {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
