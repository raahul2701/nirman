import React from 'react';
import { Card } from '../components/ui/Card';
import { CloudRain } from 'lucide-react';

export const WeatherLoggerPage: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <CloudRain className="text-[#FF6B00]" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-white">Weather Logger</h1>
          <p className="text-gray-400">Record weather conditions and analyze impact on construction schedules.</p>
        </div>
      </div>

      <Card className="bg-[#1A1A1A] border-[#333] p-6">
        <h2 className="text-xl font-semibold text-white mb-3">Latest Weather Entries</h2>
        <p className="text-gray-300 mb-4">
          Log rainfall, temperature, wind and site interruptions caused by weather events.
        </p>
        <div className="rounded-xl border border-[#2D2D2D] p-4 bg-[#111117]">
          <p className="text-sm text-gray-400">Today's summary</p>
          <p className="text-white font-semibold text-lg">Heavy rain, 45 mm</p>
          <p className="text-gray-400">Impacted work: earthworks, concrete pouring</p>
        </div>
      </Card>
    </div>
  );
};