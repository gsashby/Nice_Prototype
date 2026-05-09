'use client';
import { useState } from 'react';
import PageHeader from '@/components/shared/PageHeader';
import AuditLogFilters from '@/components/audit-log/AuditLogFilters';
import AuditLogTable from '@/components/audit-log/AuditLogTable';
import SiemModal from '@/components/audit-log/SiemModal';
import { exportCSV, exportJSON, buildSiemPayload } from '@/lib/exportAuditLog';
import { apiGet } from '@/lib/api-client';
import type { AuditLogFilters as Filters, AuditEvent } from '@/types/audit';

export default function AuditLogPage() {
  const [filters, setFilters] = useState<Filters>({ page: 1, pageSize: 50 });
  const [total, setTotal] = useState<number | undefined>();

  const [csvLoading, setCsvLoading]   = useState(false);
  const [jsonLoading, setJsonLoading] = useState(false);
  const [siemOpen, setSiemOpen]       = useState(false);
  const [siemPayload, setSiemPayload] = useState('');
  const [siemCount, setSiemCount]     = useState(0);
  const [siemLoading, setSiemLoading] = useState(false);

  function handleFilterChange(partial: Partial<Filters>) {
    setFilters((prev) => ({ ...prev, ...partial, page: 1 }));
  }

  async function handleExportCSV() {
    setCsvLoading(true);
    try { await exportCSV(filters); } finally { setCsvLoading(false); }
  }

  async function handleExportJSON() {
    setJsonLoading(true);
    try { await exportJSON(filters); } finally { setJsonLoading(false); }
  }

  async function handleSiemPush() {
    setSiemLoading(true);
    try {
      const params = new URLSearchParams({
        page: '1', page_size: '5000',
        ...(filters.startDate && { start_date: filters.startDate }),
        ...(filters.endDate   && { end_date: filters.endDate }),
        ...(filters.eventType && { event_type: filters.eventType }),
        ...(filters.outcome   && { outcome: filters.outcome }),
        ...(filters.search    && { search: filters.search }),
      });
      const res = await apiGet<{ events: AuditEvent[]; total: number }>(`/api/v1/audit-log?${params}`);
      setSiemCount(res.total);
      setSiemPayload(buildSiemPayload(res.events));
      setSiemOpen(true);
    } finally {
      setSiemLoading(false);
    }
  }

  return (
    <div className="space-y-5" style={{ paddingLeft: 24 }}>
      <PageHeader
        title="Audit Log Explorer"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={csvLoading}
              className="inline-flex items-center gap-[6px] rounded-[5px] border border-[#D1D5DB] bg-white font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-all whitespace-nowrap disabled:opacity-60"
              style={{ padding: '4px 10px', fontSize: 12 }}
            >
              {csvLoading ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#D1D5DB] border-t-[#374151]" />
              ) : (
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              )}
              Export CSV
            </button>

            <button
              onClick={handleExportJSON}
              disabled={jsonLoading}
              className="inline-flex items-center gap-[6px] rounded-[5px] border border-[#D1D5DB] bg-white font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-all whitespace-nowrap disabled:opacity-60"
              style={{ padding: '4px 10px', fontSize: 12 }}
            >
              {jsonLoading ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#D1D5DB] border-t-[#374151]" />
              ) : (
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              )}
              Export JSON
            </button>

            <button
              onClick={handleSiemPush}
              disabled={siemLoading}
              className="inline-flex items-center gap-[6px] rounded-[5px] bg-[#2563EB] font-semibold text-white hover:bg-[#1D4ED8] transition-all whitespace-nowrap disabled:opacity-60"
              style={{ padding: '4px 10px', fontSize: 12 }}
            >
              {siemLoading ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
              )}
              SIEM Push
            </button>
          </div>
        }
      />

      <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
        <AuditLogFilters filters={filters} onChange={handleFilterChange} totalCount={total} />
        <AuditLogTable
          filters={filters}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
          onTotalChange={setTotal}
        />
      </div>

      <SiemModal
        open={siemOpen}
        onClose={() => setSiemOpen(false)}
        payload={siemPayload}
        eventCount={siemCount}
      />
    </div>
  );
}
