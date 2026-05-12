'use client';
import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import NlqInput from '@/components/nlq/NlqInput';
import NlqSuggestions from '@/components/nlq/NlqSuggestions';
import NlqResultTable from '@/components/nlq/NlqResultTable';
import { parseNlq } from '@/lib/parseNlq';
import type { NlqResult } from '@/lib/parseNlq';

// Route to AI when: regex only produced a raw search term, OR the query is conversational/analytical.
function shouldUseAI(result: NlqResult): boolean {
  return (
    (result.tags.length === 1 && result.tags[0].startsWith('search: "')) ||
    result.kind === 'question'
  );
}

export default function NlqPanel() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<NlqResult | null>(null);
  const [offTopicMessage, setOffTopicMessage] = useState<string | null>(null);
  const [resultsCollapsed, setResultsCollapsed] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  async function handleQuery(q: string) {
    if (!q.trim()) return;
    setQuery(q);
    setResultsCollapsed(false);
    setOffTopicMessage(null);

    const parsed = parseNlq(q);

    // Fast path: regex produced structured filters and the query is not analytical — skip the network call.
    if (!shouldUseAI(parsed)) {
      setResult(parsed);
      return;
    }

    // Slow path: ask the AI to interpret the query.
    setResult(null);
    setAiLoading(true);
    try {
      const res = await fetch('/api/nlq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const json = await res.json();

      if (res.status === 400 && json.error === 'off_topic') {
        setOffTopicMessage(json.message ?? 'This query is outside the AI governance scope.');
        return;
      }
      if (!res.ok) throw new Error(json.error ?? 'AI query failed');

      setResult({
        filters: json.filters ?? { page: 1, pageSize: 25 },
        tags: json.tags ?? [],
        source: 'ai',
        kind: json.kind ?? 'filter',
        context: json.context,
        answer: json.answer,
      });
    } catch {
      // Graceful fallback: use the regex result if AI is unavailable.
      setResult(parsed);
    } finally {
      setAiLoading(false);
    }
  }

  function handleClear() {
    setQuery('');
    setResult(null);
    setOffTopicMessage(null);
  }

  return (
    <div className="space-y-3">
      {/* Input + suggestions */}
      <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #E5E7EB' }}>
          <div className="text-[13.5px] font-bold text-[#111827]">CXone Query Explorer</div>
          <div className="text-[11.5px] text-[#9CA3AF]">Ask questions about your AI governance data in plain English</div>
        </div>
        <div style={{ padding: '14px 16px' }}>
          <NlqInput query={query} onQueryChange={setQuery} onQuery={handleQuery} loading={aiLoading} />
          <div className="mt-3">
            <NlqSuggestions onQuery={handleQuery} />
          </div>
        </div>
      </div>

      {/* Off-topic warning */}
      {offTopicMessage && (
        <div className="flex items-start gap-3 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-4 shadow-[0_1px_3px_rgba(0,0,0,.06)]">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#D97706]" />
          <div>
            <p className="text-[13px] font-semibold text-[#92400E]">Outside governance scope</p>
            <p className="mt-0.5 text-[12.5px] text-[#78350F]">{offTopicMessage}</p>
          </div>
          <button
            onClick={handleClear}
            className="ml-auto shrink-0 rounded border border-[#FDE68A] bg-white px-2.5 py-1 text-[11.5px] font-semibold text-[#92400E] hover:bg-[#FEF3C7] transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Results */}
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
