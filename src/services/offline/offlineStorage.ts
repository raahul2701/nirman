import { addImageToQueue, addToSyncQueue, deleteSyncItem, getPendingImages, getPendingSyncItems } from './offlineDB';
import { OfflinePayload } from './offlineDB';

export async function saveOfflineEntry(payload: OfflinePayload) {
  await addToSyncQueue(payload);
}

export async function getOfflineEntries() {
  return getPendingSyncItems();
}

export async function removeOfflineEntry(id: string) {
  await deleteSyncItem(id);
}

export async function saveOfflineImage(image: Blob, metadata: Record<string, unknown>) {
  await addImageToQueue(image, metadata);
}

export async function getOfflineImages() {
  return getPendingImages();
}
