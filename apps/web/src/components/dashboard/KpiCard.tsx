import { cn } from '@/lib/utils';

type KpiCardProps = {
  title: string;
  value: string;
  unit?: string;
  trend: 'up' | 'down' | 'stable';
  delta: string;
  accentGradient?: string;
  iconBg?: string;
  iconColor?: string;
  valueColor?: string;
  icon: React.ReactNode;
};

export default function KpiCard({
  title,
  value,
  unit,
  trend,
  delta,
  accentGradient = 'linear-gradient(90deg,#2563EB,#60A5FA)',
  iconBg = '#EFF6FF',
  valueColor = '#111827',
  icon,
}: KpiCardProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)] min-w-0">
      <div style={{ height: 4, background: accentGradient }} />
      <div className="p-4">
        <div className="mb-2.5 flex items-start justify-between">
          <div className="text-[11px] font-bold uppercase tracking-[.06em] text-[#6B7280]">{title}</div>
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ background: iconBg }}
          >
            {icon}
          </div>
        </div>
        <div className="mb-2 text-[32px] font-bold leading-none" style={{ color: valueColor }}>
          {value}{unit}
        </div>
        {delta && (
          <div className={cn('flex items-center gap-1 text-[12px]', trend === 'up' ? 'text-[#15803D]' : trend === 'down' ? 'text-[#DC2626]' : 'text-[#6B7280]')}>
            {trend === 'up' && (
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><polyline points="18 15 12 9 6 15"/></svg>
            )}
            {trend === 'down' && (
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg>
            )}
            {delta}
          </div>
        )}
      </div>
    </div>
  );
}
