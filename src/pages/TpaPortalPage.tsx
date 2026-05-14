import React from 'react';
import { Card } from '../components/ui/Card';
import { ClipboardCheck } from 'lucide-react';

export const TpaPortalPage: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardCheck className="text-[#FF6B00]" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-white">TPA Portal</h1>
          <p className="text-gray-400">Provide Third Party Agency access for inspections, reports, and approval workflows.</p>
        </div>
      </div>

      <Card className="bg-[#1A1A1A] border-[#333] p-6">
        <h2 className="text-xl font-semibold text-white mb-3">TPA Access & Reports</h2>
        <p className="text-gray-300 mb-4">
          Share inspection reports, lab results and compliance documents securely with third-party authorities.
        </p>
      </Card>
    </div>
  );
};