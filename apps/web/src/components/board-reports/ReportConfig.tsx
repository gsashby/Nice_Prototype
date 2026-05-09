'use client';
import { useState } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export type ReportPeriod = '7d' | '30d' | '90d' | 'custom';

export type ReportConfig = {
  title: string;
  preparedBy: string;
  period: ReportPeriod;
  startDate: string;
  endDate: string;
  regulations: string[];
};

type Props = {
  onGenerate: (config: ReportConfig) => void;
  isGenerating: boolean;
};

const REGULATIONS = ['EU AI Act', 'GDPR', 'TCPA', 'CCPA'];

const PERIODS: { label: string; value: ReportPeriod; days?: number }[] = [
  { label: 'Last 7 Days',  value: '7d',     days: 7  },
  { label: 'Last 30 Days', value: '30d',    days: 30 },
  { label: 'Last 90 Days', value: '90d',    days: 90 },
  { label: 'Custom Range', value: 'custom'           },
];

function isoDay(d: Date) {
  return format(d, "yyyy-MM-dd'T'HH:mm:ss'Z'");
}

export default function ReportConfig({ onGenerate, isGenerating }: Props) {
  const [title, setTitle]         = useState('AI Governance Compliance Report');
  const [preparedBy, setPreparedBy] = useState('Gerald Ashby');
  const [period, setPeriod]       = useState<ReportPeriod>('30d');
  const [customStart, setCustomStart] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd]     = useState(format(new Date(), 'yyyy-MM-dd'));
  const [regulations, setRegulations] = useState<string[]>(['EU AI Act', 'GDPR']);

  function toggleRegulation(r: string) {
    setRegulations((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    let startDate: string;
    let endDate: string;

    if (period === 'custom') {
      startDate = isoDay(startOfDay(new Date(customStart)));
      endDate   = isoDay(endOfDay(new Date(customEnd)));
    } else {
      const days = PERIODS.find((p) => p.value === period)!.days!;
      startDate = isoDay(startOfDay(subDays(new Date(), days)));
      endDate   = isoDay(endOfDay(new Date()));
    }

    onGenerate({ title, preparedBy, period, startDate, endDate, regulations });
  }

  const inputCls = 'w-full rounded-[5px] border border-[#D1D5DB] bg-white px-3 py-2 text-[12.5px] text-[#1F2937] placeholder-[#9CA3AF] focus:border-[#2563EB] focus:outline-none';
  const labelCls = 'block text-[11px] font-semibold uppercase tracking-[.05em] text-[#6B7280] mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl">
      <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
          <div className="text-[13.5px] font-bold text-[#111827]">Report Configuration</div>
          <div className="text-[11.5px] text-[#9CA3AF]">Define the scope and parameters for your compliance report</div>
        </div>

        <div className="space-y-5" style={{ padding: '20px' }}>
          {/* Title */}
          <div>
            <label className={labelCls}>Report Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className={inputCls}
            />
          </div>

          {/* Prepared by */}
          <div>
            <label className={labelCls}>Prepared By</label>
            <input
              value={preparedBy}
              onChange={(e) => setPreparedBy(e.target.value)}
              required
              className={inputCls}
            />
          </div>

          {/* Period */}
          <div>
            <label className={labelCls}>Reporting Period</label>
            <div className="flex gap-2 flex-wrap">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPeriod(p.value)}
                  className={`rounded-[5px] border px-3 py-1.5 text-[12px] font-semibold transition-all ${
                    period === p.value
                      ? 'border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8]'
                      : 'border-[#D1D5DB] bg-white text-[#374151] hover:bg-[#F9FAFB]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {period === 'custom' && (
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1">
                  <label className={labelCls}>Start Date</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className={inputCls}
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className={labelCls}>End Date</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className={inputCls}
                    required
                  />
                </div>
              </div>
            )}
          </div>

          {/* Regulations */}
          <div>
            <label className={labelCls}>Applicable Regulations</label>
            <div className="flex flex-wrap gap-2">
              {REGULATIONS.map((r) => {
                const checked = regulations.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRegulation(r)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold transition-all ${
                      checked
                        ? 'border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8]'
                        : 'border-[#D1D5DB] bg-white text-[#6B7280] hover:border-[#9CA3AF]'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${checked ? 'bg-[#2563EB]' : 'bg-[#D1D5DB]'}`} />
                    {r}
                  </button>
                );
              })}
            </div>
            {regulations.length === 0 && (
              <p className="mt-1.5 text-[11.5px] text-[#F59E0B]">Select at least one regulation to include in the report</p>
            )}
          </div>
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid #E5E7EB', background: '#F9FAFB' }} className="flex items-center justify-between">
          <div className="text-[11.5px] text-[#9CA3AF]">
            Report will include live data from all connected AI modules
          </div>
          <button
            type="submit"
            disabled={isGenerating || regulations.length === 0}
            className="inline-flex items-center gap-2 rounded-[5px] bg-[#2563EB] font-semibold text-white hover:bg-[#1D4ED8] transition-all disabled:opacity-60"
            style={{ padding: '6px 16px', fontSize: 12 }}
          >
            {isGenerating ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Generating…
              </>
            ) : (
              <>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                Generate Report
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
