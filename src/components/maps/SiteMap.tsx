import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { SiteGISData } from '../../types';

interface SiteMapProps {
  sites: SiteGISData[];
  center?: [number, number];
  zoom?: number;
}

const statusColor: Record<string, string> = {
  critical: '#ef4444',
  delayed: '#f59e0b',
  normal: '#10b981',
  completed: '#3b82f6',
};

export function SiteMap({ sites, center = [25.5941, 85.1376], zoom = 8 }: SiteMapProps) {
  return (
    <div className="w-full h-[520px] rounded-3xl overflow-hidden border border-[#22222A] bg-[#111118]">
      <MapContainer center={center} zoom={zoom} className="w-full h-full" scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {sites.map((site) => (
          <CircleMarker
            key={site.id}
            center={[Number(site.latitude), Number(site.longitude)]}
            pathOptions={{ color: statusColor[site.health_status] || '#0ea5e9', fillOpacity: 0.8 }}
            radius={12}
          >
            <Popup>
              <div className="text-sm text-black">
                <p className="font-semibold">Site ID: {site.site_id}</p>
                <p>Health: {site.health_status}</p>
                <p>Area: {site.site_area_sqm?.toFixed(0)} m²</p>
                <p>Updated: {new Date(site.last_updated).toLocaleDateString()}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
