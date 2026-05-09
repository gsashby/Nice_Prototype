import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const body = await req.json();

  const prompt = `You are an AI governance analyst. Summarize the following governance dashboard data for a senior executive. Be concise, highlight risks, and recommend actions where appropriate. Use plain English — no markdown headers, just clear paragraphs.

Dashboard snapshot:
- Governance score: ${body.governance_score ?? 'N/A'}
- AI decisions today: ${body.decisions_today ?? 'N/A'}
- Policy violations (7d): ${body.policy_violations ?? 'N/A'}
- Compliance coverage: ${body.compliance_coverage ?? '100%'}

Active alerts (${body.alerts?.length ?? 0}):
${body.alerts?.map((a: { severity: string; title: string; description: string }) => `  • [${a.severity.toUpperCase()}] ${a.title}: ${a.description}`).join('\n') ?? 'None'}

Module health:
${body.models?.map((m: { name: string; governance_score: number; confidence_avg: number }) => `  • ${m.name}: governance score ${m.governance_score.toFixed(1)}%, avg confidence ${(m.confidence_avg * 100).toFixed(1)}%`).join('\n') ?? 'No data'}

Provide a 3–4 sentence executive summary followed by a brief "Key Risks" and "Recommended Actions" section.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  return NextResponse.json({ summary: text });
}
