import { invokeEdgeFunction } from './claudeService';

export interface DieselRuntimeLog {
  machine_name: string;
  machine_type: string;
  operator_name: string;
  start_time: string;
  stop_time: string;
  idle_hours: number;
  runtime_hours: number;
  diesel_used: number;
  expected_diesel: number;
  gps_path: Record<string, unknown>;
}

export interface DieselFraudResult {
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  estimated_loss: string;
  fraud_probability: number;
  red_flags: string[];
  recommendations: string[];
}

export async function analyzeDieselFraud(runtimeLogs: DieselRuntimeLog[]): Promise<DieselFraudResult> {
  const dieselFraudPrompt = `
You are an expert construction
diesel fraud detection AI.

Analyze:

${JSON.stringify(runtimeLogs)}

Detect:

1. Excess diesel usage
2. Fake machine runtime
3. Fuel theft possibility
4. Operator manipulation
5. Abnormal idle patterns
6. Site-level fraud risk

Return JSON:
{
  "risk_level":"",
  "estimated_loss":"",
  "fraud_probability":0,
  "red_flags":[],
  "recommendations":[]
}
`;

  return invokeEdgeFunction<DieselFraudResult>('diesel-fraud', { prompt: dieselFraudPrompt, runtimeLogs });
}
