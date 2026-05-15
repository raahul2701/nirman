import { invokeAiAnalyze, invokeEdgeFunction } from './claudeService';
import { supabase } from '../../lib/supabase';

export interface ExtensionAnalysis {
  daysGranted: number;
  reasonAccepted: boolean;
  justification: string;
  conditions: string[];
  newCompletionDate: string;
  riskAssessment: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  approvalConfidence: number;
}

export class ExtensionAI {
  static async analyzeExtensionRequest(
    projectId: string,
    extensionData: {
      daysRequested: number;
      reason: string;
      supportingFacts: {
        rainDays: number;
        floodDays: number;
        otherHindranceDays: number;
        totalHindranceDays: number;
      };
      contractCompletionDate: string;
      currentProgress: number;
      hindranceRecords?: Array<{
        date: string;
        type: string;
        description: string;
        daysLost: number;
      }>;
    }
  ): Promise<ExtensionAnalysis> {
    try {
      const prompt = `You are an expert construction contracts manager and delay analysis specialist.

EXTENSION REQUEST ANALYSIS:

Project Completion: ${extensionData.contractCompletionDate}
Current Progress: ${extensionData.currentProgress}%
Days Requested: ${extensionData.daysRequested}

Hindrance Summary:
- Rain Days: ${extensionData.supportingFacts.rainDays}
- Flood Days: ${extensionData.supportingFacts.floodDays}
- Other Hindrance Days: ${extensionData.supportingFacts.otherHindranceDays}
- Total Hindrance Days: ${extensionData.supportingFacts.totalHindranceDays}

Reason Provided: ${extensionData.reason}

Hindrance Records:
${extensionData.hindranceRecords?.map(h => `- ${h.date}: ${h.type} - ${h.description} (${h.daysLost} days lost)`).join('\n') || 'None provided'}

ANALYSIS REQUIREMENTS:

1. **Entitlement Assessment**: Determine if extension is justified under contract terms
2. **Days Calculation**: Calculate appropriate extension period
3. **Reason Evaluation**: Assess validity of reasons provided
4. **Conditions**: Specify any conditions for approval
5. **Risk Assessment**: Evaluate project delay risks
6. **Recommendations**: Provide approval recommendations

Consider force majeure clauses, weather conditions, and standard construction contracts.

RESPONSE FORMAT: Return JSON with this exact structure:
{
  "daysGranted": number (recommended extension days),
  "reasonAccepted": boolean (is the reason valid),
  "justification": "detailed justification for decision",
  "conditions": ["conditions for approval"],
  "newCompletionDate": "YYYY-MM-DD",
  "riskAssessment": "low|medium|high|critical",
  "recommendations": ["specific recommendations"],
  "approvalConfidence": number (1-10, confidence in recommendation)
}

Respond ONLY with valid JSON.`;

      // Call ai-analyze edge function
      const analysisResponse = await invokeAiAnalyze<{ response: string }>({
        prompt,
        message: JSON.stringify(extensionData),
        model: 'claude-3-sonnet-20240229'
      }, {
        retries: 2,
        timeoutMs: 25000,
        cacheTTLms: 5 * 60 * 1000,
        quotaKey: 'extensionAnalysis',
        maxQuotaPerDay: 40,
        errorMessage: 'Extension AI analysis failed'
      });

      const analysis: ExtensionAnalysis = JSON.parse(analysisResponse.response);

      // Validate response structure
      if (typeof analysis.daysGranted !== 'number' ||
          typeof analysis.reasonAccepted !== 'boolean') {
        throw new Error('Invalid AI response structure');
      }

      return analysis;

    } catch (error) {
      console.error('Extension AI analysis error:', error);
      throw new Error('Failed to analyze extension request');
    }
  }

  static async generateExtensionLetter(
    projectId: string,
    analysis: ExtensionAnalysis,
    requestData: any
  ): Promise<string> {
    try {
      const letterPrompt = `Generate a formal extension of time letter based on the following analysis:

ANALYSIS RESULTS:
${JSON.stringify(analysis, null, 2)}

REQUEST DETAILS:
${JSON.stringify(requestData, null, 2)}

Generate a professional letter that includes:
1. Reference to original contract
2. Summary of hindrance events
3. Analysis of entitlement
4. Extension granted
5. New completion date
6. Conditions (if any)
7. Formal closing

Format as a proper business letter suitable for official records.`;

      const response = await invokeEdgeFunction<{ letter: string }>('generate-extension-letter', {
        projectId,
        extensionRequest: requestData,
      }, {
        retries: 2,
        timeoutMs: 20000,
        quotaKey: 'extensionLetter',
        maxQuotaPerDay: 30,
        errorMessage: 'Extension letter generation failed'
      });

      return response.letter;

    } catch (error) {
      console.error('Extension letter generation error:', error);
      throw new Error('Failed to generate extension letter');
    }
  }

  static async saveExtensionApplication(
    projectId: string,
    requestData: any,
    analysis: ExtensionAnalysis,
    generatedLetter: string
  ): Promise<string> {
    try {
      const applicationRecord = {
        project_id: projectId,
        application_date: new Date().toISOString().split('T')[0],
        days_requested: requestData.daysRequested,
        rain_days: requestData.supportingFacts.rainDays,
        flood_days: requestData.supportingFacts.floodDays,
        other_hindrance_days: requestData.supportingFacts.otherHindranceDays,
        total_hindrance_days: requestData.supportingFacts.totalHindranceDays,
        weather_report_url: requestData.weatherReportUrl,
        hindrance_register_url: requestData.hindranceRegisterUrl,
        supporting_docs: requestData.supportingDocs,
        ai_application_letter: generatedLetter,
        application_pdf_url: null, // Will be set after PDF generation
        status: 'draft',
        submitted_by: (await supabase.auth.getUser()).data.user?.id,
        // AI analysis results
        ai_days_granted: analysis.daysGranted,
        ai_reason_accepted: analysis.reasonAccepted,
        ai_justification: analysis.justification,
        ai_conditions: analysis.conditions,
        ai_new_completion_date: analysis.newCompletionDate,
        ai_risk_assessment: analysis.riskAssessment,
        ai_recommendations: analysis.recommendations,
        ai_approval_confidence: analysis.approvalConfidence
      };

      const { data, error } = await supabase
        .from('extension_applications')
        .insert([applicationRecord])
        .select()
        .single();

      if (error) throw error;

      return data.id;

    } catch (error) {
      console.error('Save extension application error:', error);
      throw new Error('Failed to save extension application');
    }
  }

  static async getExtensionHistory(
    projectId: string
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('extension_applications')
        .select('*')
        .eq('project_id', projectId)
        .order('application_date', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Get extension history error:', error);
      return [];
    }
  }

  static async updateExtensionStatus(
    applicationId: string,
    status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'partial',
    approvedDays?: number,
    authorityResponse?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        approved_days: approvedDays,
        authority_response: authorityResponse,
        updated_at: new Date().toISOString()
      };

      if (status === 'approved' && approvedDays) {
        const application = await supabase
          .from('extension_applications')
          .select('application_date')
          .eq('id', applicationId)
          .single();

        if (application.data) {
          const newDate = new Date(application.data.application_date);
          newDate.setDate(newDate.getDate() + approvedDays);
          updateData.new_completion_date = newDate.toISOString().split('T')[0];
        }
      }

      const { error } = await supabase
        .from('extension_applications')
        .update(updateData)
        .eq('id', applicationId);

      if (error) throw error;

    } catch (error) {
      console.error('Update extension status error:', error);
      throw new Error('Failed to update extension status');
    }
  }
}