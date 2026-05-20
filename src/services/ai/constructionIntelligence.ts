export type RiskBand = 'low' | 'medium' | 'high' | 'critical';

export interface MaterialInspectionHistoryItem {
  id?: string;
  materialType?: string;
  testType?: string;
  severity?: RiskBand;
  defects?: string[];
  contractor?: string;
  createdAt?: string;
  weather?: string;
  location?: string;
}

const DEFECT_PATTERNS = [
  { key: 'rust', pattern: /rust|corrosion|oxid/i, severity: 'high' as RiskBand, standard: 'IS 1786 reinforcement steel acceptance and storage checks' },
  { key: 'crack', pattern: /crack|fracture|split/i, severity: 'high' as RiskBand, standard: 'IS 456 concrete durability and workmanship review' },
  { key: 'honeycombing', pattern: /honeycomb|void|segregation/i, severity: 'critical' as RiskBand, standard: 'IS 456 concrete compaction and cover quality review' },
  { key: 'curing', pattern: /curing|dry surface|shrinkage/i, severity: 'medium' as RiskBand, standard: 'IS 456 curing and durability provisions' },
  { key: 'aggregate', pattern: /aggregate|gradation|silt|flaky|elongated/i, severity: 'medium' as RiskBand, standard: 'IS 383 aggregate quality and grading checks' },
  { key: 'bitumen', pattern: /bitumen|asphalt|dbm|bc|morth/i, severity: 'high' as RiskBand, standard: 'MORTH road work material and laying controls' },
];

const severityWeight: Record<RiskBand, number> = { low: 25, medium: 50, high: 75, critical: 95 };

export function classifyMaterialDefects(text: string) {
  const defects = DEFECT_PATTERNS.filter((item) => item.pattern.test(text));
  const score = defects.reduce((max, item) => Math.max(max, severityWeight[item.severity]), 20);
  const severity = score >= 90 ? 'critical' : score >= 70 ? 'high' : score >= 45 ? 'medium' : 'low';

  return {
    defects: defects.map((item) => item.key),
    standards: defects.map((item) => item.standard),
    severity: severity as RiskBand,
    score,
    confidence: Math.min(0.92, 0.55 + defects.length * 0.08),
  };
}

export function buildMaterialInspectionContext(input: {
  materialType?: string;
  testType?: string;
  remarks?: string;
  history?: MaterialInspectionHistoryItem[];
}) {
  const text = `${input.materialType || ''} ${input.testType || ''} ${input.remarks || ''}`;
  const current = classifyMaterialDefects(text);
  const history = input.history || [];
  const recurring = current.defects.filter((defect) => history.some((item) => item.defects?.includes(defect)));
  const contractorCounts = history.reduce<Record<string, number>>((acc, item) => {
    if (item.contractor) acc[item.contractor] = (acc[item.contractor] || 0) + 1;
    return acc;
  }, {});

  return {
    ...current,
    recurringDefects: recurring,
    duplicateInspectionRisk: history.some((item) => item.materialType === input.materialType && item.testType === input.testType),
    contractorQualityTrend: Object.entries(contractorCounts).sort((a, b) => b[1] - a[1]).slice(0, 3),
  };
}

export function buildMaterialEscalation(input: {
  materialType?: string;
  remarks?: string;
  contractor?: string;
  history?: MaterialInspectionHistoryItem[];
}) {
  const context = buildMaterialInspectionContext(input);
  const recurrenceProbability = Math.min(0.95, context.recurringDefects.length * 0.22 + context.contractorQualityTrend.length * 0.08 + 0.12);
  const environmentalFlags = /rain|monsoon|heat|cold|humidity|dust|flood/i.test(input.remarks || '')
    ? ['environmental exposure may affect curing/storage/test reliability']
    : [];
  const probableRootCause = context.defects.includes('honeycombing')
    ? 'poor compaction or congested reinforcement'
    : context.defects.includes('rust')
    ? 'improper steel storage or delayed placement'
    : context.defects.includes('curing')
    ? 'insufficient curing controls'
    : 'field workmanship or material handling variance';

  return {
    probableRootCause,
    urgency: context.severity === 'critical' ? 'immediate hold point' : context.severity === 'high' ? 'same-day engineer review' : 'routine QA follow-up',
    recurrenceProbability,
    rectificationSequence: [
      'isolate affected lot/location',
      'verify with site engineer and lab record',
      'capture dated photo evidence',
      'assign contractor corrective action',
      'reinspect before closure',
    ],
    probableProjectImpact: context.severity === 'critical' ? 'schedule and payment hold risk' : context.severity === 'high' ? 'rework and quality audit risk' : 'monitoring risk',
    environmentalFlags,
    trendGraphPrep: input.history?.map((item) => ({ date: item.createdAt, severity: item.severity, defects: item.defects?.length || 0 })) || [],
  };
}

export function scoreTpaRisk(fileNames: string[], extractedText = '') {
  const text = `${fileNames.join(' ')} ${extractedText}`.toLowerCase();
  const flags = [
    /fake|edited|scan-copy|copy/.test(text) && 'possible edited/fake report markers',
    /unsigned|no-sign|draft/.test(text) && 'signature missing or draft naming',
    /page\s*\d+\s*of\s*\d+/i.test(text) === false && 'page completeness needs OCR verification',
    /pass|fail|value|result/i.test(text) === false && 'test values not detected in available text',
  ].filter(Boolean) as string[];

  return {
    flags,
    riskScore: Math.min(100, 20 + flags.length * 20),
    pageCompletenessScore: flags.some((flag) => flag.includes('page completeness')) ? 45 : 80,
    ocrRecommended: true,
  };
}

export function scoreDieselAnomaly(input: Record<string, string>) {
  const expected = Number(input.expectedConsumption || input.expected_consumption || 0);
  const actual = Number(input.actualConsumption || input.actual_consumption || input.dieselUsed || input.diesel_used || 0);
  const variance = actual - expected;
  const flags: string[] = [];

  if (expected > 0 && Math.abs(variance) / expected > 0.25) flags.push('abnormal consumption variance');
  if (/night|late|midnight|after hours/i.test(input.remarks || '')) flags.push('unusual issue timing');
  if (/same receiver|repeat receiver|duplicate/i.test(input.remarks || '')) flags.push('repeated receiver pattern');
  if (Number(input.dieselReceived || input.diesel_received || 0) > 0 && actual === 0) flags.push('receipt without consumption entry');

  return {
    anomalyScore: Math.min(100, Math.round(Math.abs(variance) * 2 + flags.length * 22)),
    variance,
    flags,
    misuseRisk: flags.length >= 2 ? 'high' : flags.length === 1 ? 'medium' : 'low',
  };
}

export interface DieselLogLike {
  operator?: string;
  contractor?: string;
  receiver?: string;
  timestamp?: string;
  expected?: number;
  actual?: number;
}

export function analyzeDieselFraudCluster(logs: DieselLogLike[]) {
  const operatorCounts = new Map<string, number>();
  const contractorRisk = new Map<string, number>();
  const suspiciousTimeline: Array<{ timestamp?: string; reason: string; score: number }> = [];

  for (const log of logs) {
    if (log.operator) operatorCounts.set(log.operator, (operatorCounts.get(log.operator) || 0) + 1);
    const variance = Math.abs((log.actual || 0) - (log.expected || 0));
    const score = Math.min(100, variance * 2 + (/t(2[2-9]|0[0-5]):/i.test(log.timestamp || '') ? 20 : 0));
    if (log.contractor) contractorRisk.set(log.contractor, (contractorRisk.get(log.contractor) || 0) + score);
    if (score > 35) suspiciousTimeline.push({ timestamp: log.timestamp, reason: 'abnormal diesel variance or timing', score });
  }

  return {
    repeatedOperators: Array.from(operatorCounts.entries()).filter(([, count]) => count > 3),
    contractorRiskIndex: Array.from(contractorRisk.entries()).map(([contractor, score]) => ({ contractor, score: Math.round(score) })),
    suspiciousTimeline,
    heatLevel: suspiciousTimeline.length > 5 ? 'critical' : suspiciousTimeline.length > 2 ? 'high' : suspiciousTimeline.length > 0 ? 'medium' : 'low',
  };
}
