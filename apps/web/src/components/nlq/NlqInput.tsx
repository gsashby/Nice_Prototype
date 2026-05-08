'use client';
import { useState } from 'react';
import { Search } from 'lucide-react';

export default function NlqInput() {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: wire to useNlqQuery hook
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search className="absolute left-4 top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-[#9CA3AF]" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask anything about your governance data…"
        className="w-full rounded-lg border border-[#D1D5DB] bg-white py-3.5 pr-24 text-[13.5px] text-[#1F2937] placeholder-[#9CA3AF] focus:border-[#2563EB] focus:outline-none shadow-[0_1px_3px_rgba(0,0,0,.06)]"
        style={{ paddingLeft: 44 }}
      />
      <button
        type="submit"
        className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center rounded-[5px] bg-[#2563EB] font-semibold text-white hover:bg-[#1D4ED8] transition-all"
        style={{ padding: '4px 12px', fontSize: 12 }}
      >
        Query
      </button>
    </form>
  );
}
