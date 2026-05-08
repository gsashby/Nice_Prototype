'use client';
import { useState } from 'react';
import { useCreatePolicy } from '@/hooks/usePolicies';

const inputStyle = "w-full rounded-[5px] border border-[#D1D5DB] bg-white px-3 py-2 text-[12.5px] text-[#1F2937] placeholder-[#9CA3AF] focus:border-[#2563EB] focus:outline-none";
const labelStyle = "block text-[11px] font-semibold uppercase tracking-[.05em] text-[#6B7280] mb-1";

type Props = { onCreated: () => void };

export default function PolicyBuilder({ onCreated }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const { mutate, isPending, isError, error } = useCreatePolicy();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate(
      { name, description, severity: severity as import('@/types/policy').PolicySeverity, enabled: true, ruleConfig: {} },
      { onSuccess: onCreated },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
      <div style={{ padding: '16px 16px 14px', borderBottom: '1px solid #E5E7EB' }}>
        <div className="text-[13.5px] font-bold text-[#111827]">New Policy</div>
        <div className="text-[11.5px] text-[#9CA3AF]">Define a new governance rule</div>
      </div>

      <div className="space-y-4" style={{ padding: '16px' }}>
        {isError && (
          <p className="rounded-[5px] border border-red-300 bg-red-50 px-3 py-2 text-[12px] text-red-600">
            {(error as Error).message}
          </p>
        )}

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

        <div>
          <label className={labelStyle}>Severity</label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="rounded-[5px] border border-[#D1D5DB] bg-white px-3 py-2 text-[12.5px] text-[#1F2937] focus:border-[#2563EB] focus:outline-none"
          >
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center rounded-[5px] bg-[#2563EB] font-semibold text-white hover:bg-[#1D4ED8] transition-all disabled:opacity-60"
            style={{ padding: '4px 10px', fontSize: 12 }}
          >
            {isPending ? 'Creating…' : 'Create Policy'}
          </button>
        </div>
      </div>
    </form>
  );
}
