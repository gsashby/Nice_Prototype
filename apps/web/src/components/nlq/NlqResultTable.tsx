export default function NlqResultTable() {
  return (
    <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
      <div style={{ padding: '16px 16px 14px', borderBottom: '1px solid #E5E7EB' }}>
        <div className="text-[13.5px] font-bold text-[#111827]">Query Results</div>
        <div className="text-[11.5px] text-[#9CA3AF]">Results will appear here after you run a query</div>
      </div>
      <div className="flex items-center justify-center py-16 text-[13px] text-[#9CA3AF]">
        Run a query above to see results
      </div>
    </div>
  );
}
