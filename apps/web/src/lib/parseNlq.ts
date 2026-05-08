import type { AuditLogFilters } from '@/types/audit';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

export type NlqResult = {
  filters: AuditLogFilters;
  tags: string[];
};

export function parseNlq(query: string): NlqResult {
  const q = query.toLowerCase().trim();
  const filters: AuditLogFilters = { page: 1, pageSize: 25 };
  const tags: string[] = [];

  // Outcome
  if (/\bblock(ed)?\b/.test(q)) {
    filters.outcome = 'blocked';
    tags.push('outcome: blocked');
  } else if (/\bflag(ged)?\b|\bviolat(ion|ions|ed)?\b|\bpolicy\b/.test(q)) {
    filters.outcome = 'flagged';
    tags.push('outcome: flagged');
  } else if (/\ballow(ed)?\b|\bapprove(d)?\b/.test(q)) {
    filters.outcome = 'allowed';
    tags.push('outcome: allowed');
  }

  // Event type
  if (/\binference\b/.test(q)) {
    filters.eventType = 'inference';
    tags.push('type: inference');
  } else if (/\bpolicy.?check\b/.test(q)) {
    filters.eventType = 'policy_check';
    tags.push('type: policy_check');
  } else if (/\bbias\b/.test(q)) {
    filters.eventType = 'bias_scan';
    tags.push('type: bias_scan');
  } else if (/\bsession\b/.test(q)) {
    filters.eventType = 'session_start';
    tags.push('type: session_start');
  } else if (/\bmodel.?load\b/.test(q)) {
    filters.eventType = 'model_load';
    tags.push('type: model_load');
  }

  // Time window
  const today = new Date();
  if (/\btoday\b|\blast 24 hours?\b/.test(q)) {
    filters.startDate = format(startOfDay(today), "yyyy-MM-dd'T'HH:mm:ss'Z'");
    filters.endDate = format(endOfDay(today), "yyyy-MM-dd'T'HH:mm:ss'Z'");
    tags.push('period: today');
  } else if (/\blast 7 days?\b|\bthis week\b|\bweek\b/.test(q)) {
    filters.startDate = format(startOfDay(subDays(today, 7)), "yyyy-MM-dd'T'HH:mm:ss'Z'");
    tags.push('period: last 7 days');
  } else if (/\blast 30 days?\b|\bthis month\b|\bmonth\b/.test(q)) {
    filters.startDate = format(startOfDay(subDays(today, 30)), "yyyy-MM-dd'T'HH:mm:ss'Z'");
    tags.push('period: last 30 days');
  }

  // Free-text search fallback — use whatever didn't match as a search term
  if (tags.length === 0) {
    filters.search = query.trim();
    tags.push(`search: "${query.trim()}"`);
  }

  return { filters, tags };
}
