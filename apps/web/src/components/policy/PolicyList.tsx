'use client';
import { useState } from 'react';
import { usePolicies, useTogglePolicy, useDeletePolicy } from '@/hooks/usePolicies';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import SortTh from '@/components/shared/SortTh';
import { useSortable } from '@/lib/useSortable';

// ── Styles ────────────────────────────────────────────────────────────────────

const severityStyles: Record<string, string> = {
  critical: 'bg-[#FEE2E2] text-[#DC2626]',
  high:     'bg-[#FFEDD5] text-[#C2410C]',
  medium:   'bg-[#FEF3C7] text-[#92400E]',
  low:      'bg-[#DBEAFE] text-[#1D4ED8]',
};

const actionStyles: Record<string, string> = {
  block:  'bg-[#FEE2E2] text-[#DC2626]',
  flag:   'bg-[#FEF3C7] text-[#92400E]',
  allow:  'bg-[#DCFCE7] text-[#15803D]',
};

// ── Rule condition display helpers ────────────────────────────────────────────

const OPERATOR_SYMBOL: Record<string, string> = {
  below:     '<',
  above:     '>',
  equals:    '=',
  not_equals:'≠',
  contains:  'contains',
};

const FIELD_LABEL: Record<string, string> = {
  confidence_score: 'conf. score',
  event_type:       'event type',
  outcome:          'outcome',
  model_name:       'model',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RuleSummary({ ruleConfig }: { ruleConfig?: Record<string, any> }) {
  const condition = ruleConfig?.condition;
  const action = ruleConfig?.action;
  if (!condition || !action) return null;

  const field    = FIELD_LABEL[condition.field]  ?? condition.field;
  const operator = OPERATOR_SYMBOL[condition.operator] ?? condition.operator;
  const value    = String(condition.value ?? '');

  return (
    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
      <code className="rounded-[3px] bg-[#F3F4F6] px-1.5 py-0.5 font-mono text-[10px] text-[#374151]">
        {field} {operator} {value}
      </code>
      <span className={`rounded-full px-1.5 py-0.5 text-[9.5px] font-bold ${actionStyles[action] ?? 'bg-[#F3F4F6] text-[#4B5563]'}`}>
        → {action}
      </span>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Policy = {
  id: string;
  name: string;
  description: string;
  severity: string;
  enabled: boolean;
  violationCount: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rule_config?: Record<string, any>;
};

type Props = {
  onEdit?: (policy: Policy) => void;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function PolicyList({ onEdit }: Props) {
  const { data, isLoading, isError } = usePolicies();
  const { mutate: toggle,        isPending: isToggling } = useTogglePolicy();
  const { mutate: deletePolicy,  isPending: isDeleting  } = useDeletePolicy();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const policies: Policy[] = data ?? [];
  const { sorted, sort, toggle: sortToggle } = useSortable<Policy>(policies);

  if (isError) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-600">
        Failed to load policies — is the API running?
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
      <div style={{ padding: '16px 16px 14px' }}>
        <div className="text-[13.5px] font-bold text-[#111827]">Active Policies</div>
        <div className="text-[11.5px] text-[#9CA3AF]">Rules governing AI behaviour across all modules</div>
      </div>

      {isLoading ? (
        <div className="space-y-px p-4">
          {Array.from({ length: 5 }).map((_, i) => <LoadingSkeleton key={i} className="h-10" />)}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-[#E5E7EB] bg-[#F9FAFB] text-left">
                <SortTh label="Policy Name"     colKey="name"           sort={sort} onToggle={sortToggle} className="pl-4 pr-3.5" />
                <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[.05em] text-[#6B7280] whitespace-nowrap">Description &amp; Rule</th>
                <SortTh label="Severity"        colKey="severity"       sort={sort} onToggle={sortToggle} className="px-3.5" />
                <SortTh label="Status"          colKey="enabled"        sort={sort} onToggle={sortToggle} className="px-3.5" />
                <SortTh label="Violations (7d)" colKey="violationCount" sort={sort} onToggle={sortToggle} className="px-3.5" />
                <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[.05em] text-[#6B7280] whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((policy) => (
                <tr key={policy.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors">
                  <td className="pl-4 pr-3.5 py-2.5 text-[12.5px] font-semibold text-[#111827]">
                    {policy.name}
                  </td>
                  <td className="px-3.5 py-2.5">
                    <div className="text-[12px] text-[#6B7280]">{policy.description}</div>
                    <RuleSummary ruleConfig={policy.rule_config} />
                  </td>
                  <td className="px-3.5 py-2.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${severityStyles[policy.severity] ?? 'bg-[#F3F4F6] text-[#4B5563]'}`}>
                      {policy.severity}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <button
                      onClick={() => toggle({ id: policy.id, enabled: !policy.enabled })}
                      disabled={isToggling}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors disabled:opacity-60 ${policy.enabled ? 'bg-[#DCFCE7] text-[#15803D] hover:bg-[#BBF7D0]' : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${policy.enabled ? 'bg-[#16A34A]' : 'bg-[#9CA3AF]'}`} />
                      {policy.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </td>
                  <td className="px-3.5 py-2.5 text-[12.5px] text-[#374151]">
                    {policy.violationCount}
                  </td>
                  <td className="px-3.5 py-2.5">
                    {confirmDelete === policy.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-[#374151] font-medium">Delete?</span>
                        <button
                          onClick={() => deletePolicy(policy.id, { onSuccess: () => setConfirmDelete(null) })}
                          disabled={isDeleting}
                          className="inline-flex items-center rounded-[4px] bg-[#DC2626] font-semibold text-white hover:bg-[#B91C1C] transition-all disabled:opacity-60"
                          style={{ padding: '2px 8px', fontSize: 11 }}
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-[11px] text-[#6B7280] hover:text-[#374151] transition-colors font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onEdit?.(policy)}
                          title="Edit policy"
                          className="rounded-[4px] p-1 text-[#6B7280] hover:bg-[#EFF6FF] hover:text-[#2563EB] transition-colors"
                        >
                          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => setConfirmDelete(policy.id)}
                          title="Delete policy"
                          className="rounded-[4px] p-1 text-[#6B7280] hover:bg-[#FEF2F2] hover:text-[#DC2626] transition-colors"
                        >
                          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
