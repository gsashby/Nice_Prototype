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
type RuleAction     = 'block' | 'flag' | 'allow';
type ConditionLogic = 'AND' | 'OR';

const FIELD_OPERATORS: Record<ConditionField, Array<{ value: string; label: string }>> = {
  confidence_score: [
    { value: 'below',     label: 'falls below' },
    { value: 'above',     label: 'rises above' },
  ],
  event_type: [
    { value: 'equals',    label: 'is' },
    { value: 'not_equals',label: 'is not' },
  ],
  outcome: [
    { value: 'equals',    label: 'is' },
    { value: 'not_equals',label: 'is not' },
  ],
  model_name: [
    { value: 'equals',    label: 'equals' },
    { value: 'not_equals',label: 'is not' },
    { value: 'contains',  label: 'contains' },
  ],
};

const FIELD_DEFAULTS: Record<ConditionField, string> = {
  confidence_score: '0.70',
  event_type:       'inference',
  outcome:          'blocked',
  model_name:       '',
};

const FIELD_LABEL: Record<ConditionField, string> = {
  confidence_score: 'conf. score',
  event_type:       'event type',
  outcome:          'outcome',
  model_name:       'model',
};

const OPERATOR_SYMBOL: Record<string, string> = {
  below:     '<',
  above:     '>',
  equals:    '=',
  not_equals:'≠',
  contains:  'contains',
};

// ── Types ─────────────────────────────────────────────────────────────────────

type ConditionRow = {
  field:    ConditionField;
  operator: string;
  value:    string;
};

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function defaultCondition(): ConditionRow {
  return { field: 'confidence_score', operator: 'below', value: '0.70' };
}

function previewToken(c: ConditionRow): string {
  const field = FIELD_LABEL[c.field] ?? c.field;
  const op    = OPERATOR_SYMBOL[c.operator] ?? c.operator;
  return `${field} ${op} ${c.value}`;
}

// ── Condition row component ───────────────────────────────────────────────────

function ConditionEditor({
  condition,
  index,
  total,
  logic,
  onLogicChange,
  onChange,
  onRemove,
}: {
  condition: ConditionRow;
  index: number;
  total: number;
  logic: ConditionLogic;
  onLogicChange: (l: ConditionLogic) => void;
  onChange: (changes: Partial<ConditionRow>) => void;
  onRemove: () => void;
}) {
  function handleFieldChange(field: ConditionField) {
    onChange({
      field,
      operator: FIELD_OPERATORS[field][0].value,
      value:    FIELD_DEFAULTS[field],
    });
  }

  return (
    <div className="rounded-[5px] border border-[#E5E7EB] bg-white" style={{ padding: '10px 12px' }}>
      {/* Row label + remove */}
      <div className="mb-2 flex items-center justify-between">
        {index === 0 ? (
          <span className="text-[10.5px] font-semibold uppercase tracking-[.05em] text-[#9CA3AF]">
            When
          </span>
        ) : (
          /* AND / OR toggle — shown on rows after the first */
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onLogicChange('AND')}
              className={`rounded px-2 py-0.5 text-[10px] font-bold transition-colors ${logic === 'AND' ? 'bg-[#2563EB] text-white' : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'}`}
            >
              AND
            </button>
            <button
              type="button"
              onClick={() => onLogicChange('OR')}
              className={`rounded px-2 py-0.5 text-[10px] font-bold transition-colors ${logic === 'OR' ? 'bg-[#7C3AED] text-white' : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'}`}
            >
              OR
            </button>
          </div>
        )}
        {total > 1 && (
          <button
            type="button"
            onClick={onRemove}
            title="Remove condition"
            className="ml-auto rounded p-0.5 text-[#9CA3AF] hover:bg-[#FEF2F2] hover:text-[#DC2626] transition-colors"
          >
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      {/* Field / Operator / Value selectors */}
      <div className="flex flex-wrap items-end gap-2">
        {/* Field */}
        <div>
          <label className={labelStyle}>Field</label>
          <select
            value={condition.field}
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
            value={condition.operator}
            onChange={(e) => onChange({ operator: e.target.value })}
            className={selectStyle}
          >
            {FIELD_OPERATORS[condition.field].map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Value — dynamic */}
        <div>
          <label className={labelStyle}>Value</label>
          {condition.field === 'confidence_score' && (
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={condition.value}
              onChange={(e) => onChange({ value: e.target.value })}
              className={selectStyle}
              style={{ width: 90 }}
            />
          )}
          {condition.field === 'event_type' && (
            <select
              value={condition.value}
              onChange={(e) => onChange({ value: e.target.value })}
              className={selectStyle}
            >
              <option value="inference">inference</option>
              <option value="policy_check">policy_check</option>
              <option value="bias_scan">bias_scan</option>
              <option value="session_start">session_start</option>
              <option value="model_load">model_load</option>
            </select>
          )}
          {condition.field === 'outcome' && (
            <select
              value={condition.value}
              onChange={(e) => onChange({ value: e.target.value })}
              className={selectStyle}
            >
              <option value="allowed">allowed</option>
              <option value="blocked">blocked</option>
              <option value="flagged">flagged</option>
            </select>
          )}
          {condition.field === 'model_name' && (
            <input
              type="text"
              value={condition.value}
              onChange={(e) => onChange({ value: e.target.value })}
              placeholder="e.g. GPT-4"
              className={selectStyle}
              style={{ width: 140 }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PolicyBuilder({ onDone, policy }: Props) {
  const isEdit = !!policy;

  // Basic fields
  const [name,        setName]        = useState(policy?.name        ?? '');
  const [description, setDescription] = useState(policy?.description ?? '');
  const [severity,    setSeverity]    = useState(policy?.severity    ?? 'medium');

  // Conditions — support both new array format and legacy single-condition format
  const existingConditions =
    policy?.rule_config?.conditions as ConditionRow[] | undefined;
  const legacyCondition =
    policy?.rule_config?.condition as ConditionRow | undefined;

  const initialConditions: ConditionRow[] =
    existingConditions ??
    (legacyCondition
      ? [{ field: legacyCondition.field as ConditionField, operator: legacyCondition.operator, value: String(legacyCondition.value ?? '') }]
      : [defaultCondition()]);

  const [conditions,     setConditions]     = useState<ConditionRow[]>(initialConditions);
  const [conditionLogic, setConditionLogic] = useState<ConditionLogic>(
    (policy?.rule_config?.logic as ConditionLogic) ?? 'AND',
  );
  const [ruleAction, setRuleAction] = useState<RuleAction>(
    (policy?.rule_config?.action as RuleAction) ?? 'flag',
  );

  // Mutations
  const create = useCreatePolicy();
  const update = useUpdatePolicy();
  const { isPending, isError, error } = isEdit ? update : create;

  function updateCondition(index: number, changes: Partial<ConditionRow>) {
    setConditions((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...changes } : c)),
    );
  }

  function removeCondition(index: number) {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  }

  function addCondition() {
    setConditions((prev) => [...prev, defaultCondition()]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const ruleConfig = {
      conditions: conditions.map((c) => ({
        field:    c.field,
        operator: c.operator,
        value:
          c.field === 'confidence_score'
            ? parseFloat(c.value) || 0
            : c.value,
      })),
      logic:  conditions.length > 1 ? conditionLogic : 'AND',
      action: ruleAction,
    };

    const payload = {
      name,
      description,
      severity:  severity as PolicySeverity,
      enabled:   policy?.enabled ?? true,
      ruleConfig,
    };

    if (isEdit) {
      update.mutate({ id: policy!.id, ...payload }, { onSuccess: onDone });
    } else {
      create.mutate(payload, { onSuccess: onDone });
    }
  }

  // Live preview text
  const previewParts = conditions
    .filter((c) => c.value !== '')
    .map((c) => `(${previewToken(c)})`);
  const previewExpr =
    previewParts.length > 0
      ? `IF ${previewParts.join(` ${conditionLogic} `)} → ${ruleAction.toUpperCase()}`
      : '';

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

        {/* ── Trigger Conditions ─────────────────────────────────────────── */}
        <div
          className="rounded-[6px] border border-[#E5E7EB] bg-[#F9FAFB]"
          style={{ padding: '12px 14px' }}
        >
          <div className="mb-1 flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-[.05em] text-[#6B7280]">
              Trigger Conditions
            </div>
            {conditions.length > 1 && (
              <div className="text-[10.5px] text-[#9CA3AF]">
                {conditionLogic === 'AND' ? 'All conditions must match' : 'Any condition must match'}
              </div>
            )}
          </div>
          <p className="mb-3 text-[11px] text-[#9CA3AF] leading-snug">
            The rule fires when the conditions below are met. The Trust Layer evaluates them
            in real time on every AI request before a response is returned.
          </p>

          {/* Condition rows */}
          <div className="space-y-2">
            {conditions.map((condition, index) => (
              <ConditionEditor
                key={index}
                condition={condition}
                index={index}
                total={conditions.length}
                logic={conditionLogic}
                onLogicChange={setConditionLogic}
                onChange={(changes) => updateCondition(index, changes)}
                onRemove={() => removeCondition(index)}
              />
            ))}
          </div>

          {/* Add condition */}
          <button
            type="button"
            onClick={addCondition}
            className="mt-2 inline-flex items-center gap-1 rounded-[4px] border border-dashed border-[#D1D5DB] px-3 py-1.5 text-[11px] font-medium text-[#6B7280] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
          >
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Add condition
          </button>

          {/* Live preview */}
          {previewExpr && (
            <div className="mt-3 rounded-[4px] bg-[#EFF6FF] border border-[#BFDBFE] px-3 py-1.5 text-[11px] text-[#1D4ED8] font-mono break-all">
              {previewExpr}
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
