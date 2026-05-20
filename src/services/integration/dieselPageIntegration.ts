// Integration layer for DieselIssue page - adds persistence without rewriting UI
import type { DieselIssueLog } from '../../types/persistence';
import { dieselLogsService } from '../data/dieselLogsService';
import { useAuth } from '../../contexts/useAuth';
import { useCallback } from 'react';

export function useDieselLogPersistence(projectId: string) {
  const { user } = useAuth();

  const saveLog = useCallback(
    async (logData: {
      machine_name: string;
      machine_type: string;
      machine_id?: string;
      operator_name?: string;
      opening_diesel: number;
      diesel_received: number;
      diesel_used: number;
      closing_diesel: number;
      running_hours: number;
      expected_consumption: number;
      actual_consumption: number;
      remarks?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const anomalyScore = Math.abs(logData.actual_consumption - logData.expected_consumption) > 10 ? 'high' : 'low';

      const log: DieselIssueLog = {
        project_id: projectId,
        vehicle_id: logData.machine_id ? crypto.randomUUID() : undefined,
        log: {
          machine_name: logData.machine_name,
          machine_type: logData.machine_type,
          machine_id: logData.machine_id,
          operator_name: logData.operator_name,
          opening_diesel: logData.opening_diesel,
          diesel_received: logData.diesel_received,
          diesel_used: logData.diesel_used,
          closing_diesel: logData.closing_diesel,
          running_hours: logData.running_hours,
          remarks: logData.remarks,
          anomaly_score: anomalyScore,
        },
        consumption: logData.actual_consumption,
        created_by: user.id,
      };

      return dieselLogsService.createLog(log);
    },
    [projectId, user]
  );

  return { saveLog };
}
