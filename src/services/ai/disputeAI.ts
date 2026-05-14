import { supabase } from '../../lib/supabase';

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

      // Call analyze-dispute edge function
      const { data, error } = await supabase.functions.invoke('analyze-dispute', {
        body: {
          disputeId,
          agreementText: disputeData.contractClauses?.join('\n') || 'Standard contract terms apply',
          boq: disputeData.contractClauses?.join('\n') || '',
          disputeDescription: disputeData.description,
          claimAmount: disputeData.claimAmount,
          contractClauses: disputeData.contractClauses
        }
      });

      if (error) throw error;

      const analysis: DisputeAnalysis = JSON.parse(data.response);

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

      const { data, error } = await supabase.functions.invoke('ai-analyze', {
        body: {
          prompt: reportPrompt,
          message: 'Generate dispute resolution report',
          model: 'claude-3-sonnet-20240229'
        }
      });

      if (error) throw error;

      return data.response;

    } catch (error) {
      console.error('Dispute report generation error:', error);
      throw new Error('Failed to generate dispute report');
    }
  }
}