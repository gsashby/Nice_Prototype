import { describe, it, expect } from 'vitest'

// ── Pure sort algorithm ───────────────────────────────────────────────────────
// Extracted from the useMemo inside useSortable (apps/web/src/lib/useSortable.ts).
// Testing the hook itself would require React; here we validate the algorithm
// that powers all sortable tables in the application.

type SortDir = 'asc' | 'desc'
type SortConfig<T> = { key: keyof T; dir: SortDir } | null

function sortData<T>(data: T[], sort: SortConfig<T>): T[] {
  if (!sort) return data
  return [...data].sort((a, b) => {
    const av = a[sort.key]
    const bv = b[sort.key]
    if (av === null || av === undefined) return 1
    if (bv === null || bv === undefined) return -1
    const cmp = av < bv ? -1 : av > bv ? 1 : 0
    return sort.dir === 'asc' ? cmp : -cmp
  })
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const auditRows = [
  { id: 'c', score: 0.70, outcome: 'allowed',  model: 'Claude' },
  { id: 'a', score: 0.92, outcome: 'blocked',  model: 'GPT-4'  },
  { id: 'b', score: 0.55, outcome: 'flagged',  model: null     },
]

// ── No-sort passthrough ───────────────────────────────────────────────────────

describe('sortData — no sort', () => {
  it('returns the original array reference when sort is null', () => {
    const result = sortData(auditRows, null)
    expect(result).toBe(auditRows)
  })
})

// ── String sorting ────────────────────────────────────────────────────────────

describe('sortData — string fields', () => {
  it('sorts by id ascending', () => {
    const result = sortData(auditRows, { key: 'id', dir: 'asc' })
    expect(result.map(r => r.id)).toEqual(['a', 'b', 'c'])
  })

  it('sorts by id descending', () => {
    const result = sortData(auditRows, { key: 'id', dir: 'desc' })
    expect(result.map(r => r.id)).toEqual(['c', 'b', 'a'])
  })

  it('sorts by outcome ascending (alphabetical)', () => {
    const result = sortData(auditRows, { key: 'outcome', dir: 'asc' })
    expect(result.map(r => r.outcome)).toEqual(['allowed', 'blocked', 'flagged'])
  })

  it('sorts by outcome descending', () => {
    const result = sortData(auditRows, { key: 'outcome', dir: 'desc' })
    expect(result.map(r => r.outcome)).toEqual(['flagged', 'blocked', 'allowed'])
  })
})

// ── Numeric sorting ───────────────────────────────────────────────────────────

describe('sortData — numeric fields', () => {
  it('sorts by score ascending', () => {
    const result = sortData(auditRows, { key: 'score', dir: 'asc' })
    expect(result.map(r => r.score)).toEqual([0.55, 0.70, 0.92])
  })

  it('sorts by score descending', () => {
    const result = sortData(auditRows, { key: 'score', dir: 'desc' })
    expect(result.map(r => r.score)).toEqual([0.92, 0.70, 0.55])
  })
})

// ── Null handling ─────────────────────────────────────────────────────────────

describe('sortData — null values', () => {
  it('pushes null to end when sorting ascending', () => {
    const result = sortData(auditRows, { key: 'model', dir: 'asc' })
    expect(result[result.length - 1].model).toBeNull()
  })

  it('pushes null to end when sorting descending', () => {
    const result = sortData(auditRows, { key: 'model', dir: 'desc' })
    expect(result[result.length - 1].model).toBeNull()
  })

  it('handles an all-null column without throwing', () => {
    const rows = [{ v: null }, { v: null }]
    expect(() => sortData(rows, { key: 'v', dir: 'asc' })).not.toThrow()
  })
})

// ── Immutability ──────────────────────────────────────────────────────────────

describe('sortData — immutability', () => {
  it('does not mutate the original array', () => {
    const original = [...auditRows]
    sortData(original, { key: 'score', dir: 'desc' })
    expect(original[0].id).toBe('c') // first element unchanged
    expect(original[1].id).toBe('a')
    expect(original[2].id).toBe('b')
  })

  it('returns a new array instance', () => {
    const result = sortData(auditRows, { key: 'id', dir: 'asc' })
    expect(result).not.toBe(auditRows)
  })
})

// ── Edge cases ────────────────────────────────────────────────────────────────

describe('sortData — edge cases', () => {
  it('handles empty array', () => {
    expect(sortData([], { key: 'id' as never, dir: 'asc' })).toEqual([])
  })

  it('handles single-element array', () => {
    const single = [{ id: 'only' }]
    expect(sortData(single, { key: 'id', dir: 'asc' })).toEqual(single)
  })

  it('handles equal values (stable-ish — no swap)', () => {
    const rows = [{ v: 5 }, { v: 5 }, { v: 5 }]
    const result = sortData(rows, { key: 'v', dir: 'asc' })
    expect(result.map(r => r.v)).toEqual([5, 5, 5])
  })
})
