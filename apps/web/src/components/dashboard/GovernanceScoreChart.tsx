'use client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';

type TrendPoint = { date: string; score: number };

type Props = {
  trend: TrendPoint[];
  isLoading: boolean;
  days?: number;
};

const periodLabel: Record<number, string> = {
  7:  '7-day trend',
  30: '30-day trend',
  90: '90-day trend',
};

export default function GovernanceScoreChart({ trend, isLoading, days = 7 }: Props) {
  const subtitle = periodLabel[days] ?? `${days}-day trend`;
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,.06)]">
      <div style={{ marginBottom: 14 }}>
        <div className="text-[13.5px] font-bold text-[#111827]">AI Decision Volume</div>
        <div className="text-[11.5px] text-[#9CA3AF]">Governance score — {subtitle}</div>
      </div>
      {isLoading ? (
        <LoadingSkeleton className="h-[180px] mt-3" />
      ) : trend.length === 0 ? (
        <div className="flex h-[180px] items-center justify-center text-sm text-[#6B7280]">
          No trend data yet — run <code className="mx-1 text-[#374151]">make seed</code> to populate history
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 11, fill: '#6B7280' }} />
            <YAxis domain={[50, 100]} stroke="#9CA3AF" tick={{ fontSize: 11, fill: '#6B7280' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12 }}
              labelStyle={{ color: '#111827', fontWeight: 600 }}
            />
            <Line type="monotone" dataKey="score" name="Governance Score" stroke="#2563EB" strokeWidth={2} dot={{ fill: '#2563EB', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
