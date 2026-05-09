'use client';
import { Search } from 'lucide-react';

type Props = {
  query: string;
  onQueryChange: (q: string) => void;
  onQuery: (q: string) => void;
  loading?: boolean;
};

export default function NlqInput({ query, onQueryChange, onQuery, loading }: Props) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onQuery(query);
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search className="absolute left-4 top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-[#9CA3AF]" />
      <input
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Ask anything about your governance data…"
        disabled={loading}
        className="w-full rounded-lg border border-[#D1D5DB] bg-white py-3.5 pr-24 text-[13.5px] text-[#1F2937] placeholder-[#9CA3AF] focus:border-[#2563EB] focus:outline-none shadow-[0_1px_3px_rgba(0,0,0,.06)] disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ paddingLeft: 44 }}
      />
      <button
        type="submit"
        disabled={loading}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 rounded-[5px] bg-[#2563EB] font-semibold text-white hover:bg-[#1D4ED8] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ padding: '4px 12px', fontSize: 12 }}
      >
        {loading && (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        )}
        {loading ? 'Thinking…' : 'Query'}
      </button>
    </form>
  );
}
