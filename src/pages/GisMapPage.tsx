import React, { useMemo, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Camera, Crosshair, MapPin, Navigation, Plus, Search } from 'lucide-react';
import { getMapProviderLabel, getStaticMapUrl, MapPoint, reverseGeocode } from '../services/maps/mapProvider';
import { useGisPins } from '../hooks/useDataServices';
import { gisPinsService } from '../services/data/gisPinsService';
import { OfflineSyncIndicator } from '../components/offline/OfflineSyncIndicator';
import { useAuth } from '../contexts/useAuth';

const DEFAULT_PROJECT_ID = 'project-1';

type GeoTag = MapPoint & {
  id: string;
  label: string;
  type: string;
  image?: File;
};

export const GisMapPage: React.FC = () => {
  const { user } = useAuth();
  const { pins } = useGisPins(DEFAULT_PROJECT_ID);
  const [point, setPoint] = useState<MapPoint>({
    lat: Number(import.meta.env.VITE_MAP_DEFAULT_LAT || 25.5941),
    lng: Number(import.meta.env.VITE_MAP_DEFAULT_LNG || 85.1376),
  });
  const [label, setLabel] = useState('');
  const [type, setType] = useState('Project Location');
  const [image, setImage] = useState<File | undefined>();
  const [tags, setTags] = useState<GeoTag[]>([]);
  const [geoStatus, setGeoStatus] = useState('');
  const [address, setAddress] = useState('');

  const mapUrl = useMemo(() => getStaticMapUrl(point), [point]);
  const persistedTags = useMemo<GeoTag[]>(() => pins.map((pin) => ({
    id: pin.id || `${pin.latitude}-${pin.longitude}`,
    label: String(pin.properties?.label || pin.properties?.type || 'Geo tag'),
    type: String(pin.properties?.type || 'Project Location'),
    lat: pin.latitude,
    lng: pin.longitude,
  })), [pins]);
  const visibleTags = useMemo(
    () => [...tags, ...persistedTags.filter((pin) => !tags.some((tag) => tag.id === pin.id))],
    [persistedTags, tags]
  );

  const fetchDeviceLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('Device geolocation is unavailable.');
      return;
    }

    setGeoStatus('Fetching GPS location...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPoint({ lat: position.coords.latitude, lng: position.coords.longitude });
        setGeoStatus('GPS location captured.');
      },
      () => setGeoStatus('Location permission denied or unavailable.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const addTag = async () => {
    const id = crypto.randomUUID();
    const nextTag = {
      id,
      label: label || type,
      type,
      lat: point.lat,
      lng: point.lng,
      image,
    };
    setTags((prev) => [
      nextTag,
      ...prev,
    ]);
    setLabel('');
    setImage(undefined);
    try {
      await gisPinsService.createPin({
        id,
        project_id: DEFAULT_PROJECT_ID,
        latitude: point.lat,
        longitude: point.lng,
        properties: { label: nextTag.label, type, imageName: image?.name, address },
        created_by: user?.id,
      });
    } catch (error) {
      setGeoStatus(error instanceof Error ? error.message : 'Pin saved locally but sync queue failed.');
    }
  };

  const fetchAddress = async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(new Error('Reverse geocoding timed out')), 10000);
    setGeoStatus('Resolving address...');
    try {
      const nextAddress = await reverseGeocode(point, controller.signal);
      setAddress(nextAddress || 'Address unavailable for this marker.');
      setGeoStatus('Address resolved.');
    } catch {
      setAddress('Reverse geocoding unavailable. Marker is still usable.');
      setGeoStatus('Safe fallback active.');
    } finally {
      window.clearTimeout(timeout);
    }
  };

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
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Project Geo Overview</h2>
            <p className="text-sm text-gray-400">{getMapProviderLabel()} abstraction with GPS and manual pin support.</p>
          </div>
          <OfflineSyncIndicator />
          <div className="flex flex-wrap gap-2">
            <Button onClick={fetchDeviceLocation} icon={<Navigation size={14} />}>Use GPS</Button>
            <Button variant="outline" onClick={fetchAddress} icon={<Search size={14} />}>Reverse Geocode</Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="overflow-hidden rounded-xl border border-[#333] bg-[#111]">
            {mapUrl ? (
              <img src={mapUrl} alt="Selected project map location" loading="lazy" className="h-[360px] w-full object-cover" />
            ) : (
              <div className="flex h-[360px] flex-col items-center justify-center gap-3 text-center text-gray-400">
                <MapPin size={42} className="text-[#FF6B00]" />
                <p>Set VITE_MAP_API_KEY to render a provider map preview.</p>
                <p className="text-sm">Current pin: {point.lat.toFixed(6)}, {point.lng.toFixed(6)}</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input value={point.lat} onChange={(event) => setPoint((prev) => ({ ...prev, lat: Number(event.target.value) }))} className="rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white" type="number" step="0.000001" />
              <input value={point.lng} onChange={(event) => setPoint((prev) => ({ ...prev, lng: Number(event.target.value) }))} className="rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white" type="number" step="0.000001" />
            </div>
            <input value={label} onChange={(event) => setLabel(event.target.value)} className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white" placeholder="Tag label" />
            <select value={type} onChange={(event) => setType(event.target.value)} className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white">
              <option>Project Location</option>
              <option>Material Dump</option>
              <option>Labour Camp</option>
              <option>Machinery Point</option>
            </select>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#444] px-3 py-3 text-sm text-gray-300">
              <Camera size={15} />
              {image ? image.name : 'Attach geo-tagged image'}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => setImage(event.target.files?.[0])} />
            </label>
            <Button onClick={addTag} icon={<Plus size={14} />} className="w-full">Add Geo Tag</Button>
            {geoStatus && <p className="text-xs text-gray-400">{geoStatus}</p>}
            {address && <p className="rounded-lg bg-[#111] p-3 text-xs leading-5 text-gray-300">{address}</p>}
          </div>
        </div>
      </Card>

      <Card className="bg-[#1A1A1A] border-[#333] p-6">
        <h2 className="mb-3 text-lg font-semibold text-white flex items-center gap-2">
          <Crosshair size={18} className="text-[#FF6B00]" />
          Tagged Points
        </h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {visibleTags.map((tag) => (
            <div key={tag.id} className="rounded-xl border border-[#333] bg-[#111] p-3">
              <p className="font-semibold text-white">{tag.label}</p>
              <p className="text-sm text-[#FF6B00]">{tag.type}</p>
              <p className="mt-2 text-xs text-gray-400">{tag.lat.toFixed(6)}, {tag.lng.toFixed(6)}</p>
              {tag.image && <p className="mt-1 text-xs text-gray-500">{tag.image.name}</p>}
            </div>
          ))}
          {visibleTags.length === 0 && <p className="text-sm text-gray-400">No geo-tags added yet.</p>}
        </div>
      </Card>
    </div>
  );
};
