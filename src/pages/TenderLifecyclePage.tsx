import React from 'react';
import { Card } from '../components/ui/Card';
import { FileStack } from 'lucide-react';

export const TenderLifecyclePage: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <FileStack className="text-[#FF6B00]" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-white">Tender Lifecycle</h1>
          <p className="text-gray-400">Monitor tender issuance, evaluation, award and contract finalization stages.</p>
        </div>
      </div>

      <Card className="bg-[#1A1A1A] border-[#333] p-6">
        <h2 className="text-xl font-semibold text-white mb-3">Tender Stage Summary</h2>
        <p className="text-gray-300 mb-4">
          Use this page to track every stage of the tender process from RFQ issuance to contract award,
          including technical evaluation, financial scoring, approval, and bidder management.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-[#2D2D2D] p-4 bg-[#111117]">
            <p className="text-sm text-gray-400">Current Stage</p>
            <p className="text-white font-semibold text-lg">Bid Evaluation</p>
          </div>
          <div className="rounded-xl border border-[#2D2D2D] p-4 bg-[#111117]">
            <p className="text-sm text-gray-400">Next Review</p>
            <p className="text-white font-semibold text-lg">Technical Committee</p>
          </div>
          <div className="rounded-xl border border-[#2D2D2D] p-4 bg-[#111117]">
            <p className="text-sm text-gray-400">Award Due</p>
            <p className="text-white font-semibold text-lg">3 days</p>
          </div>
        </div>
      </Card>

      <Card className="bg-[#1A1A1A] border-[#333] p-6">
        <h3 className="text-lg font-semibold text-white mb-3">Key Actions</h3>
        <ul className="space-y-2 text-gray-300 list-disc list-inside">
          <li>Upload tender documents and evaluation reports.</li>
          <li>Track bidder scoring, deviations and approval comments.</li>
          <li>Record award decisions and contract execution status.</li>
        </ul>
      </Card>
    </div>
  );
};