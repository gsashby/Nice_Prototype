import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { format } from 'date-fns';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'set_filters',
    description:
      'Set structured audit log filters derived from the user\'s natural language query. ' +
      'Use for any request to retrieve, list, show, or find governance events. ' +
      'Optionally include a context message for analytical questions (e.g. "how many…") ' +
      'that explains what the displayed data answers.',
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
        modelName: {
          type: 'string',
          description: 'Partial model name to filter by (case-insensitive match), e.g. "Autopilot", "GPT-4"',
        },
        search: {
          type: 'string',
          description: 'Free-text search matched against action, agent_id, and session_id fields',
        },
        pageSize: {
          type: 'number',
          description: 'Max results to return (default 25, max 200)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Short human-readable labels for each applied filter, e.g. ["outcome: blocked", "period: last 7 days"]',
        },
        context: {
          type: 'string',
          description: 'One sentence explaining what the results show, for analytical queries like "how many…"',
        },
      },
      required: ['tags'],
    },
  },
  {
    name: 'answer_question',
    description:
      'Answer a conceptual or definitional question about AI governance that cannot be answered ' +
      'by filtering audit events. Use for: governance framework definitions, regulatory compliance ' +
      'explanations (GDPR, EU AI Act, ISO 42001, SOC 2), bias/fairness concepts, policy design advice, ' +
      'explanations of CXone AI modules, or interpretations of governance metrics.',
    input_schema: {
      type: 'object' as const,
      properties: {
        answer: {
          type: 'string',
          description: 'Clear, concise answer to the governance question (3–6 sentences)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Topic labels, e.g. ["topic: bias", "topic: EU AI Act"]',
        },
      },
      required: ['answer', 'tags'],
    },
  },
  {
    name: 'reject_query',
    description:
      'Reject a query that is entirely outside the scope of AI governance. Use ONLY when the ' +
      'question has no connection to AI models, audit logs, policy compliance, bias detection, ' +
      'governance scoring, or CXone AI features. Do not reject queries that are loosely related ' +
      'to governance — try to help instead.',
    input_schema: {
      type: 'object' as const,
      properties: {
        reason: {
          type: 'string',
          description: 'Brief, friendly explanation of why the query is outside the governance scope',
        },
      },
      required: ['reason'],
    },
  },
];

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const { query } = await req.json();

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    tools: TOOLS,
    tool_choice: { type: 'auto' },
    system:
      'You are the CXone AI Governance Query Explorer — an AI assistant that ONLY answers questions ' +
      'about AI governance. Your scope is strictly limited to: AI model audit events and logs, ' +
      'governance metrics and scores, policy compliance and violations, bias and fairness monitoring, ' +
      'AI regulatory frameworks (GDPR, EU AI Act, ISO 42001, SOC 2), and CXone AI modules ' +
      '(Autopilot, Copilot, Mpower). ' +
      'For any query unrelated to AI governance (cooking, weather, coding unrelated to governance, sports, etc.), ' +
      'use reject_query. ' +
      'For queries asking to show, list, find, or retrieve events: use set_filters. ' +
      'For conceptual questions about governance, compliance, or AI safety: use answer_question. ' +
      'For count/analytical questions ("how many…", "which model has the most…"): use set_filters with ' +
      'appropriate filters and a context message explaining what the data shows.',
    messages: [
      {
        role: 'user',
        content:
          `Today's date: ${format(new Date(), 'yyyy-MM-dd')}\n\n` +
          `Available outcomes: allowed, blocked, flagged, auto-applied\n` +
          `Available event types: inference, policy_check, bias_scan, session_start, session_end, model_load\n\n` +
          `User query: "${query}"`,
      },
    ],
  });

  const toolUse = message.content.find((b) => b.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    return NextResponse.json({ error: 'No structured result from AI' }, { status: 500 });
  }

  if (toolUse.name === 'reject_query') {
    const input = toolUse.input as { reason: string };
    return NextResponse.json(
      { error: 'off_topic', message: input.reason },
      { status: 400 },
    );
  }

  if (toolUse.name === 'answer_question') {
    const input = toolUse.input as { answer: string; tags: string[] };
    return NextResponse.json({
      kind: 'question',
      answer: input.answer,
      tags: input.tags,
      filters: { page: 1, pageSize: 25 },
      source: 'ai',
    });
  }

  // set_filters
  const input = toolUse.input as {
    outcome?: string;
    eventType?: string;
    startDate?: string;
    endDate?: string;
    modelName?: string;
    search?: string;
    pageSize?: number;
    tags: string[];
    context?: string;
  };

  const filters = {
    page: 1,
    pageSize: input.pageSize ?? 25,
    ...(input.outcome    && { outcome: input.outcome }),
    ...(input.eventType  && { eventType: input.eventType }),
    ...(input.startDate  && { startDate: input.startDate }),
    ...(input.endDate    && { endDate: input.endDate }),
    ...(input.modelName  && { modelName: input.modelName }),
    ...(input.search     && { search: input.search }),
  };

  return NextResponse.json({
    kind: 'filter',
    filters,
    tags: input.tags,
    context: input.context,
    source: 'ai',
  });
}
