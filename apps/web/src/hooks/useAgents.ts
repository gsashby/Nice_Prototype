import { useMemo } from 'react';
import { useAuditLog } from '@/hooks/useAuditLog';
import type { AuditEvent } from '@/types/audit';

export type AgentSummary = {
  agent_id: string;
  trust_score: number;
  total_events: number;
  allowed_count: number;
  flagged_count: number;
  blocked_count: number;
  block_rate: number;
  avg_confidence: number;
  total_violations: number;
  session_count: number;
  last_seen: string;
  events: AuditEvent[];
};

export type FleetSummary = {
  active_agents: number;
  fleet_block_rate: number;
  fleet_avg_confidence: number;
  high_risk_count: number;
};

function trustScore(allowed: number, total: number, avgConf: number, noViolRate: number): number {
  if (total === 0) return 0;
  const allowRate = allowed / total;
  return Math.round((allowRate * 50 + avgConf * 35 + noViolRate * 15) * 10) / 10;
}

export function useAgents(startDate?: string) {
  const { data, isLoading, isError } = useAuditLog({
    page: 1,
    pageSize: 200,
    ...(startDate && { startDate }),
  });

  const agents = useMemo<AgentSummary[]>(() => {
    const events = data?.events ?? [];
    const map = new Map<string, AuditEvent[]>();

    for (const e of events) {
      if (!e.agent_id) continue;
      if (!map.has(e.agent_id)) map.set(e.agent_id, []);
      map.get(e.agent_id)!.push(e);
    }

    return Array.from(map.entries())
      .map(([agent_id, evts]) => {
        const total    = evts.length;
        const allowed  = evts.filter((e) => e.outcome === 'allowed').length;
        const flagged  = evts.filter((e) => e.outcome === 'flagged').length;
        const blocked  = evts.filter((e) => e.outcome === 'blocked').length;
        const avgConf  = evts.reduce((s, e) => s + e.confidence_score, 0) / total;
        const totalVio = evts.reduce((s, e) => s + (e.policy_violations?.length ?? 0), 0);
        const noVioRate = evts.filter((e) => !e.policy_violations?.length).length / total;
        const sessions = new Set(evts.map((e) => e.session_id).filter(Boolean)).size;
        const lastSeen = evts.reduce((max, e) =>
          e.event_time > max ? e.event_time : max, evts[0]?.event_time ?? '');

        return {
          agent_id,
          trust_score: trustScore(allowed, total, avgConf, noVioRate),
          total_events: total,
          allowed_count: allowed,
          flagged_count: flagged,
          blocked_count: blocked,
          block_rate: blocked / total,
          avg_confidence: avgConf,
          total_violations: totalVio,
          session_count: sessions,
          last_seen: lastSeen,
          events: evts,
        };
      })
      .sort((a, b) => b.total_events - a.total_events);
  }, [data]);

  const fleet = useMemo<FleetSummary | null>(() => {
    if (agents.length === 0) return null;
    const totalEvents = agents.reduce((s, a) => s + a.total_events, 0);
    const totalBlocked = agents.reduce((s, a) => s + a.blocked_count, 0);
    const weightedConf = agents.reduce((s, a) => s + a.avg_confidence * a.total_events, 0);
    return {
      active_agents: agents.length,
      fleet_block_rate: totalEvents > 0 ? totalBlocked / totalEvents : 0,
      fleet_avg_confidence: totalEvents > 0 ? weightedConf / totalEvents : 0,
      high_risk_count: agents.filter((a) => a.trust_score < 70).length,
    };
  }, [agents]);

  return { agents, fleet, isLoading, isError, eventTotal: data?.total ?? 0 };
}
