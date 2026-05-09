'use client';
import { useState } from 'react';
import PageHeader from '@/components/shared/PageHeader';
import ModelRegistryTable from '@/components/model-registry/ModelRegistryTable';
import ModelDetailDrawer from '@/components/model-registry/ModelDetailDrawer';
import RegisterModelForm from '@/components/model-registry/RegisterModelForm';
import { useModelRegistry, type RegistryModel } from '@/hooks/useModelRegistry';

function SummaryKpis() {
  const { data: models = [], isLoading } = useModelRegistry();

  const active = models.filter((m) => m.status === 'active').length;
  const avgScore = models.length > 0
    ? models.reduce((s, m) => s + m.governance_score, 0) / models.length
    : 0;
  const critical = models.filter((m) => m.governance_score < 70).length;
  const totalInferences = models.reduce((s, m) => s + m.total_inferences, 0);

  const kpis = [
    { label: 'Registered Models', value: isLoading ? '…' : String(models.length) },
    { label: 'Active', value: isLoading ? '…' : String(active), color: '#16A34A' },
    { label: 'Avg Gov. Score', value: isLoading ? '…' : `${avgScore.toFixed(1)}%`, color: avgScore >= 85 ? '#16A34A' : avgScore >= 70 ? '#D97706' : '#DC2626' },
    { label: 'Critical', value: isLoading ? '…' : String(critical), color: critical > 0 ? '#DC2626' : '#9CA3AF' },
    { label: 'Inferences (7d)', value: isLoading ? '…' : totalInferences.toLocaleString() },
  ];

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
      {kpis.map(({ label, value, color }) => (
        <div
          key={label}
          className="rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]"
          style={{ padding: '12px 16px' }}
        >
          <div className="text-[10.5px] font-semibold uppercase tracking-[.05em] text-[#9CA3AF] mb-1">{label}</div>
          <div className="text-[22px] font-bold tabular-nums" style={{ color: color ?? '#111827' }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

export default function ModelRegistryPage() {
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<RegistryModel | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Model Registry"
        description="Registered AI models and governance status"
        actions={
          <button
            onClick={() => setShowForm((v) => !v)}
            className={`inline-flex items-center rounded-[5px] font-semibold transition-all whitespace-nowrap ${showForm ? 'border border-[#D1D5DB] bg-white text-[#374151] hover:bg-[#F9FAFB]' : 'bg-[#2563EB] text-white hover:bg-[#1D4ED8]'}`}
            style={{ padding: '4px 10px', fontSize: 12 }}
          >
            {showForm ? 'Cancel' : '+ Register Model'}
          </button>
        }
      />

      <SummaryKpis />

      {showForm && <RegisterModelForm onCreated={() => setShowForm(false)} />}

      <ModelRegistryTable onSelect={setSelected} />

      <ModelDetailDrawer model={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
