import React from 'react';
import { Card } from '../components/ui/Card';
import { TrendingUp } from 'lucide-react';

export const BudgetProgressPage: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="text-[#FF6B00]" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-white">Budget vs Progress</h1>
          <p className="text-gray-400">Compare project spending against construction progress and milestone delivery.</p>
        </div>
      </div>

      <Card className="bg-[#1A1A1A] border-[#333] p-6">
        <h2 className="text-xl font-semibold text-white mb-3">Financial Health Snapshot</h2>
        <p className="text-gray-300 mb-4">
          Monitor budget consumption, forecast overruns and link financials to physical progress on site.
        </p>
      </Card>
    </div>
  );
};