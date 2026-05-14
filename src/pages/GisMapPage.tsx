import React from 'react';
import { Card } from '../components/ui/Card';
import { MapPin } from 'lucide-react';

export const GisMapPage: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <MapPin className="text-[#FF6B00]" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-white">GIS Map</h1>
          <p className="text-gray-400">Visualize project geolocation, site boundaries, and progress markers on a map.</p>
        </div>
      </div>

      <Card className="bg-[#1A1A1A] border-[#333] p-6">
        <h2 className="text-xl font-semibold text-white mb-3">Project Geo Overview</h2>
        <p className="text-gray-300 mb-4">
          Display site coordinates, planning zones, asset placements and real-time location metadata for project monitoring.
        </p>
      </Card>
    </div>
  );
};