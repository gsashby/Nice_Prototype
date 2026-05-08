import { cn } from '@/lib/utils';

type Status = 'healthy' | 'warning' | 'critical' | 'active' | 'inactive';

const statusStyles: Record<Status, string> = {
  healthy:  'bg-[#DCFCE7] text-[#15803D]',
  active:   'bg-[#DCFCE7] text-[#15803D]',
  warning:  'bg-[#FEF3C7] text-[#92400E]',
  critical: 'bg-[#FEE2E2] text-[#DC2626]',
  inactive: 'bg-[#F3F4F6] text-[#4B5563]',
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
        statusStyles[status]
      )}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
