'use client';
import { useState } from 'react';
import PageHeader from '@/components/shared/PageHeader';
import AuditLogFilters from '@/components/audit-log/AuditLogFilters';
import AuditLogTable from '@/components/audit-log/AuditLogTable';
import type { AuditLogFilters as Filters } from '@/types/audit';

export default function AuditLogPage() {
  const [filters, setFilters] = useState<Filters>({ page: 1, pageSize: 50 });
  const [total, setTotal] = useState<number | undefined>();

  function handleFilterChange(partial: Partial<Filters>) {
    setFilters((prev) => ({ ...prev, ...partial, page: 1 }));
  }

  return (
    <div className="space-y-5" style={{ paddingLeft: 24 }}>
      <PageHeader
        title="Audit Log Explorer"
        actions={
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-[6px] rounded-[5px] border border-[#D1D5DB] bg-white font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-all whitespace-nowrap" style={{ padding: '4px 10px', fontSize: 12 }}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Export CSV
            </button>
            <button className="inline-flex items-center gap-[6px] rounded-[5px] border border-[#D1D5DB] bg-white font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-all whitespace-nowrap" style={{ padding: '4px 10px', fontSize: 12 }}>
              Export JSON
            </button>
            <button className="inline-flex items-center gap-[6px] rounded-[5px] bg-[#2563EB] font-semibold text-white hover:bg-[#1D4ED8] transition-all whitespace-nowrap" style={{ padding: '4px 10px', fontSize: 12 }}>
              SIEM Push
            </button>
          </div>
        }
      />

      <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
        <AuditLogFilters
          filters={filters}
          onChange={handleFilterChange}
          totalCount={total}
        />
        <AuditLogTable
          filters={filters}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
          onTotalChange={setTotal}
        />
      </div>
    </div>
  );
}
