'use client';

type Props = { onQuery: (q: string) => void };

const suggestions = [
  'Show me all blocked events',
  'Show flagged policy violations this week',
  'Show all inference events',
  'Show bias scan events last 30 days',
  'Show allowed events today',
];

export default function NlqSuggestions({ onQuery }: Props) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[.06em] text-[#9CA3AF]">Suggested Queries</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onQuery(s)}
            className="rounded-full border border-[#D1D5DB] bg-white px-3 py-1 text-[12px] text-[#4B5563] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors shadow-[0_1px_2px_rgba(0,0,0,.04)]"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
