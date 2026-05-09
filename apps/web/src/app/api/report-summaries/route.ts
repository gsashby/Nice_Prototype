import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const { reportContext } = await req.json();

  const prompt = `You are an AI governance analyst writing concise board-level summaries for an AI compliance report.

Generate a short, professional summary (2–3 sentences each, plain prose, no markdown or bullet points) for each of the four sections listed below. Base each summary strictly on the data provided.

Return ONLY valid JSON in this exact shape and nothing else:
{
  "executive": "...",
  "compliance": "...",
  "performance": "...",
  "risk": "..."
}

Report data:
- Title: ${reportContext.title}
- Period: ${reportContext.period}
- Governance score: ${reportContext.governance_score}%
- Total AI decisions: ${reportContext.total_decisions?.toLocaleString()}
- Blocked: ${reportContext.blocked} (${reportContext.blocked_pct}%)
- Flagged: ${reportContext.flagged} (${reportContext.flagged_pct}%)
- Allowed: ${reportContext.allowed} (${reportContext.allowed_pct}%)
- Active policies: ${reportContext.enabled_policies} of ${reportContext.total_policies}
- Policy violations (24h): ${reportContext.policy_violations_24h}
- Active alerts: ${reportContext.alert_count} (${reportContext.critical_alerts} critical)
- Regulations in scope: ${reportContext.regulations?.join(', ')}
- Models monitored: ${reportContext.models_monitored}
- Active models: ${reportContext.models?.map((m: { name: string; governance_score: number; confidence_avg: number; total_inferences: number }) => `${m.name} (gov score: ${m.governance_score.toFixed(1)}%, confidence: ${(m.confidence_avg * 100).toFixed(1)}%, inferences: ${m.total_inferences.toLocaleString()}`).join('; ')}
- Policies: ${reportContext.policies?.map((p: { name: string; severity: string; enabled: boolean; violationCount: number }) => `${p.name} [${p.severity}, ${p.enabled ? 'enabled' : 'disabled'}, ${p.violationCount} violations]`).join('; ')}
- Alerts: ${reportContext.alerts?.length > 0 ? reportContext.alerts.slice(0, 10).map((a: { severity: string; title: string }) => `${a.severity}: ${a.title}`).join('; ') : 'none'}

Section guidance:
- "executive": High-level overview of the reporting period — volume of decisions, governance score, key stats.
- "compliance": Interpretation of policy enforcement — which policies are active, any notable violations, overall compliance posture.
- "performance": Assessment of model health — highlight strong performers, flag any governance concerns, note overall confidence trends.
- "risk": Characterisation of the risk landscape — severity profile of alerts, block rate context, any immediate concerns or reassurances.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}';

  try {
    const summaries = JSON.parse(raw);
    return NextResponse.json({ summaries });
  } catch {
    return NextResponse.json({ error: 'Failed to parse summaries', raw }, { status: 500 });
  }
}
