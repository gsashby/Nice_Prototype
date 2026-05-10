'use client';
import { useState } from 'react';
import { useCreatePolicy, useUpdatePolicy } from '@/hooks/usePolicies';
import type { PolicySeverity } from '@/types/policy';

// ── Styles ────────────────────────────────────────────────────────────────────

const inputStyle =
  'w-full rounded-[5px] border border-[#D1D5DB] bg-white px-3 py-2 text-[12.5px] text-[#1F2937] placeholder-[#9CA3AF] focus:border-[#2563EB] focus:outline-none';
const selectStyle =
  'rounded-[5px] border border-[#D1D5DB] bg-white px-3 py-2 text-[12.5px] text-[#1F2937] focus:border-[#2563EB] focus:outline-none';
const labelStyle =
  'block text-[11px] font-semibold uppercase tracking-[.05em] text-[#6B7280] mb-1';

// ── Rule condition configuration ──────────────────────────────────────────────

type ConditionField = 'confidence_score' | 'event_type' | 'outcome' | 'model_name';
type RuleAction = 'block' | 'flag' | 'allow';

const FIELD_OPERATORS: Record<ConditionField, Array<{ value: string; label: string }>> = {
  confidence_score: [
    { value: 'below', label: 'falls below' },
    { value: 'above', label: 'rises above' },
  ],
  event_type: [
    { value: 'equals', label: 'is' },
    { value: 'not_equals', label: 'is not' },
  ],
  outcome: [
    { value: 'equals', label: 'is' },
    { value: 'not_equals', label: 'is not' },
  ],
  model_name: [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'is not' },
    { value: 'contains', label: 'contains' },
  ],
};

const FIELD_DEFAULTS: Record<ConditionField, string> = {
  confidence_score: '0.70',
  event_type: 'inference',
  outcome: 'blocked',
  model_name: '',
};

// ── Types ─────────────────────────────────────────────────────────────────────

type EditablePolicy = {
  id: string;
  name: string;
  description: string;
  severity: string;
  enabled: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rule_config?: Record<string, any>;
};

type Props = {
  onDone: () => void;
  policy?: EditablePolicy;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function PolicyBuilder({ onDone, policy }: Props) {
  const isEdit = !!policy;

  // Basic fields
  const [name, setName] = useState(policy?.name ?? '');
  const [description, setDescription] = useState(policy?.description ?? '');
  const [severity, setSeverity] = useState(policy?.severity ?? 'medium');

  // Rule condition — pre-fill from existing rule_config if editing
  const existingCondition = policy?.rule_config?.condition;
  const [conditionField, setConditionField] = useState<ConditionField>(
    (existingCondition?.field as ConditionField) ?? 'confidence_score',
  );
  const [conditionOperator, setConditionOperator] = useState(
    existingCondition?.operator ?? 'below',
  );
  const [conditionValue, setConditionValue] = useState(
    existingCondition?.value != null ? String(existingCondition.value) : '0.70',
  );
  const [ruleAction, setRuleAction] = useState<RuleAction>(
    (policy?.rule_config?.action as RuleAction) ?? 'flag',
  );

  // Mutations
  const create = useCreatePolicy();
  const update = useUpdatePolicy();
  const { isPending, isError, error } = isEdit ? update : create;

  // When the condition field changes, reset operator and value to sensible defaults
  function handleFieldChange(field: ConditionField) {
    setConditionField(field);
    setConditionOperator(FIELD_OPERATORS[field][0].value);
    setConditionValue(FIELD_DEFAULTS[field]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const ruleConfig = {
      condition: {
        field: conditionField,
        operator: conditionOperator,
        value:
          conditionField === 'confidence_score'
            ? parseFloat(conditionValue) || 0
            : conditionValue,
      },
      action: ruleAction,
    };

    const payload = {
      name,
      description,
      severity: severity as PolicySeverity,
      enabled: policy?.enabled ?? true,
      ruleConfig,
    };

    if (isEdit) {
      update.mutate({ id: policy!.id, ...payload }, { onSuccess: onDone });
    } else {
      create.mutate(payload, { onSuccess: onDone });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]"
    >
      {/* Header */}
      <div style={{ padding: '16px 16px 14px', borderBottom: '1px solid #E5E7EB' }}>
        <div className="text-[13.5px] font-bold text-[#111827]">
          {isEdit ? 'Edit Policy' : 'New Policy'}
        </div>
        <div className="text-[11.5px] text-[#9CA3AF]">
          {isEdit ? 'Update this governance rule' : 'Define a new governance rule'}
        </div>
      </div>

      <div className="space-y-4" style={{ padding: '16px' }}>
        {isError && (
          <p className="rounded-[5px] border border-red-300 bg-red-50 px-3 py-2 text-[12px] text-red-600">
            {(error as Error).message}
          </p>
        )}

        {/* Name */}
        <div>
          <label className={labelStyle}>Name *</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Block PII in responses"
            className={inputStyle}
          />
        </div>

        {/* Description */}
        <div>
          <label className={labelStyle}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Describe what this policy enforces…"
            className={inputStyle}
          />
        </div>

        {/* Severity */}
        <div>
          <label className={labelStyle}>Severity</label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className={selectStyle}
          >
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <p className="mt-1 text-[10.5px] text-[#9CA3AF]">
            Critical and High violations block the request. Medium and Low flag it for review.
          </p>
        </div>

        {/* ── Trigger condition ──────────────────────────────────────────── */}
        <div
          className="rounded-[6px] border border-[#E5E7EB] bg-[#F9FAFB]"
          style={{ padding: '12px 14px' }}
        >
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[.05em] text-[#6B7280]">
            Trigger Condition
          </div>
          <p className="mb-3 text-[11px] text-[#9CA3AF] leading-snug">
            The rule fires when the selected field matches this condition. The Trust Layer
            evaluates it in real time on every AI request before a response is returned.
          </p>

          <div className="flex flex-wrap items-end gap-2">
            {/* When (field) */}
            <div>
              <label className={labelStyle}>When</label>
              <select
                value={conditionField}
                onChange={(e) => handleFieldChange(e.target.value as ConditionField)}
                className={selectStyle}
              >
                <option value="confidence_score">Confidence Score</option>
                <option value="event_type">Event Type</option>
                <option value="outcome">Outcome</option>
                <option value="model_name">Model Name</option>
              </select>
            </div>

            {/* Operator */}
            <div>
              <label className={labelStyle}>Is</label>
              <select
                value={conditionOperator}
                onChange={(e) => setConditionOperator(e.target.value)}
                className={selectStyle}
              >
                {FIELD_OPERATORS[conditionField].map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Value — dynamic based on field */}
            <div>
              <label className={labelStyle}>Value</label>
              {conditionField === 'confidence_score' && (
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  className={selectStyle}
                  style={{ width: 90 }}
                />
              )}
              {conditionField === 'event_type' && (
                <select
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  className={selectStyle}
                >
                  <option value="inference">inference</option>
                  <option value="policy_check">policy_check</option>
                  <option value="bias_scan">bias_scan</option>
                  <option value="session_start">session_start</option>
                  <option value="model_load">model_load</option>
                </select>
              )}
              {conditionField === 'outcome' && (
                <select
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  className={selectStyle}
                >
                  <option value="allowed">allowed</option>
                  <option value="blocked">blocked</option>
                  <option value="flagged">flagged</option>
                </select>
              )}
              {conditionField === 'model_name' && (
                <input
                  type="text"
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  placeholder="e.g. GPT-4"
                  className={selectStyle}
                  style={{ width: 130 }}
                />
              )}
            </div>
          </div>

          {/* Live preview */}
          {conditionValue !== '' && (
            <div className="mt-3 rounded-[4px] bg-[#EFF6FF] border border-[#BFDBFE] px-3 py-1.5 text-[11px] text-[#1D4ED8] font-mono">
              IF {conditionField} {conditionOperator === 'below' ? '<' : conditionOperator === 'above' ? '>' : conditionOperator === 'equals' ? '=' : conditionOperator === 'not_equals' ? '≠' : 'contains'} {conditionValue} → {ruleAction.toUpperCase()}
            </div>
          )}

          {/* Action */}
          <div className="mt-4">
            <label className={labelStyle}>Then</label>
            <div className="flex flex-wrap gap-2">
              {(['block', 'flag', 'allow'] as const).map((act) => (
                <button
                  key={act}
                  type="button"
                  onClick={() => setRuleAction(act)}
                  className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold transition-colors border ${
                    ruleAction === act
                      ? act === 'block'
                        ? 'bg-[#DC2626] text-white border-[#DC2626]'
                        : act === 'flag'
                        ? 'bg-[#D97706] text-white border-[#D97706]'
                        : 'bg-[#16A34A] text-white border-[#16A34A]'
                      : 'bg-white text-[#6B7280] border-[#D1D5DB] hover:bg-[#F3F4F6]'
                  }`}
                >
                  {act === 'block' ? '⊘ Block request' : act === 'flag' ? '⚑ Flag for review' : '✓ Allow with logging'}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10.5px] text-[#9CA3AF]">
              {ruleAction === 'block'
                ? 'The request is rejected before it reaches the model. The event is logged as "blocked".'
                : ruleAction === 'flag'
                ? 'The request is allowed but marked as "flagged" and surfaced in the Alert feed for human review.'
                : 'The request is allowed and logged as "allowed" with a note for audit trail purposes.'}
            </p>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center rounded-[5px] bg-[#2563EB] font-semibold text-white hover:bg-[#1D4ED8] transition-all disabled:opacity-60"
            style={{ padding: '4px 10px', fontSize: 12 }}
          >
            {isPending
              ? isEdit ? 'Saving…' : 'Creating…'
              : isEdit ? 'Save Changes' : 'Create Policy'}
          </button>
        </div>
      </div>
    </form>
  );
}
