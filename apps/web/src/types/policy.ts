export type PolicySeverity = 'critical' | 'high' | 'medium' | 'low';

export type Policy = {
  id: string;
  name: string;
  description: string;
  severity: PolicySeverity;
  enabled: boolean;
  ruleConfig: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  violationCount: number;
};

export type CreatePolicyRequest = Omit<Policy, 'id' | 'createdAt' | 'updatedAt' | 'violationCount'>;
