import PageHeader from '@/components/shared/PageHeader';

export default function AiAgentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Agent Monitor"
        description="Per-agent performance, bias, and confidence scoring"
      />
      <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
        <div style={{ padding: '16px 16px 14px', borderBottom: '1px solid #E5E7EB' }}>
          <div className="text-[13.5px] font-bold text-[#111827]">Agent Trust Panel</div>
          <div className="text-[11.5px] text-[#9CA3AF]">Per-agent performance, bias, and confidence scoring</div>
        </div>
        <div className="flex items-center justify-center py-16 text-[13px] text-[#9CA3AF]">
          Agent monitor — coming soon
        </div>
      </div>
    </div>
  );
}
