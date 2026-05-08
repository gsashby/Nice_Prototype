import PageHeader from '@/components/shared/PageHeader';
import NlqInput from '@/components/nlq/NlqInput';
import NlqSuggestions from '@/components/nlq/NlqSuggestions';
import NlqResultTable from '@/components/nlq/NlqResultTable';

export default function NlqPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Natural Language Query"
        description="Ask questions about your governance data in plain English"
      />
      <NlqInput />
      <NlqSuggestions />
      <NlqResultTable />
    </div>
  );
}
