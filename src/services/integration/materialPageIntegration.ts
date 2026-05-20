// Integration layer for MaterialTestsPage - adds persistence without rewriting UI
import type { MaterialAIReport } from '../../types/persistence';
import { materialReportsService } from '../data/materialReportsService';
import { useAuth } from '../../contexts/useAuth';
import { useCallback } from 'react';

export function useMaterialTestPersistence(projectId: string) {
  const { user } = useAuth();

  const saveTestReport = useCallback(
    async (testData: {
      material_type: string;
      test_type: string;
      sample_id: string;
      test_date: string;
      tested_by: string;
      test_results?: Record<string, any>;
      status: string;
      remarks?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const report: MaterialAIReport = {
        project_id: projectId,
        report: testData,
        severity: testData.status === 'failed' ? 'high' : 'medium',
        confidence: 0.85,
        created_by: user.id,
      };

      return materialReportsService.createReport(report);
    },
    [projectId, user]
  );

  return { saveTestReport };
}
