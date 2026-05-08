'use client';

const suggestions = [
  'Show me all policy violations in the last 7 days',
  'Which AI agents have the lowest confidence scores?',
  'How many customer interactions used AI assistance this week?',
  'List models with bias score above threshold',
  'Show compliance rate by business unit',
];

export default function NlqSuggestions() {
  return (
    <div>
      <p className="mb-2 text-xs text-gray-500 uppercase tracking-wide">Suggested Queries</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            className="rounded-full border border-gray-700 bg-gray-900 px-3 py-1 text-sm text-gray-300 hover:border-blue-500 hover:text-white transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
