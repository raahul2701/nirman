// Mobile-optimized upload manager with resumable uploads

export interface UploadSession {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedBytes: number;
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'failed';
  progress: number;
  error?: string;
  retries: number;
}

export class MobileUploadManager {
  private sessions = new Map<string, UploadSession>();
  private fileSessionIndex = new Map<string, string>();
  private cancelledSessions = new Set<string>();
  private listeners = new Set<(session: UploadSession) => void>();
  private maxRetries = 3;
  private chunkSize = 1024 * 1024; // 1MB chunks for mobile

  createSession(file: File): string {
    const fileKey = `${file.name}:${file.size}:${file.lastModified}`;
    const existingId = this.fileSessionIndex.get(fileKey);
    const existing = existingId ? this.sessions.get(existingId) : undefined;
    if (existing && existing.status !== 'failed' && existing.status !== 'completed') {
      return existing.id;
    }

    const id = crypto.randomUUID();
    const session: UploadSession = {
      id,
      fileName: file.name,
      fileSize: file.size,
      uploadedBytes: 0,
      status: 'pending',
      progress: 0,
      retries: 0,
    };

    this.sessions.set(id, session);
    this.fileSessionIndex.set(fileKey, id);
    this.notify(session);
    return id;
  }

  getSession(id: string): UploadSession | undefined {
    return this.sessions.get(id);
  }

  getAllSessions(): UploadSession[] {
    return Array.from(this.sessions.values());
  }

  async uploadChunk(sessionId: string, file: File, uploadFn: (chunk: Blob, offset: number, total: number) => Promise<void>): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    session.status = 'uploading';
    this.notify(session);

    try {
      for (let offset = 0; offset < file.size; offset += this.chunkSize) {
        if (this.cancelledSessions.has(sessionId)) {
          this.sessions.delete(sessionId);
          this.cancelledSessions.delete(sessionId);
          return;
        }

        // Check if still online
        if (!navigator.onLine) {
          session.status = 'paused';
          this.notify(session);
          break;
        }

        const chunk = file.slice(offset, offset + this.chunkSize);
        await uploadFn(chunk, offset, file.size);

        session.uploadedBytes = Math.min(offset + this.chunkSize, file.size);
        session.progress = Math.round((session.uploadedBytes / file.size) * 100);
        this.notify(session);
      }

      if (session.uploadedBytes === file.size) {
        session.status = 'completed';
      }
      this.notify(session);
    } catch (error) {
      session.retries++;
      if (session.retries < this.maxRetries) {
        session.status = 'paused';
        session.error = error instanceof Error ? error.message : 'Upload failed';
      } else {
        session.status = 'failed';
        session.error = 'Max retries exceeded';
      }
      this.notify(session);
      throw error;
    }
  }

  retry(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'pending';
      session.uploadedBytes = 0;
      session.progress = 0;
      this.notify(session);
    }
  }

  cancel(sessionId: string): void {
    this.cancelledSessions.add(sessionId);
    this.sessions.delete(sessionId);
    for (const [fileKey, id] of this.fileSessionIndex) {
      if (id === sessionId) this.fileSessionIndex.delete(fileKey);
    }
  }

  subscribe(listener: (session: UploadSession) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(session: UploadSession): void {
    this.listeners.forEach(cb => cb(session));
  }
}

export const mobileUploadManager = new MobileUploadManager();
