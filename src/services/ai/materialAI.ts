import { invokeAiAnalyze, invokeEdgeFunction } from './aiService';
import { supabase } from '../../lib/supabase';

export interface MaterialTestAnalysis {
  authenticityVerified: boolean;
  verificationNotes: string;
  authenticityScore: number;
  qualityAssessment: 'excellent' | 'good' | 'acceptable' | 'poor' | 'rejected';
  complianceStatus: 'compliant' | 'non_compliant' | 'conditional';
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class MaterialAI {
  static async verifyMaterialTest(
    testId: string,
    testData: {
      materialType: string;
      testType: string;
      requiredValue: string;
      achievedValue: string;
      labName: string;
      testReportUrl?: string;
      labCertificateNumber?: string;
    }
  ): Promise<MaterialTestAnalysis> {
    try {
      const prompt = `You are an expert materials engineer and construction quality control specialist.

MATERIAL TEST VERIFICATION ANALYSIS:

Material Type: ${testData.materialType}
Test Type: ${testData.testType}
Required Specification: ${testData.requiredValue}
Achieved Result: ${testData.achievedValue}
Testing Laboratory: ${testData.labName}
Certificate Number: ${testData.labCertificateNumber || 'Not provided'}

VERIFICATION REQUIREMENTS:

1. **Authenticity Check**: Verify if results appear genuine and consistent
2. **Quality Assessment**: Evaluate material quality against standards
3. **Compliance Status**: Determine if results meet specifications
4. **Risk Assessment**: Identify construction risks from these results
5. **Recommendations**: Provide specific actions based on results
6. **Confidence Score**: Rate confidence in the verification

Consider industry standards (IS codes, BIS specifications) and typical test result patterns.

RESPONSE FORMAT: Return JSON with this exact structure:
{
  "authenticityVerified": boolean,
  "verificationNotes": "detailed notes on authenticity assessment",
  "authenticityScore": number (1-10, higher = more confident genuine),
  "qualityAssessment": "excellent|good|acceptable|poor|rejected",
  "complianceStatus": "compliant|non_compliant|conditional",
  "recommendations": ["specific recommendations for actions"],
  "riskLevel": "low|medium|high|critical"
}

Respond ONLY with valid JSON.`;

      // Call verify-material-test edge function
      const response = await invokeEdgeFunction<{ response: string }>('verify-material-test', {
        testId,
        materialType: testData.materialType,
        testType: testData.testType,
        requiredValue: testData.requiredValue,
        achievedValue: testData.achievedValue,
        labName: testData.labName,
        labCertificateNumber: testData.labCertificateNumber,
        reportUrl: testData.testReportUrl
      }, {
        retries: 2,
        timeoutMs: 20000,
        cacheTTLms: 5 * 60 * 1000,
        quotaKey: 'materialVerification',
        maxQuotaPerDay: 40,
        errorMessage: 'Material verification AI failed'
      });

      const analysis: MaterialTestAnalysis = JSON.parse(response.response);

      // Validate response structure
      if (typeof analysis.authenticityVerified !== 'boolean' ||
          !['excellent', 'good', 'acceptable', 'poor', 'rejected'].includes(analysis.qualityAssessment)) {
        throw new Error('Invalid AI response structure');
      }

      // Update the material test record with AI analysis
      await this.updateTestWithAnalysis(testId, analysis);

      return analysis;

    } catch (error) {
      console.error('Material AI verification error:', error);
      throw new Error('Failed to verify material test with AI');
    }
  }

  private static async updateTestWithAnalysis(
    testId: string,
    analysis: MaterialTestAnalysis
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('material_tests')
        .update({
          ai_report_verified: analysis.authenticityVerified,
          ai_verification_notes: analysis.verificationNotes,
          ai_authenticity_score: analysis.authenticityScore,
          ai_quality_assessment: analysis.qualityAssessment,
          ai_compliance_status: analysis.complianceStatus,
          ai_recommendations: analysis.recommendations,
          ai_risk_level: analysis.riskLevel,
          blocks_payment: analysis.complianceStatus === 'non_compliant' ||
                         analysis.riskLevel === 'critical',
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', testId);

      if (error) throw error;

    } catch (error) {
      console.error('Update test analysis error:', error);
      // Don't throw here as the analysis was successful
    }
  }

  static async analyzeTestTrends(
    projectId: string,
    materialType: string,
    days: number = 90
  ): Promise<{
    trend: 'improving' | 'stable' | 'declining';
    averageQuality: number;
    failureRate: number;
    recommendations: string[];
  }> {
    try {
      // Fetch recent tests for this material type
      const { data: tests, error } = await supabase
        .from('material_tests')
        .select('*')
        .eq('project_id', projectId)
        .eq('material_type', materialType)
        .gte('test_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('test_date', { ascending: false });

      if (error) throw error;

      if (!tests || tests.length === 0) {
        return {
          trend: 'stable',
          averageQuality: 0,
          failureRate: 0,
          recommendations: ['Insufficient data for trend analysis']
        };
      }

      const prompt = `Analyze material test trends for ${materialType} over ${days} days with ${tests.length} test records.

TEST DATA SUMMARY:
${tests.map((test: any, index: number) => `
Test ${index + 1}:
- Date: ${test.test_date}
- Result: ${test.result}
- Quality: ${test.ai_quality_assessment || 'Not assessed'}
- Compliance: ${test.ai_compliance_status || 'Not assessed'}
- Achieved: ${test.achieved_value}
- Required: ${test.required_value}
`).join('\n')}

Provide trend analysis in JSON format:
{
  "trend": "improving|stable|declining",
  "averageQuality": number (1-10 scale),
  "failureRate": number (0-100 percentage),
  "recommendations": ["actionable recommendations"]
}`;

      const response = await invokeAiAnalyze<{ response: string }>({
        prompt,
        message: 'Analyze material test trends',
        model: 'gemini-2.5-flash'
      }, {
        retries: 2,
        timeoutMs: 20000,
        cacheTTLms: 10 * 60 * 1000,
        quotaKey: 'materialTrends',
        maxQuotaPerDay: 30,
        errorMessage: 'Material trend analysis failed'
      });

      return JSON.parse(response.response);

    } catch (error) {
      console.error('Material trend analysis error:', error);
      return {
        trend: 'stable',
        averageQuality: 5,
        failureRate: 0,
        recommendations: ['Unable to analyze trends due to error']
      };
    }
  }

  static async getPendingVerifications(projectId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('material_tests')
        .select('*')
        .eq('project_id', projectId)
        .is('ai_report_verified', null)
        .order('test_date', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Get pending verifications error:', error);
      return [];
    }
  }
}
