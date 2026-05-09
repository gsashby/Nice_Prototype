import { useState, useMemo } from 'react';

export type SortDir = 'asc' | 'desc';
export type SortConfig<T> = { key: keyof T; dir: SortDir } | null;

export function useSortable<T>(data: T[]) {
  const [sort, setSort] = useState<SortConfig<T>>(null);

  function toggle(key: keyof T) {
    setSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    );
  }

  const sorted = useMemo(() => {
    if (!sort) return data;
    return [...data].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [data, sort]);

  return { sorted, sort, toggle };
}
