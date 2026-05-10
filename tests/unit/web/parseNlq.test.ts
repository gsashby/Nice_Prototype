import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { parseNlq } from '../../../apps/web/src/lib/parseNlq'

// Fix "today" so date-based assertions are deterministic
const FIXED_NOW = new Date('2024-06-15T12:00:00Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('parseNlq — outcome detection', () => {
  it('detects "blocked"', () => {
    const r = parseNlq('show me blocked events')
    expect(r.filters.outcome).toBe('blocked')
    expect(r.tags).toContain('outcome: blocked')
  })

  it('detects "block" (stem)', () => {
    expect(parseNlq('block events').filters.outcome).toBe('blocked')
  })

  it('detects "flagged" from violation keyword', () => {
    const r = parseNlq('show policy violations')
    expect(r.filters.outcome).toBe('flagged')
    expect(r.tags).toContain('outcome: flagged')
  })

  it('detects "flagged" from "flag"', () => {
    expect(parseNlq('flagged requests').filters.outcome).toBe('flagged')
  })

  it('detects "flagged" from "policy"', () => {
    expect(parseNlq('policy events this week').filters.outcome).toBe('flagged')
  })

  it('detects "allowed" from "allowed"', () => {
    const r = parseNlq('show allowed requests')
    expect(r.filters.outcome).toBe('allowed')
    expect(r.tags).toContain('outcome: allowed')
  })

  it('detects "allowed" from "approved"', () => {
    expect(parseNlq('approved events').filters.outcome).toBe('allowed')
  })

  it('blocked takes precedence over flagged in the same query', () => {
    // "blocked" is checked first in the regex branch
    const r = parseNlq('blocked policy violations')
    expect(r.filters.outcome).toBe('blocked')
  })
})

describe('parseNlq — event type detection', () => {
  it('detects inference', () => {
    const r = parseNlq('show inference events')
    expect(r.filters.eventType).toBe('inference')
    expect(r.tags).toContain('type: inference')
  })

  it('detects policy_check', () => {
    const r = parseNlq('show policy check results')
    expect(r.filters.eventType).toBe('policy_check')
  })

  it('detects bias_scan from "bias"', () => {
    expect(parseNlq('bias scan events').filters.eventType).toBe('bias_scan')
  })

  it('detects session_start from "session"', () => {
    expect(parseNlq('session events today').filters.eventType).toBe('session_start')
  })

  it('detects model_load', () => {
    expect(parseNlq('model load events').filters.eventType).toBe('model_load')
  })
})

describe('parseNlq — time window detection', () => {
  it('sets start and end dates for "today"', () => {
    const r = parseNlq('events today')
    expect(r.filters.startDate).toBeDefined()
    expect(r.filters.endDate).toBeDefined()
    expect(r.tags).toContain('period: today')
    // startDate should be start of 2024-06-15
    expect(r.filters.startDate).toMatch(/^2024-06-15/)
  })

  it('sets start and end dates for "last 24 hours"', () => {
    const r = parseNlq('last 24 hours')
    expect(r.filters.startDate).toBeDefined()
    expect(r.filters.endDate).toBeDefined()
  })

  it('sets only startDate for "last 7 days"', () => {
    const r = parseNlq('last 7 days')
    expect(r.filters.startDate).toBeDefined()
    expect(r.filters.endDate).toBeUndefined()
    expect(r.tags).toContain('period: last 7 days')
    expect(r.filters.startDate).toMatch(/^2024-06-0[89]/)
  })

  it('sets only startDate for "this week"', () => {
    const r = parseNlq('this week')
    expect(r.filters.startDate).toBeDefined()
    expect(r.filters.endDate).toBeUndefined()
  })

  it('sets only startDate for "last 30 days"', () => {
    const r = parseNlq('last 30 days')
    expect(r.filters.startDate).toBeDefined()
    expect(r.filters.endDate).toBeUndefined()
    expect(r.tags).toContain('period: last 30 days')
    // 30 days before 2024-06-15 = 2024-05-16
    expect(r.filters.startDate).toMatch(/^2024-05-1[56]/)
  })

  it('sets only startDate for "this month"', () => {
    const r = parseNlq('events this month')
    expect(r.filters.startDate).toBeDefined()
    expect(r.filters.endDate).toBeUndefined()
  })
})

describe('parseNlq — compound queries', () => {
  it('combines outcome and time window into two tags', () => {
    const r = parseNlq('blocked events this week')
    expect(r.filters.outcome).toBe('blocked')
    expect(r.filters.startDate).toBeDefined()
    expect(r.tags).toHaveLength(2)
    expect(r.tags).toContain('outcome: blocked')
    expect(r.tags).toContain('period: last 7 days')
  })

  it('combines event type and time window', () => {
    const r = parseNlq('inference events today')
    expect(r.filters.eventType).toBe('inference')
    expect(r.filters.startDate).toBeDefined()
    expect(r.tags).toHaveLength(2)
  })
})

describe('parseNlq — search fallback', () => {
  it('falls back to search for unrecognised queries', () => {
    const r = parseNlq('something completely unknown xyz')
    expect(r.filters.search).toBe('something completely unknown xyz')
    expect(r.tags).toHaveLength(1)
    expect(r.tags[0]).toMatch(/^search:/)
  })

  it('preserves original casing in search term', () => {
    // Use a query with no matching keywords so it falls through to search
    const r = parseNlq('GUID-abc-9999-xyz')
    expect(r.filters.search).toBe('GUID-abc-9999-xyz')
  })
})

describe('parseNlq — invariants', () => {
  it('always sets page=1', () => {
    expect(parseNlq('anything').filters.page).toBe(1)
  })

  it('always sets pageSize=25', () => {
    expect(parseNlq('anything').filters.pageSize).toBe(25)
  })

  it('always returns source="regex"', () => {
    expect(parseNlq('anything').source).toBe('regex')
  })

  it('returns an array for tags', () => {
    expect(Array.isArray(parseNlq('blocked today').tags)).toBe(true)
  })
})
