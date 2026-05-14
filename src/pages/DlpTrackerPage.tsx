import React from 'react';
import { Card } from '../components/ui/Card';
import { FileX } from 'lucide-react';

export const DlpTrackerPage: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <FileX className="text-[#FF6B00]" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-white">DLP Tracker</h1>
          <p className="text-gray-400">Manage Defect Liability Period issues, completions and warranty handovers.</p>
        </div>
      </div>

      <Card className="bg-[#1A1A1A] border-[#333] p-6">
        <h2 className="text-xl font-semibold text-white mb-3">DLP Status</h2>
        <p className="text-gray-300 mb-4">
          Track all active DLP defects, assign owners, monitor resolution timelines and capture closure evidence.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-[#2D2D2D] p-4 bg-[#111117]">
            <p className="text-sm text-gray-400">Open Defects</p>
            <p className="text-white font-semibold text-lg">12</p>
          </div>
          <div className="rounded-xl border border-[#2D2D2D] p-4 bg-[#111117]">
            <p className="text-sm text-gray-400">In Progress</p>
            <p className="text-white font-semibold text-lg">5</p>
          </div>
          <div className="rounded-xl border border-[#2D2D2D] p-4 bg-[#111117]">
            <p className="text-sm text-gray-400">Closed</p>
            <p className="text-white font-semibold text-lg">23</p>
          </div>
        </div>
      </Card>
    </div>
  );
};