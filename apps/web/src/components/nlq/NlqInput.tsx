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
      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask anything about your governance data…"
        className="w-full rounded-lg border border-gray-700 bg-gray-900 py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none text-base"
      />
      <button
        type="submit"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
      >
        Query
      </button>
    </form>
  );
}
