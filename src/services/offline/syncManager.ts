import { supabase } from '../../lib/supabase';
import { getPendingSyncItems, deleteSyncItem, deletePendingImage, getPendingImages } from './offlineDB';
import { uploadFileWithRetry } from '../storageService';
import { createSignedUrl } from '../storageService';

export async function processOfflineSync() {
  const queue = await getPendingSyncItems();
  for (const item of queue) {
    try {
      await supabase.functions.invoke('sync-offline', { body: item });
      await deleteSyncItem(item.id);
    } catch (error) {
      console.warn('Offline sync failed for item', item.id, error);
    }
  }
}

export async function processOfflineImageQueue() {
  const images = await getPendingImages();
  for (const image of images) {
    try {
      const fileName = `offline/${image.id}.jpg`;
      const blob = image.image as Blob;
      await uploadFileWithRetry('diesel', fileName, new File([blob], `${image.id}.jpg`, { type: blob.type || 'image/jpeg' }));
      await deletePendingImage(image.id);
    } catch (error) {
      console.warn('Image upload retry failed', image.id, error);
    }
  }
}

export function startOfflineSync() {
  if (typeof window === 'undefined') return;

  const processAll = () => {
    if (navigator.onLine) {
      processOfflineSync();
      processOfflineImageQueue();
    }
  };

  const interval = window.setInterval(processAll, 30000);
  window.addEventListener('online', processAll);

  return () => {
    window.clearInterval(interval);
    window.removeEventListener('online', processAll);
  };
}

export async function createOfflineUploadUrl(bucket: string, path: string) {
  return createSignedUrl(bucket, path, 120);
}
