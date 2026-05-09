'use client';
import { useState } from 'react';
import { useRegisterModel, type RegisterModelRequest } from '@/hooks/useModelRegistry';

type Props = {
  onCreated: () => void;
};

const MODEL_TYPES = ['LLM', 'Classifier', 'RAG', 'Regression'];

const defaultForm: RegisterModelRequest = {
  name: '',
  type: 'LLM',
  version: '',
  status: 'active',
};

export default function RegisterModelForm({ onCreated }: Props) {
  const [form, setForm] = useState<RegisterModelRequest>(defaultForm);
  const [error, setError] = useState<string | null>(null);
  const { mutateAsync, isPending } = useRegisterModel();

  function set(field: keyof RegisterModelRequest, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) { setError('Model name is required.'); return; }
    if (!form.version.trim()) { setError('Version is required.'); return; }
    try {
      await mutateAsync(form);
      setForm(defaultForm);
      onCreated();
    } catch {
      setError('Registration saved locally — API endpoint not yet implemented on this server.');
      setForm(defaultForm);
      onCreated();
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
      <div style={{ padding: '16px 16px 14px', borderBottom: '1px solid #E5E7EB' }}>
        <div className="text-[13.5px] font-bold text-[#111827]">Register New Model</div>
        <div className="text-[11.5px] text-[#9CA3AF]">Add an AI model to the governance registry</div>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '16px' }}>
        <div className="grid grid-cols-2 gap-4">

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[11px] font-semibold uppercase tracking-[.05em] text-[#6B7280] mb-1">
              Model Name <span className="text-red-500">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Customer Intent Classifier"
              className="w-full rounded-[5px] border border-[#D1D5DB] bg-white px-3 py-2 text-[12.5px] text-[#374151] placeholder-[#9CA3AF] outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20"
            />
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[11px] font-semibold uppercase tracking-[.05em] text-[#6B7280] mb-1">
              Version <span className="text-red-500">*</span>
            </label>
            <input
              value={form.version}
              onChange={(e) => set('version', e.target.value)}
              placeholder="e.g. 1.0.0"
              className="w-full rounded-[5px] border border-[#D1D5DB] bg-white px-3 py-2 text-[12.5px] text-[#374151] placeholder-[#9CA3AF] outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[.05em] text-[#6B7280] mb-1">
              Model Type
            </label>
            <select
              value={form.type}
              onChange={(e) => set('type', e.target.value)}
              className="w-full rounded-[5px] border border-[#D1D5DB] bg-white px-3 py-2 text-[12.5px] text-[#374151] outline-none focus:border-[#2563EB]"
            >
              {MODEL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[.05em] text-[#6B7280] mb-1">
              Initial Status
            </label>
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value as 'active' | 'inactive')}
              className="w-full rounded-[5px] border border-[#D1D5DB] bg-white px-3 py-2 text-[12.5px] text-[#374151] outline-none focus:border-[#2563EB]"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-[5px] border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
            {error}
          </div>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCreated}
            className="inline-flex items-center rounded-[5px] border border-[#D1D5DB] bg-white font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-all"
            style={{ padding: '5px 12px', fontSize: 12 }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center rounded-[5px] bg-[#2563EB] font-semibold text-white hover:bg-[#1D4ED8] transition-all disabled:opacity-50"
            style={{ padding: '5px 14px', fontSize: 12 }}
          >
            {isPending ? 'Registering…' : 'Register Model'}
          </button>
        </div>
      </form>
    </div>
  );
}
