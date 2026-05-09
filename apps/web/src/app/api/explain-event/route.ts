import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const { event, sessionEvents } = await req.json();

  const timeline = (sessionEvents ?? [])
    .map((e: { event_time: string; event_type: string; outcome: string; confidence_score: number; action: string; policy_violations: string[] }) =>
      `  ${e.event_time} | ${e.event_type} | outcome: ${e.outcome} | confidence: ${(e.confidence_score * 100).toFixed(1)}% | action: ${e.action}${e.policy_violations?.length ? ` | violations: ${e.policy_violations.join(', ')}` : ''}`
    )
    .join('\n');

  const prompt = `You are an AI governance analyst explaining a specific audit event to a compliance officer. Be clear, specific, and concise. Use plain English — no markdown headers or bullet points, just 2–3 focused paragraphs.

Focus event:
- ID: ${event.id}
- Time: ${event.event_time}
- Type: ${event.event_type}
- Model: ${event.model_name}
- Outcome: ${event.outcome}
- Confidence: ${(event.confidence_score * 100).toFixed(1)}%
- Action: ${event.action}
- Policy violations: ${event.policy_violations?.join(', ') || 'none'}
- Metadata: ${JSON.stringify(event.metadata ?? {})}

Full session timeline (${sessionEvents?.length ?? 0} events, this event marked with →):
${timeline || 'No other events in this session'}

Explain: (1) what likely triggered this event and why it was ${event.outcome}, (2) what the session context tells us about the causal chain, and (3) whether this represents a genuine risk or expected behaviour. Be specific about the confidence score and any policy violations.`;

  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  return NextResponse.json({ explanation: text });
}
