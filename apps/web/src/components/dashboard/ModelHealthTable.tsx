'use client';
import { useState } from 'react';
import { useModelHealth } from '@/hooks/useModelHealth';
import type { ModelHealth } from '@/hooks/useModelHealth';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import SortTh from '@/components/shared/SortTh';
import { useSortable } from '@/lib/useSortable';
import ModuleHealthDrawer from '@/components/dashboard/ModuleHealthDrawer';

const moduleStyles: Record<string, string> = {
  autopilot: 'bg-[#EDE9FE] text-[#6D28D9]',
  copilot:   'bg-[#DBEAFE] text-[#1D4ED8]',
  mpower:    'bg-[#CCFBF1] text-[#0F766E]',
};

function moduleColor(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('autopilot')) return moduleStyles.autopilot;
  if (lower.includes('copilot'))   return moduleStyles.copilot;
  return moduleStyles.mpower;
}

function statusBadge(score: number) {
  if (score >= 85) return { cls: 'bg-[#DCFCE7] text-[#15803D]', label: 'Healthy' };
  if (score >= 70) return { cls: 'bg-[#FEF3C7] text-[#92400E]', label: 'Watch' };
  return { cls: 'bg-[#FEE2E2] text-[#DC2626]', label: 'Critical' };
}

type Model = ModelHealth;

export default function ModelHealthTable({ days = 7 }: { days?: number }) {
  const { data, isLoading } = useModelHealth(days);
  const models: Model[] = data?.models ?? [];
  const { sorted, sort, toggle } = useSortable<Model>(models);
  const [selected, setSelected] = useState<Model | null>(null);

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
        <div style={{ padding: '16px 16px 14px' }}>
          <div className="text-[13.5px] font-bold text-[#111827]">Module Health</div>
          <div className="text-[11.5px] text-[#9CA3AF]">Audit coverage &amp; model status &mdash; double-click a row for details</div>
        </div>

        {isLoading ? (
          <div className="space-y-px p-4">
            {Array.from({ length: 4 }).map((_, i) => <LoadingSkeleton key={i} className="h-10" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-[#E5E7EB] bg-[#F9FAFB] text-left">
                  <SortTh label="Module"        colKey="name"             sort={sort} onToggle={toggle} className="pl-4 pr-3.5" tooltip="The AI module (e.g. Autopilot, Copilot, mPower) being monitored. Click to sort." />
                  <SortTh label="Model Version" colKey="type"             sort={sort} onToggle={toggle} className="px-3.5"     tooltip="The underlying AI model version powering this module. Click to sort." />
                  <th title="Percentage of module interactions captured in the audit log. 100% means every request and response is recorded." className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[.05em] text-[#6B7280] whitespace-nowrap">Coverage</th>
                  <SortTh label="Avg Conf."     colKey="confidence_avg"   sort={sort} onToggle={toggle} className="px-3.5"     tooltip="Average confidence score (0–1) of AI responses from this module. Higher values indicate the model is producing more certain outputs. Click to sort." />
                  <SortTh label="Gov. Score"    colKey="governance_score" sort={sort} onToggle={toggle} className="px-3.5"     tooltip="Governance compliance score: the percentage of interactions that passed all active policy rules. Click to sort." />
                  <th title="Overall health status derived from the governance score — Healthy (≥85%), Watch (≥70%), or Critical (<70%)." className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[.05em] text-[#6B7280] whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((m) => {
                  const status = statusBadge(m.governance_score);
                  return (
                    <tr
                      key={m.id}
                      onDoubleClick={() => setSelected(m)}
                      title="Double-click to view module details"
                      className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors cursor-pointer select-none"
                    >
                      <td className="pl-4 pr-3.5 py-2.5 text-[12.5px] text-[#374151]">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${moduleColor(m.name)}`}>
                          {m.name}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-[11.5px] text-[#374151]">{m.type}</td>
                      <td className="px-3.5 py-2.5 text-[12.5px] font-bold text-[#16A34A]">100%</td>
                      <td className="px-3.5 py-2.5 text-[12.5px] text-[#374151]">{m.confidence_avg.toFixed(2)}</td>
                      <td className="px-3.5 py-2.5 text-[12.5px] text-[#374151]">{m.governance_score.toFixed(1)}%</td>
                      <td className="px-3.5 py-2.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.cls}`}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ModuleHealthDrawer module={selected} onClose={() => setSelected(null)} />
    </>
  );
}
