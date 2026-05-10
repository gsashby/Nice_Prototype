import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const { recommendation, dashboardContext } = await req.json();

  const prompt = `You are an AI governance advisor for NICE CXone Mpower, an enterprise AI platform used in contact centres. A governance administrator is reviewing the following recommended action item on their dashboard.

Recommendation:
- Category: ${recommendation.category}
- Priority: ${recommendation.priority.toUpperCase()}
- Issue: ${recommendation.title}
- Module: ${recommendation.module}
- Detail: ${recommendation.detail}

Current dashboard context:
- Governance score: ${dashboardContext?.governance_score ?? 'N/A'}
- Policy violations (7d): ${dashboardContext?.policy_violations_24h ?? 'N/A'}
- Active alerts: ${dashboardContext?.alertCount ?? 'N/A'}

Your response MUST be valid JSON only — no markdown, no prose outside the JSON object.

Return exactly this structure:
{
  "analysis": "2–3 sentence analysis of why this issue matters, the specific risks it poses to the organisation, and any urgency signals from the current dashboard context.",
  "actions": [
    "Action step 1 — specific, concrete, imperative",
    "Action step 2 — specific, concrete, imperative",
    "Action step 3 — specific, concrete, imperative",
    "Action step 4 — specific, concrete, imperative",
    "Action step 5 — specific, concrete, imperative"
  ]
}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0].type === 'text' ? message.content[0].text : '{}';

  try {
    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch {
    // If Claude didn't return clean JSON, return the raw text as analysis
    return NextResponse.json({
      analysis: raw,
      actions: [],
    });
  }
}
