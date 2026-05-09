import type { SortConfig, SortDir } from '@/lib/useSortable';

type Props<T> = {
  label: string;
  colKey: keyof T;
  sort: SortConfig<T>;
  onToggle: (key: keyof T) => void;
  className?: string;
};

function Arrow({ dir, active }: { dir: SortDir; active: boolean }) {
  return (
    <svg
      width="8" height="8" viewBox="0 0 8 8" fill="none"
      style={{ opacity: active ? 1 : 0.3, color: active ? '#2563EB' : '#9CA3AF' }}
    >
      {dir === 'asc'
        ? <path d="M4 1L7 6H1L4 1Z" fill="currentColor" />
        : <path d="M4 7L1 2H7L4 7Z" fill="currentColor" />}
    </svg>
  );
}

export default function SortTh<T>({ label, colKey, sort, onToggle, className = '' }: Props<T>) {
  const isActive = sort?.key === colKey;
  return (
    <th
      onClick={() => onToggle(colKey)}
      className={`select-none cursor-pointer whitespace-nowrap py-2.5 text-[11px] font-bold uppercase tracking-[.05em] text-[#6B7280] hover:text-[#374151] transition-colors ${className}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className="inline-flex flex-col gap-px">
          <Arrow dir="asc"  active={isActive && sort?.dir === 'asc'} />
          <Arrow dir="desc" active={isActive && sort?.dir === 'desc'} />
        </span>
      </span>
    </th>
  );
}
