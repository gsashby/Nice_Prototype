import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { format } from 'date-fns';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const { query } = await req.json();

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    tools: [
      {
        name: 'set_filters',
        description: 'Set structured audit log filters derived from the user\'s natural language query',
        input_schema: {
          type: 'object' as const,
          properties: {
            outcome: {
              type: 'string',
              enum: ['allowed', 'blocked', 'flagged', 'auto-applied'],
              description: 'Filter by event outcome',
            },
            eventType: {
              type: 'string',
              enum: ['inference', 'policy_check', 'bias_scan', 'session_start', 'session_end', 'model_load'],
              description: 'Filter by event type',
            },
            startDate: {
              type: 'string',
              description: 'ISO 8601 datetime string — start of the time range',
            },
            endDate: {
              type: 'string',
              description: 'ISO 8601 datetime string — end of the time range',
            },
            search: {
              type: 'string',
              description: 'Free-text search matched against action, agent_id, and session_id fields',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Short human-readable labels for each applied filter, e.g. ["outcome: blocked", "period: last 7 days"]',
            },
          },
          required: ['tags'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'set_filters' },
    messages: [
      {
        role: 'user',
        content: `You are a filter parser for an AI governance audit log system. Convert the user's natural language query into structured filters.

Available outcomes: allowed, blocked, flagged, auto-applied
Available event types: inference, policy_check, bias_scan, session_start, session_end, model_load
Today's date: ${format(new Date(), 'yyyy-MM-dd')}

Rules:
- Set startDate/endDate for any time reference ("today", "yesterday", "this week", "last 30 days", etc.)
- Only set filters clearly implied by the query — do not over-interpret
- Multiple filters can apply simultaneously (e.g. outcome AND eventType AND time range)
- If no structured filter applies, set search to the original query text
- Tags must be short labels describing each filter applied

User query: "${query}"`,
      },
    ],
  });

  const toolUse = message.content.find((b) => b.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    return NextResponse.json({ error: 'No structured result from AI' }, { status: 500 });
  }

  const input = toolUse.input as {
    outcome?: string;
    eventType?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    tags: string[];
  };

  const filters = {
    page: 1,
    pageSize: 25,
    ...(input.outcome   && { outcome: input.outcome }),
    ...(input.eventType && { eventType: input.eventType }),
    ...(input.startDate && { startDate: input.startDate }),
    ...(input.endDate   && { endDate: input.endDate }),
    ...(input.search    && { search: input.search }),
  };

  return NextResponse.json({ filters, tags: input.tags, source: 'ai' });
}
