import { aiUploadQueue } from './aiUploadQueue';

export interface ResumableUploadOptions {
  file: File;
  endpoint: string;
  fieldName?: string;
  metadata?: Record<string, string>;
  onProgress?: (percent: number) => void;
}

export interface ChunkedUploadOptions extends ResumableUploadOptions {
  chunkSize?: number;
  uploadId?: string;
}

export function uploadResumable(options: ResumableUploadOptions) {
  const id = crypto.randomUUID();
  const promise = aiUploadQueue.enqueue({
    id,
    file: options.file,
    run: (signal) => new Promise<string>((resolve, reject) => {
      const request = new XMLHttpRequest();
      const form = new FormData();

      form.append(options.fieldName || 'file', options.file);
      Object.entries(options.metadata || {}).forEach(([key, value]) => form.append(key, value));

      signal.addEventListener('abort', () => {
        request.abort();
        reject(new DOMException('Upload cancelled', 'AbortError'));
      }, { once: true });

      request.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          options.onProgress?.(Math.round((event.loaded / event.total) * 100));
        }
      };
      request.onerror = () => reject(new Error('Upload failed'));
      request.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'));
      request.onload = () => {
        if (request.status >= 200 && request.status < 300) {
          resolve(request.responseText);
          return;
        }
        reject(new Error(`Upload failed with status ${request.status}`));
      };

      request.open('POST', options.endpoint);
      request.send(form);
    }),
  });

  return { id, promise, cancel: () => aiUploadQueue.cancel(id) };
}

export function uploadChunkedResumable(options: ChunkedUploadOptions) {
  const id = options.uploadId || crypto.randomUUID();
  const chunkSize = options.chunkSize || 5 * 1024 * 1024;
  const totalChunks = Math.ceil(options.file.size / chunkSize);

  const promise = aiUploadQueue.enqueue({
    id,
    file: options.file,
    run: async (signal) => {
      let uploadedBytes = Number(localStorage.getItem(`nirman-upload:${id}:bytes`) || 0);
      let chunkIndex = Math.floor(uploadedBytes / chunkSize);

      while (chunkIndex < totalChunks) {
        if (signal.aborted) throw new DOMException('Upload cancelled', 'AbortError');

        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, options.file.size);
        const chunk = options.file.slice(start, end);
        const form = new FormData();
        form.append(options.fieldName || 'file', chunk, options.file.name);
        form.append('uploadId', id);
        form.append('chunkIndex', String(chunkIndex));
        form.append('totalChunks', String(totalChunks));
        form.append('fileName', options.file.name);
        Object.entries(options.metadata || {}).forEach(([key, value]) => form.append(key, value));

        const response = await fetch(options.endpoint, {
          method: 'POST',
          signal,
          body: form,
          headers: {
            'X-NIRMAN-Upload-Id': id,
            'X-NIRMAN-Chunk-Index': String(chunkIndex),
            'X-NIRMAN-Total-Chunks': String(totalChunks),
          },
        });

        if (!response.ok) {
          throw new Error(`Chunk upload failed with status ${response.status}`);
        }

        uploadedBytes = end;
        localStorage.setItem(`nirman-upload:${id}:bytes`, String(uploadedBytes));
        options.onProgress?.(Math.round((uploadedBytes / options.file.size) * 100));
        chunkIndex += 1;
      }

      localStorage.removeItem(`nirman-upload:${id}:bytes`);
      return id;
    },
  });

  return { id, promise, cancel: () => aiUploadQueue.cancel(id) };
}
