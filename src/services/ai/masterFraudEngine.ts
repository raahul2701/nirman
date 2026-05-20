import { invokeEdgeFunction } from './aiService';

export interface FraudEngineInput {
  siteId: string;
  dieselData?: Record<string, unknown>[];
  attendanceData?: Record<string, unknown>[];
  materialData?: Record<string, unknown>[];
  gateEntryData?: Record<string, unknown>[];
  toolUsageData?: Record<string, unknown>[];
  labourPayments?: Record<string, unknown>[];
}

export interface FraudRiskSummary {
  fraud_risk_score: number;
  estimated_losses: string;
  suspicious_patterns: string[];
  persons_involved: string[];
  recommended_actions: string[];
  summary: string;
}

export async function analyzeMasterFraud(input: FraudEngineInput): Promise<FraudRiskSummary> {
  return invokeEdgeFunction<FraudRiskSummary>('master-fraud-engine', input);
}
