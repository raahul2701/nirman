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

  let active = true;
  let timerId: number | undefined;

  const scheduleNextSync = (delay = 30000) => {
    if (!active) return;
    timerId = window.setTimeout(runSync, delay);
  };

  const runSync = async () => {
    if (!active) return;

    if (navigator.onLine) {
      const queue = await getPendingSyncItems();
      if (queue.length > 0) {
        await processOfflineSync();
        await processOfflineImageQueue();
      }
    }

    scheduleNextSync();
  };

  const onlineHandler = () => {
    if (!active) return;
    void runSync();
  };

  void runSync();
  window.addEventListener('online', onlineHandler);

  return () => {
    active = false;
    if (typeof timerId === 'number') {
      window.clearTimeout(timerId);
    }
    window.removeEventListener('online', onlineHandler);
  };
}

export async function createOfflineUploadUrl(bucket: string, path: string) {
  return createSignedUrl(bucket, path, 120);
}
