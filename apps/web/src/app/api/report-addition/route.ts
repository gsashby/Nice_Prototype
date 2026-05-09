import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const { request, reportContext } = await req.json();

  const prompt = `You are an AI governance report assistant for NICE CXone Mpower's AI Trust Center platform. Your sole purpose is to help compliance officers add relevant content to their AI governance compliance reports.

IMPORTANT — Topic guard: Before generating any content, assess whether the user's request is directly related to one of these topics:
- AI governance, AI compliance, or AI risk management
- AI model performance, confidence scores, or bias detection
- Policy enforcement or policy violations
- Audit log analysis or audit trail
- Regulatory compliance (EU AI Act, GDPR, TCPA, CCPA, or similar AI/data regulations)
- Alert investigation or incident analysis
- Board-level reporting on AI systems

If the request is NOT clearly related to one of those topics, you MUST respond with exactly this format and nothing else:
OUT_OF_SCOPE: [one sentence explaining why this is outside the scope of an AI governance report]

If the request IS related, generate professional, formal report content (2–3 paragraphs) suitable for a board-level compliance report. Write in plain prose — no markdown, no bullet points, no headers. Be specific and draw on the report context provided below.

Report context:
- Title: ${reportContext.title}
- Reporting period: ${reportContext.period}
- Governance score: ${reportContext.governance_score}%
- Total AI decisions: ${reportContext.total_decisions?.toLocaleString()}
- Blocked: ${reportContext.blocked} (${reportContext.blocked_pct}%)
- Flagged: ${reportContext.flagged} (${reportContext.flagged_pct}%)
- Active policies: ${reportContext.enabled_policies} of ${reportContext.total_policies}
- Active alerts: ${reportContext.alert_count} (${reportContext.critical_alerts} critical)
- Regulations in scope: ${reportContext.regulations?.join(', ')}
- Models monitored: ${reportContext.models?.map((m: { name: string; governance_score: number }) => `${m.name} (score: ${m.governance_score.toFixed(1)}%)`).join(', ')}

User request: "${request}"`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';

  if (text.trimStart().startsWith('OUT_OF_SCOPE:')) {
    return NextResponse.json({
      outOfScope: true,
      reason: text.replace(/^OUT_OF_SCOPE:\s*/i, '').trim(),
    });
  }

  return NextResponse.json({ outOfScope: false, content: text });
}
