'use client';
import { useState } from 'react';
import { useCreatePolicy } from '@/hooks/usePolicies';

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
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-700 bg-gray-900 p-6 space-y-4">
      <h2 className="text-base font-semibold text-white">New Policy</h2>

      {isError && (
        <p className="text-sm text-red-400">{(error as Error).message}</p>
      )}

      <div>
        <label className="block text-xs text-gray-400 mb-1">Name *</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Severity</label>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-60"
      >
        {isPending ? 'Creating…' : 'Create Policy'}
      </button>
    </form>
  );
}
