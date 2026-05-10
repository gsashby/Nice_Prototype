'use client';
import { useEffect, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';
import type { AgentSummary } from '@/hooks/useAgents';
import type { AuditEvent } from '@/types/audit';

type Props = { agent: AgentSummary | null; onClose: () => void };

const outcomeBadge: Record<string, string> = {
  allowed: 'bg-[#DCFCE7] text-[#15803D]',
  blocked: 'bg-[#FEE2E2] text-[#DC2626]',
  flagged: 'bg-[#FEF3C7] text-[#92400E]',
};

function TrustGauge({ score }: { score: number }) {
  const color = score >= 85 ? '#16A34A' : score >= 70 ? '#D97706' : '#DC2626';
  const label = score >= 85 ? 'Healthy' : score >= 70 ? 'Watch' : 'Critical';
  const labelCls = score >= 85
    ? 'bg-[#DCFCE7] text-[#15803D]'
    : score >= 70
    ? 'bg-[#FEF3C7] text-[#92400E]'
    : 'bg-[#FEE2E2] text-[#DC2626]';
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[22px] font-bold tabular-nums" style={{ color }}>{score.toFixed(1)}%</span>
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${labelCls}`}>{label}</span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-[#E5E7EB] overflow-hidden">
        <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
      <div className="mt-1 text-[10.5px] text-[#9CA3AF]">
        Based on allow rate (50%), avg confidence (35%), violation-free rate (15%)
      </div>
    </div>
  );
}

function OutcomeBar({ allowed, flagged, blocked }: { allowed: number; flagged: number; blocked: number }) {
  const total = allowed + flagged + blocked;
  if (total === 0) return null;
  const ap = (allowed / total) * 100;
  const fp = (flagged / total) * 100;
  const bp = (blocked / total) * 100;
  return (
    <div>
      <div className="flex h-4 w-full overflow-hidden rounded-full">
        {ap > 0 && <div style={{ width: `${ap}%`, background: '#16A34A' }} title={`Allowed: ${allowed}`} />}
        {fp > 0 && <div style={{ width: `${fp}%`, background: '#D97706' }} title={`Flagged: ${flagged}`} />}
        {bp > 0 && <div style={{ width: `${bp}%`, background: '#DC2626' }} title={`Blocked: ${blocked}`} />}
      </div>
      <div className="mt-1.5 flex items-center gap-4 text-[11px] text-[#6B7280]">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#16A34A] inline-block" />
          Allowed {allowed.toLocaleString()} ({ap.toFixed(0)}%)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#D97706] inline-block" />
          Flagged {flagged.toLocaleString()} ({fp.toFixed(0)}%)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#DC2626] inline-block" />
          Blocked {blocked.toLocaleString()} ({bp.toFixed(0)}%)
        </span>
      </div>
    </div>
  );
}

function topViolations(events: AuditEvent[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const e of events) {
    for (const v of e.policy_violations ?? []) {
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));
}

type SessionRow = { session_id: string; event_count: number; worst_outcome: string; started_at: string };

function recentSessions(events: AuditEvent[]): SessionRow[] {
  const map = new Map<string, AuditEvent[]>();
  for (const e of events) {
    if (!e.session_id) continue;
    if (!map.has(e.session_id)) map.set(e.session_id, []);
    map.get(e.session_id)!.push(e);
  }
  return Array.from(map.entries())
    .map(([session_id, evts]) => {
      const worst = evts.some((e) => e.outcome === 'blocked')
        ? 'blocked'
        : evts.some((e) => e.outcome === 'flagged')
        ? 'flagged'
        : 'allowed';
      const started = evts.reduce((min, e) =>
        e.event_time < min ? e.event_time : min, evts[0].event_time);
      return { session_id, event_count: evts.length, worst_outcome: worst, started_at: started };
    })
    .sort((a, b) => b.started_at.localeCompare(a.started_at))
    .slice(0, 8);
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2.5 border-b border-[#F3F4F6] last:border-0">
      <div className="w-28 flex-shrink-0 text-[11px] font-semibold uppercase tracking-[.05em] text-[#9CA3AF] pt-0.5">{label}</div>
      <div className="flex-1 min-w-0 text-[12.5px] text-[#374151]">{children}</div>
    </div>
  );
}

export default function AgentDetailDrawer({ agent, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  useEffect(() => { setVisible(!!agent); }, [agent]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!agent) return null;

  const violations = topViolations(agent.events);
  const sessions   = recentSessions(agent.events);
  const confColor  = agent.avg_confidence >= 0.85 ? '#16A34A' : agent.avg_confidence >= 0.70 ? '#D97706' : '#DC2626';

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity .2s' }}
        onClick={onClose}
      />
      <div
        className="fixed right-0 top-0 z-50 flex h-full w-[520px] flex-col bg-white"
        style={{
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform .25s cubic-bezier(.4,0,.2,1)',
          borderLeft: '1px solid #E5E7EB',
          boxShadow: '-4px 0 24px rgba(0,0,0,.08)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between" style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
          <div>
            <div className="font-mono text-[14px] font-bold text-[#111827]">{agent.agent_id}</div>
            <div className="text-[11.5px] text-[#9CA3AF] mt-0.5">
              {agent.total_events} events · {agent.session_count} sessions · last seen {formatDistanceToNow(parseISO(agent.last_seen), { addSuffix: true })}
            </div>
          </div>
          <button onClick={onClose} className="ml-4 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-[#6B7280] hover:bg-[#F3F4F6] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '16px 20px' }}>

          {/* Trust Score */}
          <div className="mb-4">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[.06em] text-[#9CA3AF]">Trust Score</div>
            <div className="rounded-[6px] border border-[#E5E7EB] bg-white" style={{ padding: '14px 16px' }}>
              <TrustGauge score={agent.trust_score} />
            </div>
          </div>

          {/* Outcome breakdown */}
          <div className="mb-4">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[.06em] text-[#9CA3AF]">Outcome Breakdown</div>
            <div className="rounded-[6px] border border-[#E5E7EB] bg-white" style={{ padding: '14px 16px' }}>
              <OutcomeBar
                allowed={agent.allowed_count}
                flagged={agent.flagged_count}
                blocked={agent.blocked_count}
              />
            </div>
          </div>

          {/* Key metrics */}
          <div className="mb-4">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[.06em] text-[#9CA3AF]">Key Metrics</div>
            <div className="rounded-[6px] border border-[#E5E7EB] bg-white" style={{ padding: '0 14px' }}>
              <Row label="Block Rate">
                <span className="font-semibold tabular-nums" style={{ color: agent.block_rate >= 0.15 ? '#DC2626' : agent.block_rate >= 0.05 ? '#D97706' : '#16A34A' }}>
                  {(agent.block_rate * 100).toFixed(1)}%
                </span>
              </Row>
              <Row label="Avg Confidence">
                <span className="font-semibold tabular-nums" style={{ color: confColor }}>
                  {(agent.avg_confidence * 100).toFixed(1)}%
                </span>
              </Row>
              <Row label="Total Violations">
                <span className={agent.total_violations > 0 ? 'font-semibold text-[#DC2626]' : ''}>
                  {agent.total_violations}
                </span>
              </Row>
              <Row label="Sessions">{agent.session_count}</Row>
            </div>
          </div>

          {/* Top policy violations */}
          {violations.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[.06em] text-[#9CA3AF]">Top Policy Violations</div>
              <div className="flex flex-wrap gap-1.5">
                {violations.map(({ name, count }) => (
                  <span key={name} className="inline-flex items-center gap-1 rounded-full bg-[#FEE2E2] px-2.5 py-1 text-[11px] font-semibold text-[#DC2626]">
                    {name}
                    <span className="rounded-full bg-[#DC2626] px-1 py-0.5 text-[9px] font-bold text-white leading-none">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recent sessions */}
          {sessions.length > 0 && (
            <div className="mb-2">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[.06em] text-[#9CA3AF]">Recent Sessions</div>
              <div className="overflow-hidden rounded-[6px] border border-[#E5E7EB]">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                      <th className="pl-3 pr-2 py-2 text-[10.5px] font-bold uppercase tracking-[.05em] text-[#6B7280] text-left">Session</th>
                      <th className="px-2 py-2 text-[10.5px] font-bold uppercase tracking-[.05em] text-[#6B7280] text-left">Events</th>
                      <th className="px-2 py-2 text-[10.5px] font-bold uppercase tracking-[.05em] text-[#6B7280] text-left">Outcome</th>
                      <th className="px-2 py-2 text-[10.5px] font-bold uppercase tracking-[.05em] text-[#6B7280] text-left">Started</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr
                        key={s.session_id}
                        className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                        onClick={() => { router.push(`/audit-log?search=${encodeURIComponent(s.session_id)}`); onClose(); }}
                      >
                        <td className="pl-3 pr-2 py-2 font-mono text-[10.5px] text-[#374151] truncate max-w-[140px]">
                          {s.session_id.slice(0, 16)}
                        </td>
                        <td className="px-2 py-2 text-[12px] tabular-nums text-[#374151]">{s.event_count}</td>
                        <td className="px-2 py-2">
                          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${outcomeBadge[s.worst_outcome] ?? 'bg-[#F3F4F6] text-[#4B5563]'}`}>
                            {s.worst_outcome}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-[11px] text-[#9CA3AF] whitespace-nowrap">
                          {format(parseISO(s.started_at), 'MMM d HH:mm')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2" style={{ padding: '14px 20px', borderTop: '1px solid #E5E7EB', background: '#F9FAFB' }}>
          <button onClick={onClose} className="inline-flex items-center rounded-[5px] border border-[#D1D5DB] bg-white font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-all" style={{ padding: '5px 12px', fontSize: 12 }}>
            Close
          </button>
          <button
            onClick={() => { router.push(`/audit-log?search=${encodeURIComponent(agent.agent_id)}`); onClose(); }}
            className="inline-flex items-center gap-1.5 rounded-[5px] bg-[#2563EB] font-semibold text-white hover:bg-[#1D4ED8] transition-all"
            style={{ padding: '5px 12px', fontSize: 12 }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View All Events
          </button>
        </div>
      </div>
    </>
  );
}
