// Example Material Tests Page with offline persistence
import React, { useState } from 'react';
import { useMaterialReports } from '../hooks/useDataServices';
import { materialReportsService } from '../services/data/materialReportsService';
import type { MaterialAIReport } from '../types/persistence';

interface MaterialTestsPageProps {
  projectId?: string;
}

export function MaterialTestsPageEnhanced({ projectId = 'project-1' }: MaterialTestsPageProps) {
  const { reports, loading } = useMaterialReports(projectId);
  const [newReport, setNewReport] = useState('');

  const handleCreateReport = async () => {
    if (!newReport.trim()) return;

    try {
      const report: MaterialAIReport = {
        project_id: projectId,
        report: { text: newReport },
        severity: 'medium',
        confidence: 0.8,
      };

      await materialReportsService.createReport(report);
      setNewReport('');
    } catch (error) {
      console.error('Failed to create report:', error);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-bold">Material Test Reports</h1>

      {/* Input section */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newReport}
          onChange={e => setNewReport(e.target.value)}
          placeholder="Add new test report..."
          className="flex-1 px-3 py-2 border rounded"
        />
        <button
          onClick={handleCreateReport}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Report
        </button>
      </div>

      {/* Reports list */}
      <div className="space-y-2">
        {loading ? (
          <p>Loading reports...</p>
        ) : reports.length === 0 ? (
          <p className="text-gray-500">No reports yet</p>
        ) : (
          reports.map((r: any) => (
            <div key={r.id} className="p-3 border rounded bg-gray-50">
              <p className="font-medium">{r.report?.text || 'Report'}</p>
              <p className="text-sm text-gray-600">Severity: {r.severity}</p>
              <p className="text-xs text-gray-500">Confidence: {r.confidence}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
