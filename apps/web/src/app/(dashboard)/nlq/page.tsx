'use client';
import { useState } from 'react';
import PageHeader from '@/components/shared/PageHeader';
import NlqInput from '@/components/nlq/NlqInput';
import NlqSuggestions from '@/components/nlq/NlqSuggestions';
import NlqResultTable from '@/components/nlq/NlqResultTable';
import { parseNlq } from '@/lib/parseNlq';
import type { NlqResult } from '@/lib/parseNlq';

export default function NlqPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<NlqResult | null>(null);

  function handleQuery(q: string) {
    if (!q.trim()) return;
    setQuery(q);
    setResult(parseNlq(q));
  }

  function handleClear() {
    setQuery('');
    setResult(null);
  }

  return (
    <div className="space-y-6" style={{ paddingLeft: 24 }}>
      <PageHeader
        title="Natural Language Query"
        description="Ask questions about your governance data in plain English"
      />
      <NlqInput query={query} onQueryChange={setQuery} onQuery={handleQuery} />
      {!result && <NlqSuggestions onQuery={handleQuery} />}
      <NlqResultTable result={result} onClear={handleClear} />
    </div>
  );
}
