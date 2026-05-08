'use client';
import { useCallback } from 'react';
import type { AuditLogFilters } from '@/types/audit';

type Props = {
  filters: AuditLogFilters;
  onChange: (partial: Partial<AuditLogFilters>) => void;
  totalCount?: number;
};

const selectStyle = "h-[30px] rounded-[5px] border border-[#D1D5DB] bg-white px-2 pr-7 text-[12.5px] text-[#1F2937] focus:border-[#2563EB] focus:outline-none appearance-none";
const selectBg = { backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: 'right 6px center', backgroundRepeat: 'no-repeat', backgroundSize: '14px' };

export default function AuditLogFilters({ filters, onChange, totalCount }: Props) {
  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onChange({ search: e.target.value }),
    [onChange],
  );

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[#E5E7EB] bg-[#F9FAFB] px-3.5 py-2.5">
      {/* Search */}
      <div className="relative">
        <svg className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          placeholder="Search session, agent, model..."
          value={filters.search ?? ''}
          onChange={handleSearch}
          className="h-[30px] w-[260px] rounded-[5px] border border-[#D1D5DB] bg-white pl-8 pr-3 text-[12.5px] text-[#1F2937] placeholder-[#9CA3AF] focus:border-[#2563EB] focus:outline-none"
        />
      </div>

      <select value={filters.outcome ?? ''} onChange={(e) => onChange({ outcome: e.target.value || undefined })} className={selectStyle} style={{ width: 130, ...selectBg }}>
        <option value="">All Modules</option>
        <option value="allowed">Autopilot</option>
        <option value="flagged">Copilot</option>
        <option value="blocked">Mpower Agent</option>
      </select>

      <select value={filters.eventType ?? ''} onChange={(e) => onChange({ eventType: e.target.value || undefined })} className={selectStyle} style={{ width: 140, ...selectBg }}>
        <option value="">All Actions</option>
        <option value="accepted">accepted</option>
        <option value="rejected">rejected</option>
        <option value="modified">modified</option>
        <option value="auto-applied">auto-applied</option>
        <option value="blocked">blocked</option>
      </select>

      <select className={selectStyle} style={{ width: 150, ...selectBg }}>
        <option value="">All Regulations</option>
        <option>EU AI Act</option>
        <option>GDPR</option>
        <option>TCPA</option>
        <option>CCPA</option>
      </select>

      {(filters.search || filters.outcome || filters.eventType) && (
        <button
          onClick={() => onChange({ search: undefined, outcome: undefined, eventType: undefined, startDate: undefined, endDate: undefined })}
          className="h-[30px] rounded-[5px] border border-[#D1D5DB] bg-white px-3 text-[12px] text-[#6B7280] hover:border-[#9CA3AF] hover:text-[#374151] transition-colors"
        >
          Clear
        </button>
      )}

      <div className="ml-auto text-[12px] text-[#6B7280]">
        {totalCount != null ? `Showing ${Math.min(filters.pageSize, totalCount)} of ${totalCount.toLocaleString()} events` : ''}
      </div>
    </div>
  );
}
