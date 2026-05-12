export type AuditEvent = {
  id: string;
  tenant_id: string;
  event_time: string;
  event_type: string;
  model_id: string | null;
  model_name: string;
  agent_id: string;
  session_id: string;
  action: string;
  outcome: 'allowed' | 'blocked' | 'flagged';
  confidence_score: number;
  policy_violations: string[];
  metadata: Record<string, unknown>;
};

export type AuditLogFilters = {
  startDate?: string;
  endDate?: string;
  eventType?: string;
  outcome?: string;
  modelId?: string;
  modelName?: string;
  search?: string;
  page: number;
  pageSize: number;
};
