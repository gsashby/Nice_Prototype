import PageHeader from '@/components/shared/PageHeader';

export default function AiAgentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Agent Monitor"
        description="Per-agent performance, bias, and confidence scoring"
      />
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">
        Agent monitor — coming soon
      </div>
    </div>
  );
}
