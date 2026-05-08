import { cn } from '@/lib/utils';

type Status = 'healthy' | 'warning' | 'critical' | 'active' | 'inactive';

const statusStyles: Record<Status, string> = {
  healthy: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  active: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  warning: 'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20',
  critical: 'bg-red-500/10 text-red-400 ring-red-500/20',
  inactive: 'bg-gray-500/10 text-gray-400 ring-gray-500/20',
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        statusStyles[status]
      )}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
