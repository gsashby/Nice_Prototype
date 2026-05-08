import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

type KpiCardProps = {
  title: string;
  value: string;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  delta: string;
};

const trendConfig = {
  up: { icon: TrendingUp, color: 'text-emerald-400' },
  down: { icon: TrendingDown, color: 'text-red-400' },
  stable: { icon: Minus, color: 'text-gray-400' },
};

export default function KpiCard({ title, value, unit, trend, delta }: KpiCardProps) {
  const { icon: Icon, color } = trendConfig[trend];
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
      <p className="text-sm text-gray-400">{title}</p>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-white">{value}</span>
        {unit && <span className="text-lg text-gray-400">{unit}</span>}
      </div>
      <div className={cn('mt-2 flex items-center gap-1 text-sm', color)}>
        <Icon className="h-4 w-4" />
        <span>{delta} from last period</span>
      </div>
    </div>
  );
}
