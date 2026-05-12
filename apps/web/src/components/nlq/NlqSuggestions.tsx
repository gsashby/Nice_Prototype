'use client';

type Props = { onQuery: (q: string) => void };

const FILTER_SUGGESTIONS = [
  'Show blocked events today',
  'Show flagged policy violations this week',
  'Show all inference events last 30 days',
  'Show bias scan events yesterday',
  'Show allowed events this month',
  'Show Autopilot model events',
  'Show session end events last 7 days',
  'Show auto-applied events last 90 days',
  'Show top 50 blocked events',
  'Show non-compliant events this quarter',
];

const ANALYTICAL_SUGGESTIONS = [
  'How many blocked events were there this week?',
  'Which model has the most policy violations?',
  'Why are bias scan events important for governance?',
  'What is the difference between blocked and flagged outcomes?',
  'Explain what a governance score measures',
  'What does the EU AI Act require for AI monitoring?',
  'How does bias detection work in CXone?',
  'Compare inference events vs policy check events',
];

export default function NlqSuggestions({ onQuery }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[.06em] text-[#9CA3AF]">Filter Queries</p>
        <div className="flex flex-wrap gap-2">
          {FILTER_SUGGESTIONS.map((s) => (
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
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[.06em] text-[#9CA3AF]">AI Governance Questions</p>
        <div className="flex flex-wrap gap-2">
          {ANALYTICAL_SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onQuery(s)}
              className="rounded-full border border-[#E9D5FF] bg-[#FAF5FF] px-3 py-1 text-[12px] text-[#7C3AED] hover:border-[#7C3AED] hover:bg-[#F5F3FF] transition-colors shadow-[0_1px_2px_rgba(0,0,0,.04)]"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
