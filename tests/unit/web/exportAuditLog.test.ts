import { describe, it, expect } from 'vitest'
import { buildSiemPayload } from '../../../apps/web/src/lib/exportAuditLog'
import type { AuditEvent } from '../../../apps/web/src/types/audit'

// ── Test fixture ──────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: 'evt-aabbccdd-1234',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    event_time: '2024-06-15T10:30:00Z',
    event_type: 'inference',
    model_id: 'model-001',
    model_name: 'Claude 3 Sonnet',
    agent_id: 'agent-abc',
    session_id: 'sess-xyz',
    action: 'generate',
    outcome: 'allowed',
    confidence_score: 0.92,
    policy_violations: [],
    metadata: {},
    ...overrides,
  }
}

// ── buildSiemPayload ──────────────────────────────────────────────────────────

describe('buildSiemPayload — CEF format', () => {
  it('starts with CEF:0 header', () => {
    const payload = buildSiemPayload([makeEvent()])
    expect(payload).toMatch(/^CEF:0\|NICE CXone\|AI Trust Center\|1\.0\|/)
  })

  it('includes the outcome in uppercase after the version field', () => {
    expect(buildSiemPayload([makeEvent({ outcome: 'blocked' })])).toContain('|BLOCKED|')
    expect(buildSiemPayload([makeEvent({ outcome: 'flagged' })])).toContain('|FLAGGED|')
    expect(buildSiemPayload([makeEvent({ outcome: 'allowed' })])).toContain('|ALLOWED|')
  })

  it('includes the event_type in the CEF name field', () => {
    const payload = buildSiemPayload([makeEvent({ event_type: 'bias_scan' })])
    expect(payload).toContain('bias_scan')
  })
})

describe('buildSiemPayload — severity mapping', () => {
  it('maps blocked → severity 8', () => {
    expect(buildSiemPayload([makeEvent({ outcome: 'blocked' })])).toMatch(/\|8\|/)
  })

  it('maps flagged → severity 5', () => {
    expect(buildSiemPayload([makeEvent({ outcome: 'flagged' })])).toMatch(/\|5\|/)
  })

  it('maps allowed → severity 2', () => {
    expect(buildSiemPayload([makeEvent({ outcome: 'allowed' })])).toMatch(/\|2\|/)
  })
})

describe('buildSiemPayload — CEF extension fields', () => {
  it('includes rt= epoch timestamp', () => {
    const payload = buildSiemPayload([makeEvent()])
    expect(payload).toMatch(/rt=\d{13}/)
  })

  it('includes suser= with agent_id', () => {
    const payload = buildSiemPayload([makeEvent({ agent_id: 'agent-007' })])
    expect(payload).toContain('suser=agent-007')
  })

  it('includes dvc= with model_name', () => {
    const payload = buildSiemPayload([makeEvent({ model_name: 'GPT-4' })])
    expect(payload).toContain('dvc=GPT-4')
  })

  it('emits empty suser= for blank agent_id (??-operator only catches null/undefined)', () => {
    const payload = buildSiemPayload([makeEvent({ agent_id: '' })])
    expect(payload).toContain('suser= ')
  })

  it('emits empty dvc= for blank model_name (??-operator only catches null/undefined)', () => {
    const payload = buildSiemPayload([makeEvent({ model_name: '' })])
    expect(payload).toContain('dvc= ')
  })

  it('includes cs1= session ID', () => {
    const payload = buildSiemPayload([makeEvent({ session_id: 'sess-abc' })])
    expect(payload).toContain('cs1=sess-abc')
    expect(payload).toContain('cs1Label=sessionId')
  })

  it('includes cs2= confidence percentage formatted to 1dp', () => {
    const payload = buildSiemPayload([makeEvent({ confidence_score: 0.855 })])
    expect(payload).toContain('cs2=85.5%')
    expect(payload).toContain('cs2Label=confidence')
  })

  it('includes cs3= empty for no violations', () => {
    const payload = buildSiemPayload([makeEvent({ policy_violations: [] })])
    expect(payload).toContain('cs3=')
    expect(payload).toContain('cs3Label=policyViolations')
  })

  it('includes cs3= with semicolon-joined violations', () => {
    const payload = buildSiemPayload([
      makeEvent({ policy_violations: ['PII_LEAK', 'BIAS_DETECTED'] }),
    ])
    expect(payload).toContain('cs3=PII_LEAK;BIAS_DETECTED')
  })
})

describe('buildSiemPayload — multi-event behaviour', () => {
  it('returns one line per event', () => {
    const events = [makeEvent(), makeEvent({ id: 'evt-2' }), makeEvent({ id: 'evt-3' })]
    const payload = buildSiemPayload(events)
    expect(payload.split('\n')).toHaveLength(3)
  })

  it('limits output to 5 events regardless of input length', () => {
    const events = Array.from({ length: 10 }, (_, i) => makeEvent({ id: `evt-${i}` }))
    const payload = buildSiemPayload(events)
    expect(payload.split('\n')).toHaveLength(5)
  })

  it('returns empty string for empty input', () => {
    expect(buildSiemPayload([])).toBe('')
  })
})
