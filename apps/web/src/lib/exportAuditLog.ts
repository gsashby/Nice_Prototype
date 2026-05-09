import { apiGet } from '@/lib/api-client';
import type { AuditEvent, AuditLogFilters } from '@/types/audit';

type AuditLogResponse = { events: AuditEvent[]; total: number };

const CSV_HEADERS = [
  'Event ID', 'Timestamp', 'Event Type', 'Model', 'Agent ID',
  'Session ID', 'Action', 'Outcome', 'Confidence (%)', 'Policy Violations',
];

function escapeCSV(value: unknown): string {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function eventToRow(e: AuditEvent): string {
  return [
    e.id,
    e.event_time,
    e.event_type,
    e.model_name ?? '',
    e.agent_id ?? '',
    e.session_id ?? '',
    e.action ?? '',
    e.outcome,
    (e.confidence_score * 100).toFixed(2),
    (e.policy_violations ?? []).join('; '),
  ].map(escapeCSV).join(',');
}

async function fetchAll(filters: AuditLogFilters): Promise<AuditEvent[]> {
  const params = new URLSearchParams({
    page: '1',
    page_size: '5000',
    ...(filters.startDate  && { start_date: filters.startDate }),
    ...(filters.endDate    && { end_date: filters.endDate }),
    ...(filters.eventType  && { event_type: filters.eventType }),
    ...(filters.outcome    && { outcome: filters.outcome }),
    ...(filters.search     && { search: filters.search }),
  });
  const res = await apiGet<AuditLogResponse>(`/api/v1/audit-log?${params}`);
  return res.events ?? [];
}

function triggerDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function timestamp() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
}

export async function exportCSV(filters: AuditLogFilters) {
  const events = await fetchAll(filters);
  const rows = [CSV_HEADERS.join(','), ...events.map(eventToRow)];
  triggerDownload(rows.join('\n'), `audit-log-${timestamp()}.csv`, 'text/csv');
  return events.length;
}

export async function exportJSON(filters: AuditLogFilters) {
  const events = await fetchAll(filters);
  const payload = {
    exported_at: new Date().toISOString(),
    total: events.length,
    filters: {
      outcome: filters.outcome,
      event_type: filters.eventType,
      search: filters.search,
      start_date: filters.startDate,
      end_date: filters.endDate,
    },
    events,
  };
  triggerDownload(JSON.stringify(payload, null, 2), `audit-log-${timestamp()}.json`, 'application/json');
  return events.length;
}

export function exportSingleEventCSV(event: AuditEvent) {
  const rows = [CSV_HEADERS.join(','), eventToRow(event)];
  triggerDownload(rows.join('\n'), `audit-event-${event.id}-${timestamp()}.csv`, 'text/csv');
}

export function buildSiemPayload(events: AuditEvent[]): string {
  return events.slice(0, 5).map((e) =>
    `CEF:0|NICE CXone|AI Trust Center|1.0|${e.outcome.toUpperCase()}|${e.event_type}|${e.outcome === 'blocked' ? '8' : e.outcome === 'flagged' ? '5' : '2'}|` +
    `rt=${new Date(e.event_time).getTime()} ` +
    `suser=${e.agent_id ?? 'unknown'} ` +
    `dvc=${e.model_name ?? 'unknown'} ` +
    `cs1=${e.session_id ?? ''} cs1Label=sessionId ` +
    `cs2=${(e.confidence_score * 100).toFixed(1)}% cs2Label=confidence ` +
    `cs3=${(e.policy_violations ?? []).join(';')} cs3Label=policyViolations`
  ).join('\n');
}
