'use client';
import { useState } from 'react';
import PageHeader from '@/components/shared/PageHeader';
import NlqInput from '@/components/nlq/NlqInput';
import NlqSuggestions from '@/components/nlq/NlqSuggestions';
import NlqResultTable from '@/components/nlq/NlqResultTable';
import { parseNlq } from '@/lib/parseNlq';
import type { NlqResult } from '@/lib/parseNlq';

export default function NlqPage() {
  const [result, setResult] = useState<NlqResult | null>(null);

  function handleQuery(q: string) {
    if (!q.trim()) return;
    setResult(parseNlq(q));
  }

  return (
    <div className="space-y-6" style={{ paddingLeft: 24 }}>
      <PageHeader
        title="Natural Language Query"
        description="Ask questions about your governance data in plain English"
      />
      <NlqInput onQuery={handleQuery} />
      {!result && <NlqSuggestions onQuery={handleQuery} />}
      <NlqResultTable result={result} />
    </div>
  );
}
