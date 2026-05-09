'use client';
import { usePolicies, useTogglePolicy } from '@/hooks/usePolicies';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import SortTh from '@/components/shared/SortTh';
import { useSortable } from '@/lib/useSortable';

const severityStyles: Record<string, string> = {
  critical: 'bg-[#FEE2E2] text-[#DC2626]',
  high:     'bg-[#FFEDD5] text-[#C2410C]',
  medium:   'bg-[#FEF3C7] text-[#92400E]',
  low:      'bg-[#DBEAFE] text-[#1D4ED8]',
};

type Policy = { id: string; name: string; description: string; severity: string; enabled: boolean; violationCount: number };

export default function PolicyList() {
  const { data, isLoading, isError } = usePolicies();
  const { mutate: toggle, isPending: isToggling } = useTogglePolicy();
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
                <SortTh label="Policy Name"    colKey="name"           sort={sort} onToggle={sortToggle} className="pl-4 pr-3.5" />
                <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[.05em] text-[#6B7280] whitespace-nowrap">Description</th>
                <SortTh label="Severity"       colKey="severity"       sort={sort} onToggle={sortToggle} className="px-3.5" />
                <SortTh label="Status"         colKey="enabled"        sort={sort} onToggle={sortToggle} className="px-3.5" />
                <SortTh label="Violations (7d)" colKey="violationCount" sort={sort} onToggle={sortToggle} className="px-3.5" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((policy) => (
                <tr key={policy.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors">
                  <td className="pl-4 pr-3.5 py-2.5 text-[12.5px] font-semibold text-[#111827]">{policy.name}</td>
                  <td className="px-3.5 py-2.5 text-[12px] text-[#6B7280]">{policy.description}</td>
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
                  <td className="px-3.5 py-2.5 text-[12.5px] text-[#374151]">{policy.violationCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
