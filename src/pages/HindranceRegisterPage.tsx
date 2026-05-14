import React from 'react';
import { Card } from '../components/ui/Card';
import { FileText } from 'lucide-react';

export const HindranceRegisterPage: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="text-[#FF6B00]" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-white">Hindrance Register</h1>
          <p className="text-gray-400">Log delays, obstructions and site hindrances for contract claims and schedule recovery.</p>
        </div>
      </div>

      <Card className="bg-[#1A1A1A] border-[#333] p-6">
        <h2 className="text-xl font-semibold text-white mb-3">Hindrance Log</h2>
        <p className="text-gray-300 mb-4">
          Capture event details, responsible party, duration and impact so project teams can address delays quickly.
        </p>
      </Card>
    </div>
  );
};