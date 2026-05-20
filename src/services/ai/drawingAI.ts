import { invokeEdgeFunction } from './aiService';
import { supabase } from '../../lib/supabase';

export interface DrawingComparison {
  drawingSpec: string;
  siteObservation: string;
  deviationFound: boolean;
  deviationPercentage: number;
  severity: 'compliant' | 'minor' | 'major' | 'critical';
  details: Array<{
    parameter: string;
    drawingValue: string;
    siteValue: string;
    deviation: string;
  }>;
  actionRequired: string;
  confidenceScore: number;
}

export class DrawingAI {
  static async compareDrawingToReality(
    projectId: string,
    comparisonData: {
      drawingUrl: string;
      sitePhotoUrl: string;
      drawingType: string;
      elementType: string;
      drawingSpec: string;
      siteObservation: string;
    }
  ): Promise<DrawingComparison> {
    try {
      const prompt = `You are an expert structural engineer and construction quality assurance specialist.

DRAWING vs REALITY COMPARISON ANALYSIS:

Project Element: ${comparisonData.elementType}
Drawing Specification: ${comparisonData.drawingSpec}
Site Observation: ${comparisonData.siteObservation}
Drawing Type: ${comparisonData.drawingType}

ANALYSIS REQUIREMENTS:

1. **Specification Comparison**: Compare site conditions against drawing specifications
2. **Deviation Detection**: Identify any deviations from approved drawings
3. **Severity Assessment**: Rate severity (compliant/minor/major/critical)
4. **Detailed Parameters**: Break down comparison by specific parameters
5. **Action Requirements**: Specify required corrective actions
6. **Confidence Score**: Rate confidence in visual analysis

RESPONSE FORMAT: Return JSON with this exact structure:
{
  "drawingSpec": "confirmed drawing specification",
  "siteObservation": "confirmed site observation",
  "deviationFound": boolean,
  "deviationPercentage": number (0-100),
  "severity": "compliant|minor|major|critical",
  "details": [
    {
      "parameter": "specific parameter name",
      "drawingValue": "value from drawing",
      "siteValue": "observed value on site",
      "deviation": "description of difference"
    }
  ],
  "actionRequired": "specific corrective actions needed",
  "confidenceScore": number (1-10, based on photo clarity and spec clarity)
}

Consider construction tolerances and industry standards. Respond ONLY with valid JSON.`;

      // Call analyze-drawing edge function
      const response = await invokeEdgeFunction<{ response: string }>('analyze-drawing', {
        projectId,
        drawingUrl: comparisonData.drawingUrl,
        sitePhotoUrl: comparisonData.sitePhotoUrl,
        drawingType: comparisonData.drawingType,
        elementType: comparisonData.elementType,
        drawingSpec: comparisonData.drawingSpec,
        siteObservation: comparisonData.siteObservation
      }, {
        retries: 2,
        timeoutMs: 20000,
        cacheTTLms: 5 * 60 * 1000,
        quotaKey: 'drawingAnalysis',
        maxQuotaPerDay: 40,
        errorMessage: 'Drawing analysis failed'
      });

      const comparison: DrawingComparison = JSON.parse(response.response);

      // Validate response structure
      if (typeof comparison.deviationFound !== 'boolean' ||
          !['compliant', 'minor', 'major', 'critical'].includes(comparison.severity)) {
        throw new Error('Invalid AI response structure');
      }

      // Save comparison to database
      await this.saveComparison(projectId, comparisonData, comparison);

      return comparison;

    } catch (error) {
      console.error('Drawing AI comparison error:', error);
      throw new Error('Failed to compare drawing with reality');
    }
  }

  private static async saveComparison(
    projectId: string,
    inputData: any,
    analysis: DrawingComparison
  ): Promise<void> {
    try {
      const comparisonRecord = {
        project_id: projectId,
        drawing_url: inputData.drawingUrl,
        site_photo_url: inputData.sitePhotoUrl,
        drawing_type: inputData.drawingType,
        element_type: inputData.elementType,
        drawing_specification: inputData.drawingSpec,
        site_observation: inputData.siteObservation,
        ai_comparison_result: JSON.stringify(analysis),
        ai_deviation_found: analysis.deviationFound,
        ai_deviation_percentage: analysis.deviationPercentage,
        ai_severity: analysis.severity,
        ai_details: analysis.details,
        action_required: analysis.actionRequired,
        status: analysis.deviationFound ? 'open' : 'compliant',
        compared_by: (await supabase.auth.getUser()).data.user?.id
      };

      const { error } = await supabase
        .from('drawing_comparisons')
        .insert([comparisonRecord]);

      if (error) throw error;

    } catch (error) {
      console.error('Save comparison error:', error);
      // Don't throw here as the analysis was successful
    }
  }

  static async getComparisonHistory(
    projectId: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('drawing_comparisons')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Get comparison history error:', error);
      return [];
    }
  }

  static async updateComparisonStatus(
    comparisonId: string,
    status: 'open' | 'acknowledged' | 'rectified' | 'accepted',
    notes?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('drawing_comparisons')
        .update({
          status,
          action_required: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', comparisonId);

      if (error) throw error;
    } catch (error) {
      console.error('Update comparison status error:', error);
      throw new Error('Failed to update comparison status');
    }
  }
}
