'use client';
import { useCallback } from 'react';
import type { AuditLogFilters } from '@/types/audit';

type Props = {
  filters: AuditLogFilters;
  onChange: (partial: Partial<AuditLogFilters>) => void;
};

export default function AuditLogFilters({ filters, onChange }: Props) {
  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onChange({ search: e.target.value }),
    [onChange],
  );

  return (
    <div className="flex flex-wrap gap-3 rounded-lg border border-gray-800 bg-gray-900 p-4">
      <input
        type="text"
        placeholder="Search agent, session..."
        value={filters.search ?? ''}
        onChange={handleSearch}
        className="h-9 rounded-md border border-gray-700 bg-gray-800 px-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
      />

      <select
        value={filters.outcome ?? ''}
        onChange={(e) => onChange({ outcome: e.target.value || undefined })}
        className="h-9 rounded-md border border-gray-700 bg-gray-800 px-3 text-sm text-white focus:border-blue-500 focus:outline-none"
      >
        <option value="">All Outcomes</option>
        <option value="allowed">Allowed</option>
        <option value="flagged">Flagged</option>
        <option value="blocked">Blocked</option>
      </select>

      <select
        value={filters.eventType ?? ''}
        onChange={(e) => onChange({ eventType: e.target.value || undefined })}
        className="h-9 rounded-md border border-gray-700 bg-gray-800 px-3 text-sm text-white focus:border-blue-500 focus:outline-none"
      >
        <option value="">All Event Types</option>
        <option value="inference">Inference</option>
        <option value="policy_check">Policy Check</option>
        <option value="model_load">Model Load</option>
        <option value="session_start">Session Start</option>
        <option value="bias_scan">Bias Scan</option>
      </select>

      <input
        type="date"
        value={filters.startDate ?? ''}
        onChange={(e) => onChange({ startDate: e.target.value || undefined })}
        className="h-9 rounded-md border border-gray-700 bg-gray-800 px-3 text-sm text-white focus:border-blue-500 focus:outline-none"
      />
      <input
        type="date"
        value={filters.endDate ?? ''}
        onChange={(e) => onChange({ endDate: e.target.value || undefined })}
        className="h-9 rounded-md border border-gray-700 bg-gray-800 px-3 text-sm text-white focus:border-blue-500 focus:outline-none"
      />

      {(filters.search || filters.outcome || filters.eventType || filters.startDate || filters.endDate) && (
        <button
          onClick={() => onChange({ search: undefined, outcome: undefined, eventType: undefined, startDate: undefined, endDate: undefined })}
          className="h-9 rounded-md border border-gray-700 px-3 text-sm text-gray-400 hover:border-gray-500 hover:text-white transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}
