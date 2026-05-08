'use client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';

type TrendPoint = { date: string; score: number };

type Props = {
  trend: TrendPoint[];
  isLoading: boolean;
};

export default function GovernanceScoreChart({ trend, isLoading }: Props) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
      <h2 className="mb-4 text-sm font-medium text-gray-300">
        Governance Score — 6 Week Trend
      </h2>
      {isLoading ? (
        <LoadingSkeleton className="h-60" />
      ) : trend.length === 0 ? (
        <div className="flex h-60 items-center justify-center text-sm text-gray-500">
          No trend data yet — run <code className="mx-1 text-gray-400">make seed</code> to populate history
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 12 }} />
            <YAxis domain={[50, 100]} stroke="#6b7280" tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }}
              labelStyle={{ color: '#f9fafb' }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
