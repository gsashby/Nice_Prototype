export type GovernanceMetrics = {
  governance_score: number;
  active_policies: number;
  policy_violations_24h: number;
  models_monitored: number;
  trend: ScoreDataPoint[];
};

export type ScoreDataPoint = {
  date: string;
  score: number;
};

export type ModelHealth = {
  id: string;
  name: string;
  type: string;
  status: string;
  governance_score: number;
  bias_score: number;
  confidence_avg: number;
  total_inferences: number;
  violation_count: number;
};
