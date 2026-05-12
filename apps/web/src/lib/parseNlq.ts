import type { AuditLogFilters } from '@/types/audit';
import { subDays, subHours, startOfDay, endOfDay, format } from 'date-fns';

export type NlqKind = 'filter' | 'question';

export type NlqResult = {
  filters: AuditLogFilters;
  tags: string[];
  source: 'regex' | 'ai';
  kind: NlqKind;
  context?: string;  // AI explanation for data questions shown alongside the table
  answer?: string;   // AI text answer for governance knowledge questions (no table)
};

// Conversational or analytical queries route to the LLM for rich answers.
function detectKind(q: string): NlqKind {
  const questionStart = /^(how many|how much|how often|how frequently|why (are|is|were|was|do|does)|explain|compare|summarize|analyse|analyze|give me a (summary|breakdown|analysis|overview)|which (model|agent|policy) (has|have|shows?|produces?)|what (caused?|is the reason|is the trend|are the top|are the most|is the difference|does)|are there (any trends?|patterns?|anomalies?))/i;
  const analyticalWords = /\b(trend|breakdown|analysis|summary|insight|anomaly|anomalies|most common|top \d+ (model|agent|event|violation)|worst performing|best performing|highest rate|lowest rate|root cause|why|how many|how often|explain|compare|versus|vs\.?)\b/i;
  return questionStart.test(q.trim()) || analyticalWords.test(q) ? 'question' : 'filter';
}

export function parseNlq(query: string): NlqResult {
  const q = query.toLowerCase().trim();
  const filters: AuditLogFilters = { page: 1, pageSize: 25 };
  const tags: string[] = [];
  const kind = detectKind(query);

  // ── Outcome ────────────────────────────────────────────────────────────────
  if (/\bblock(ed)?\b/.test(q)) {
    filters.outcome = 'blocked';
    tags.push('outcome: blocked');
  } else if (/\b(non.?compliant|noncompliant)\b/.test(q)) {
    filters.outcome = 'flagged';
    tags.push('outcome: flagged');
  } else if (/\b(flag(ged)?|violat(ion|ions|ed)?|policy(?! check))\b/.test(q)) {
    filters.outcome = 'flagged';
    tags.push('outcome: flagged');
  } else if (/\b(auto.?applied|auto.?approv|automatically applied)\b/.test(q)) {
    filters.outcome = 'auto-applied';
    tags.push('outcome: auto-applied');
  } else if (/\b(allow(ed)?|approv(e|ed)?)\b/.test(q)) {
    filters.outcome = 'allowed';
    tags.push('outcome: allowed');
  }

  // ── Event type ─────────────────────────────────────────────────────────────
  if (/\binference\b/.test(q)) {
    filters.eventType = 'inference';
    tags.push('type: inference');
  } else if (/\bpolicy.?check\b/.test(q)) {
    filters.eventType = 'policy_check';
    tags.push('type: policy_check');
  } else if (/\b(bias.?scan|bias|fairness.?(check|scan|violation)?)\b/.test(q)) {
    filters.eventType = 'bias_scan';
    tags.push('type: bias_scan');
  } else if (/\bsession.?end\b/.test(q)) {
    filters.eventType = 'session_end';
    tags.push('type: session_end');
  } else if (/\b(session.?start|session)\b/.test(q)) {
    filters.eventType = 'session_start';
    tags.push('type: session_start');
  } else if (/\bmodel.?load\b/.test(q)) {
    filters.eventType = 'model_load';
    tags.push('type: model_load');
  }

  // ── Time window ────────────────────────────────────────────────────────────
  const today = new Date();

  if (/\b(today|last 24 hours?|past 24 hours?)\b/.test(q)) {
    filters.startDate = format(startOfDay(today), "yyyy-MM-dd'T'HH:mm:ss'Z'");
    filters.endDate = format(endOfDay(today), "yyyy-MM-dd'T'HH:mm:ss'Z'");
    tags.push('period: today');
  } else if (/\byesterday\b/.test(q)) {
    const yesterday = subDays(today, 1);
    filters.startDate = format(startOfDay(yesterday), "yyyy-MM-dd'T'HH:mm:ss'Z'");
    filters.endDate = format(endOfDay(yesterday), "yyyy-MM-dd'T'HH:mm:ss'Z'");
    tags.push('period: yesterday');
  } else if (/\b(last 7 days?|last week|this week|past week)\b/.test(q)) {
    filters.startDate = format(startOfDay(subDays(today, 7)), "yyyy-MM-dd'T'HH:mm:ss'Z'");
    tags.push('period: last 7 days');
  } else if (/\b(last 30 days?|last month|this month|past month)\b/.test(q)) {
    filters.startDate = format(startOfDay(subDays(today, 30)), "yyyy-MM-dd'T'HH:mm:ss'Z'");
    tags.push('period: last 30 days');
  } else if (/\b(last 90 days?|last quarter|this quarter|past quarter)\b/.test(q)) {
    filters.startDate = format(startOfDay(subDays(today, 90)), "yyyy-MM-dd'T'HH:mm:ss'Z'");
    tags.push('period: last 90 days');
  } else if (/\b(last hour|past hour|last 60 min(utes?)?)\b/.test(q)) {
    filters.startDate = format(subHours(today, 1), "yyyy-MM-dd'T'HH:mm:ss'Z'");
    tags.push('period: last hour');
  } else {
    // Dynamic "last N days" or "last N hours"
    const daysMatch = q.match(/\blast\s+(\d+)\s+days?\b/);
    const hoursMatch = q.match(/\blast\s+(\d+)\s+hours?\b/);
    if (daysMatch) {
      const n = parseInt(daysMatch[1], 10);
      filters.startDate = format(startOfDay(subDays(today, n)), "yyyy-MM-dd'T'HH:mm:ss'Z'");
      tags.push(`period: last ${n} days`);
    } else if (hoursMatch) {
      const n = parseInt(hoursMatch[1], 10);
      filters.startDate = format(subHours(today, n), "yyyy-MM-dd'T'HH:mm:ss'Z'");
      tags.push(`period: last ${n} hours`);
    }
  }

  // ── Model name ─────────────────────────────────────────────────────────────
  const modelPatterns: [RegExp, string][] = [
    [/\bautopilot\b/, 'Autopilot'],
    [/\bcopilot\b/, 'Copilot'],
    [/\bmpower\b/, 'Mpower'],
    [/\bgpt.?4\b/, 'GPT-4'],
    [/\bgpt.?3\.?5\b/, 'GPT-3.5'],
    [/\bclaude\b/, 'Claude'],
    [/\bllama\b/, 'Llama'],
    [/\bgemini\b/, 'Gemini'],
    [/\bmistral\b/, 'Mistral'],
  ];
  for (const [pattern, name] of modelPatterns) {
    if (pattern.test(q)) {
      filters.modelName = name;
      tags.push(`model: ${name}`);
      break;
    }
  }

  // ── Result limit from "top N" / "first N" / "show N" ──────────────────────
  const limitMatch = q.match(/\b(top|first|show)\s+(\d+)\b/);
  if (limitMatch) {
    const n = Math.min(parseInt(limitMatch[2], 10), 200);
    filters.pageSize = n;
    tags.push(`limit: ${n}`);
  }

  // ── Free-text search fallback ──────────────────────────────────────────────
  if (tags.length === 0) {
    filters.search = query.trim();
    tags.push(`search: "${query.trim()}"`);
  }

  return { filters, tags, source: 'regex' as const, kind };
}
