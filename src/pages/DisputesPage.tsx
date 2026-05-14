import React from 'react';
import { Card } from '../components/ui/Card';
import { Scale } from 'lucide-react';

export const DisputesPage: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Scale className="text-[#FF6B00]" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-white">Dispute Resolution</h1>
          <p className="text-gray-400">Manage contract disputes, claims, and AI-assisted resolution guidance.</p>
        </div>
      </div>

      <Card className="bg-[#1A1A1A] border-[#333] p-6">
        <h2 className="text-xl font-semibold text-white mb-3">Dispute Workflow</h2>
        <p className="text-gray-300 mb-4">
          Track dispute status, submit evidence and reference contract clauses for fair and compliant adjudication.
        </p>
      </Card>
    </div>
  );
};