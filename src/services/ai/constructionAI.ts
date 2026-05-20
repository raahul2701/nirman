import { runAiCompletion, runAiVision } from './geminiClient';
import { buildMaterialInspectionContext, scoreDieselAnomaly, scoreTpaRisk, type MaterialInspectionHistoryItem } from './constructionIntelligence';

export interface MaterialInspectionInput {
  materialType?: string;
  testType?: string;
  remarks?: string;
  mediaDataUrls: string[];
  signal?: AbortSignal;
  history?: MaterialInspectionHistoryItem[];
}

export async function analyzeMaterialInspection(input: MaterialInspectionInput) {
  const intelligence = buildMaterialInspectionContext(input);
  const prompt = `You are a senior construction QA/QC engineer. Analyze the uploaded site material media.

Return concise field-ready observations and this exact structure:
- AI Summary Cards: severity, confidence, likely defect class, immediate action
- Observation Timeline Note
- IS/MORTH Context Mapping
- Defect Classification
- Severity Score Normalization
- Recommended Corrective Action
- Recurring Defect / Duplicate Inspection Risk
- Contractor Quality Trend

Check explicitly for rust, cracks, honeycombing, curing issues, shuttering defects, safety violations, and aggregate quality. Do not invent exact clause numbers; use probable standard families and field-verification language.

Known form context:
Material: ${input.materialType || 'not specified'}
Test: ${input.testType || 'not specified'}
Remarks: ${input.remarks || 'none'}

Pre-analysis signals:
${JSON.stringify(intelligence, null, 2)}`;

  if (input.mediaDataUrls.length > 0) {
    return runAiVision(prompt, input.mediaDataUrls, input.signal);
  }

  return runAiCompletion({
    signal: input.signal,
    messages: [{ role: 'user', content: prompt }],
  });
}

export async function analyzeBudgetProgress(input: Record<string, string>) {
  return runAiCompletion({
    maxTokens: 1200,
    messages: [
      {
        role: 'user',
        content: `Act as a construction project controls engineer. Analyze this project budget/progress data and generate expected vs actual progress, billing efficiency, burn rate, delay causes, underperformance signals, cash-flow risk, schedule slippage, productivity trend, risk score, corrective actions, and project health summary.\n\n${JSON.stringify(input, null, 2)}`,
      },
    ],
  });
}

export async function summarizeTpaDocument(fileNames: string[]) {
  const risk = scoreTpaRisk(fileNames);
  return runAiCompletion({
    maxTokens: 1000,
    messages: [
      {
        role: 'user',
        content: `Act as a TPA compliance reviewer. Summarize files for compliance, fake-report heuristics, signature-region detection prep, inconsistent value detection, page completeness scoring, OCR extraction needs, AI risk score, and action items.

Files: ${fileNames.join(', ')}
Pre-analysis risk signals:
${JSON.stringify(risk, null, 2)}`,
      },
    ],
  });
}

export async function analyzeHindranceImpact(input: Record<string, string>) {
  return runAiCompletion({
    messages: [
      {
        role: 'user',
        content: `Analyze this construction hindrance and draft delay impact, likely responsibility, mitigation steps, and engineer remarks.\n\n${JSON.stringify(input, null, 2)}`,
      },
    ],
  });
}

export async function analyzeDieselAnomalies(input: Record<string, string>) {
  const score = scoreDieselAnomaly(input);
  return runAiCompletion({
    maxTokens: 1000,
    messages: [
      {
        role: 'user',
        content: `Analyze this diesel issue record for anomaly scoring, repeated receiver detection, unusual issue timing, abnormal daily consumption, contractor misuse heuristics, machinery inefficiency, theft/misuse risk, and corrective actions.

Pre-analysis score:
${JSON.stringify(score, null, 2)}

Record:
${JSON.stringify(input, null, 2)}`,
      },
    ],
  });
}
