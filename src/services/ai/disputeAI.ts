import { invokeEdgeFunction, invokeAiAnalyze } from './aiService';

export interface DisputeAnalysis {
  contractAnalysis: string;
  validClaimAmount: number;
  invalidClaimAmount: number;
  reasoning: string;
  contractReferences: Array<{
    clause: string;
    page: number;
    textExcerpt: string;
  }>;
  recommendation: string;
  confidenceScore: number;
}

export class DisputeAI {
  static async analyzeDispute(
    disputeId: string,
    disputeData: {
      type: string;
      description: string;
      claimAmount: number;
      contractClauses?: string[];
      supportingDocs?: string[];
    }
  ): Promise<DisputeAnalysis> {
    try {
      const prompt = `You are an expert construction law consultant and quantity surveyor specializing in contract disputes.

DISPUTE ANALYSIS REQUEST:

Dispute Type: ${disputeData.type}
Claim Amount: ₹${disputeData.claimAmount?.toLocaleString() || 'Not specified'}
Description: ${disputeData.description}

Contract Context: ${disputeData.contractClauses?.join('\n') || 'Standard construction contract terms apply'}

Supporting Documents: ${disputeData.supportingDocs?.join(', ') || 'None provided'}

ANALYSIS REQUIREMENTS:

1. **Contract Analysis**: Review if the claim is valid under contract terms
2. **Amount Validation**: Determine valid vs invalid portions of the claim
3. **Reasoning**: Provide detailed legal and technical reasoning
4. **Contract References**: Cite specific clauses, pages, and text excerpts
5. **Recommendation**: Suggest resolution approach (settlement, arbitration, etc.)
6. **Confidence Score**: Rate confidence in analysis (1-10)

RESPONSE FORMAT: Return JSON with this exact structure:
{
  "contractAnalysis": "detailed analysis of contract compliance",
  "validClaimAmount": number (valid portion in rupees),
  "invalidClaimAmount": number (invalid portion in rupees),
  "reasoning": "step-by-step reasoning for the decision",
  "contractReferences": [
    {
      "clause": "clause number/title",
      "page": number,
      "textExcerpt": "relevant text excerpt"
    }
  ],
  "recommendation": "recommended resolution approach",
  "confidenceScore": number (1-10)
}

Respond ONLY with valid JSON.`;
      void prompt;

      // Call analyze-dispute edge function
      const response = await invokeEdgeFunction<{ response: string }>('analyze-dispute', {
        disputeId,
        agreementText: disputeData.contractClauses?.join('\n') || 'Standard contract terms apply',
        boq: disputeData.contractClauses?.join('\n') || '',
        disputeDescription: disputeData.description,
        claimAmount: disputeData.claimAmount,
        contractClauses: disputeData.contractClauses,
      }, {
        retries: 2,
        timeoutMs: 25000,
        cacheTTLms: 5 * 60 * 1000,
        quotaKey: 'disputeAnalysis',
        maxQuotaPerDay: 30,
        errorMessage: 'Dispute AI analysis failed'
      });

      const analysis: DisputeAnalysis = JSON.parse(response.response);

      // Validate the response structure
      if (!analysis.contractAnalysis || typeof analysis.validClaimAmount !== 'number') {
        throw new Error('Invalid AI response structure');
      }

      return analysis;

    } catch (error) {
      console.error('Dispute AI analysis error:', error);
      throw new Error('Failed to analyze dispute with AI');
    }
  }

  static async generateDisputeReport(
    disputeId: string,
    analysis: DisputeAnalysis
  ): Promise<string> {
    try {
      const reportPrompt = `Generate a professional dispute resolution report based on the following analysis:

${JSON.stringify(analysis, null, 2)}

Format as a formal report with:
1. Executive Summary
2. Contract Analysis
3. Claim Validation
4. Recommendations
5. Conclusion

Use formal language suitable for submission to arbitration panel.`;

      const response = await invokeAiAnalyze<{ response: string }>({
        prompt: reportPrompt,
        message: 'Generate dispute resolution report',
        model: 'gemini-2.5-flash'
      }, {
        retries: 1,
        timeoutMs: 20000,
        cacheTTLms: 5 * 60 * 1000,
        quotaKey: 'disputeReport',
        maxQuotaPerDay: 30,
        errorMessage: 'Dispute report generation failed'
      });

      return response.response;

    } catch (error) {
      console.error('Dispute report generation error:', error);
      throw new Error('Failed to generate dispute report');
    }
  }
}
