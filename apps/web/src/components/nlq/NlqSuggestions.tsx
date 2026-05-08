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
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[.06em] text-[#9CA3AF]">Suggested Queries</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            className="rounded-full border border-[#D1D5DB] bg-white px-3 py-1 text-[12px] text-[#4B5563] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors shadow-[0_1px_2px_rgba(0,0,0,.04)]"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
