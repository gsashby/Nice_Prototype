'use client';
import { useState } from 'react';
import NlqInput from '@/components/nlq/NlqInput';
import NlqSuggestions from '@/components/nlq/NlqSuggestions';
import NlqResultTable from '@/components/nlq/NlqResultTable';
import { parseNlq } from '@/lib/parseNlq';
import type { NlqResult } from '@/lib/parseNlq';

export default function NlqPanel() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<NlqResult | null>(null);
  const [resultsCollapsed, setResultsCollapsed] = useState(false);

  function handleQuery(q: string) {
    if (!q.trim()) return;
    setQuery(q);
    setResult(parseNlq(q));
    setResultsCollapsed(false);
  }

  function handleClear() {
    setQuery('');
    setResult(null);
  }

  return (
    <div className="space-y-3">
      {/* Input + suggestions — always visible */}
      <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #E5E7EB' }}>
          <div className="text-[13.5px] font-bold text-[#111827]">Natural Language Query</div>
          <div className="text-[11.5px] text-[#9CA3AF]">Ask questions about your governance data in plain English</div>
        </div>
        <div style={{ padding: '14px 16px' }}>
          <NlqInput query={query} onQueryChange={setQuery} onQuery={handleQuery} />
          <div className="mt-3">
            <NlqSuggestions onQuery={handleQuery} />
          </div>
        </div>
      </div>

      {/* Results — appears only after a query; collapsible via header */}
      {result && (
        <NlqResultTable
          result={result}
          onClear={handleClear}
          collapsed={resultsCollapsed}
          onToggleCollapsed={() => setResultsCollapsed((v) => !v)}
        />
      )}
    </div>
  );
}
