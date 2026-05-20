const provider = ((import.meta.env.VITE_MAP_PROVIDER as string | undefined) || 'google').toLowerCase();
const apiKey = import.meta.env.VITE_MAP_API_KEY as string | undefined;

export interface MapPoint {
  lat: number;
  lng: number;
}

const previewCache = new Map<string, string>();

export function getMapProviderLabel() {
  if (provider === 'mapbox') return 'Mapbox';
  if (provider === 'osm') return 'OpenStreetMap';
  return apiKey ? 'Google Maps' : 'OpenStreetMap fallback';
}

function lonToTile(lng: number, zoom: number) {
  return Math.floor(((lng + 180) / 360) * 2 ** zoom);
}

function latToTile(lat: number, zoom: number) {
  const rad = lat * Math.PI / 180;
  return Math.floor((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * 2 ** zoom);
}

export function getStaticMapUrl(point: MapPoint) {
  const cacheKey = `${provider}:${apiKey ? 'keyed' : 'fallback'}:${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
  const cached = previewCache.get(cacheKey);
  if (cached) return cached;

  let url: string;
  if (provider === 'mapbox' && apiKey) {
    url = `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/pin-s+ff6b00(${point.lng},${point.lat})/${point.lng},${point.lat},15/900x420?access_token=${apiKey}`;
    previewCache.set(cacheKey, url);
    return url;
  }

  if (apiKey) {
    url = `https://maps.googleapis.com/maps/api/staticmap?center=${point.lat},${point.lng}&zoom=15&size=900x420&maptype=hybrid&markers=color:orange%7C${point.lat},${point.lng}&key=${apiKey}`;
    previewCache.set(cacheKey, url);
    return url;
  }

  const zoom = 15;
  url = `https://tile.openstreetmap.org/${zoom}/${lonToTile(point.lng, zoom)}/${latToTile(point.lat, zoom)}.png`;
  previewCache.set(cacheKey, url);
  return url;
}

export async function reverseGeocode(point: MapPoint, signal?: AbortSignal) {
  if (provider !== 'osm' && apiKey) {
    try {
      const googleResponse = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${point.lat},${point.lng}&key=${apiKey}`,
        { signal, headers: { Accept: 'application/json' } }
      );
      const googleData = await googleResponse.json().catch(() => null);
      const formatted = googleData?.results?.[0]?.formatted_address;
      if (googleResponse.ok && formatted) return formatted as string;
    } catch (error) {
      if (signal?.aborted) throw error;
    }
  }

  const osmResponse = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${point.lat}&lon=${point.lng}`,
    { signal, headers: { Accept: 'application/json' } }
  );

  if (!osmResponse.ok) {
    throw new Error(`Reverse geocoding failed with status ${osmResponse.status}`);
  }

  const data = await osmResponse.json();
  return data?.display_name as string | undefined;
}

export function calculateDistanceMeters(a: MapPoint, b: MapPoint) {
  const radius = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
}

export function isInsideGeofence(point: MapPoint, center: MapPoint, radiusMeters: number) {
  return calculateDistanceMeters(point, center) <= radiusMeters;
}

export function groupPinsByProject<T extends { project_id?: string }>(pins: T[]) {
  return pins.reduce<Record<string, T[]>>((acc, pin) => {
    const key = pin.project_id || 'unassigned';
    acc[key] = acc[key] || [];
    acc[key].push(pin);
    return acc;
  }, {});
}

export function estimateRouteDistance(points: MapPoint[]) {
  return points.slice(1).reduce((sum, point, index) => sum + calculateDistanceMeters(points[index], point), 0);
}

export function createProjectClusters<T extends { project_id?: string; latitude?: number; longitude?: number }>(pins: T[]) {
  return Object.entries(groupPinsByProject(pins)).map(([projectId, projectPins]) => {
    const located = projectPins.filter((pin) => typeof pin.latitude === 'number' && typeof pin.longitude === 'number');
    const center = located.length
      ? {
          lat: located.reduce((sum, pin) => sum + Number(pin.latitude), 0) / located.length,
          lng: located.reduce((sum, pin) => sum + Number(pin.longitude), 0) / located.length,
        }
      : undefined;
    return { projectId, pins: projectPins, center };
  });
}

export function segmentProjectTerritory(points: MapPoint[], radiusMeters = 250) {
  return points.map((point, index) => ({ id: `territory-${index + 1}`, center: point, radiusMeters }));
}

export function cacheOfflineLocationSnapshot(point: MapPoint, label = 'field-location') {
  try {
    localStorage.setItem('nirman:offline-location-snapshot', JSON.stringify({ point, label, capturedAt: new Date().toISOString() }));
  } catch {
    // localStorage can be unavailable in private or restricted contexts.
  }
}
