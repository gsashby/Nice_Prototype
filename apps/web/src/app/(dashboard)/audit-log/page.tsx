'use client';
import { useState } from 'react';
import PageHeader from '@/components/shared/PageHeader';
import AuditLogFilters from '@/components/audit-log/AuditLogFilters';
import AuditLogTable from '@/components/audit-log/AuditLogTable';
import type { AuditLogFilters as Filters } from '@/types/audit';

export default function AuditLogPage() {
  const [filters, setFilters] = useState<Filters>({
    page: 1,
    pageSize: 50,
  });

  function handleFilterChange(partial: Partial<Filters>) {
    setFilters((prev) => ({ ...prev, ...partial, page: 1 }));
  }

  function handlePageChange(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log Explorer"
        description="Filterable, searchable event log for all AI decisions"
      />
      <AuditLogFilters filters={filters} onChange={handleFilterChange} />
      <AuditLogTable filters={filters} onPageChange={handlePageChange} />
    </div>
  );
}
