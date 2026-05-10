'use client';
import { useState } from 'react';
import NlqInput from '@/components/nlq/NlqInput';
import NlqSuggestions from '@/components/nlq/NlqSuggestions';
import NlqResultTable from '@/components/nlq/NlqResultTable';
import { parseNlq } from '@/lib/parseNlq';
import type { NlqResult } from '@/lib/parseNlq';

function isRegexFallback(result: NlqResult) {
  return result.tags.length === 1 && result.tags[0].startsWith('search: "');
}

export default function NlqPanel() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<NlqResult | null>(null);
  const [resultsCollapsed, setResultsCollapsed] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  async function handleQuery(q: string) {
    if (!q.trim()) return;
    setQuery(q);
    setResultsCollapsed(false);

    const parsed = parseNlq(q);

    // Fast path: regex found structured filters — use immediately, no network call
    if (!isRegexFallback(parsed)) {
      setResult(parsed);
      return;
    }

    // Slow path: regex only produced a raw search term — ask Claude to interpret
    setResult(null);
    setAiLoading(true);
    try {
      const res = await fetch('/api/nlq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'AI query failed');
      setResult({ filters: json.filters, tags: json.tags, source: 'ai' });
    } catch {
      // Graceful fallback: use the regex search result if AI fails
      setResult(parsed);
    } finally {
      setAiLoading(false);
    }
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
          <div className="text-[13.5px] font-bold text-[#111827]">CXone Query Explorer</div>
          <div className="text-[11.5px] text-[#9CA3AF]">Ask questions about your governance data in plain English</div>
        </div>
        <div style={{ padding: '14px 16px' }}>
          <NlqInput query={query} onQueryChange={setQuery} onQuery={handleQuery} loading={aiLoading} />
          <div className="mt-3">
            <NlqSuggestions onQuery={handleQuery} />
          </div>
        </div>
      </div>

      {/* Results — appears after a query; collapsible via header */}
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
