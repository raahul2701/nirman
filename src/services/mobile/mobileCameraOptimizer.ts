// Mobile camera optimization - compress and cache image previews
import { compressImage } from '../ai/imageCompression';

export interface CameraPreset {
  name: string;
  maxWidth: number;
  maxHeight: number;
  quality: number;
}

const PRESETS: Record<string, CameraPreset> = {
  'high-quality': { name: 'High Quality', maxWidth: 2048, maxHeight: 2048, quality: 0.95 },
  'standard': { name: 'Standard', maxWidth: 1280, maxHeight: 1280, quality: 0.85 },
  'low-bandwidth': { name: 'Low Bandwidth', maxWidth: 640, maxHeight: 640, quality: 0.7 },
  'thumbnail': { name: 'Thumbnail', maxWidth: 256, maxHeight: 256, quality: 0.6 },
};

export class MobileCameraOptimizer {
  private previewCache = new Map<string, { url: string; expiry: number }>();
  private cacheMaxAge = 30 * 60 * 1000; // 30 minutes

  async captureAndCompress(preset: keyof typeof PRESETS = 'standard'): Promise<Blob | null> {
    const p = PRESETS[preset];
    if (!p) throw new Error(`Unknown preset: ${preset}`);

    // Fallback: return null for demo (actual implementation would use camera API)
    // In real app: would use getDisplayMedia or camera input
    return null;
  }

  async compressForUpload(file: File, preset: keyof typeof PRESETS = 'standard'): Promise<Blob> {
    const p = PRESETS[preset];
    return compressImage(file, { quality: p.quality, maxWidth: p.maxWidth, maxHeight: p.maxHeight });
  }

  async generatePreview(file: File): Promise<string> {
    const cacheKey = file.name + file.size;
    const cached = this.previewCache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      return cached.url;
    }

    // Cleanup old cache entries
    for (const [key, { expiry }] of this.previewCache) {
      if (expiry < Date.now()) {
        this.previewCache.delete(key);
      }
    }

    // Generate thumbnail
    const thumbnail = await this.compressForUpload(file, 'thumbnail');
    const url = URL.createObjectURL(thumbnail);

    this.previewCache.set(cacheKey, {
      url,
      expiry: Date.now() + this.cacheMaxAge,
    });

    return url;
  }

  getLowBandwidthBlob(file: File): Promise<Blob> {
    return this.compressForUpload(file, 'low-bandwidth');
  }

  clearPreviewCache(): void {
    for (const { url } of this.previewCache.values()) {
      URL.revokeObjectURL(url);
    }
    this.previewCache.clear();
  }
}

export const mobileCameraOptimizer = new MobileCameraOptimizer();
