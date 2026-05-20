export interface QueuedUpload<T> {
  id: string;
  file: File;
  run: (signal: AbortSignal) => Promise<T>;
}

type UploadTask<T> = QueuedUpload<T> & {
  controller: AbortController;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

class AiUploadQueue {
  private activeCount = 0;
  private queue: UploadTask<unknown>[] = [];
  private active = new Map<string, AbortController>();

  enqueue<T>(upload: QueuedUpload<T>) {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        ...upload,
        controller: new AbortController(),
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.pump();
    });
  }

  cancel(id: string) {
    const index = this.queue.findIndex((task) => task.id === id);
    if (index >= 0) {
      const [task] = this.queue.splice(index, 1);
      task.reject(new DOMException('Upload cancelled', 'AbortError'));
      return;
    }

    this.active.get(id)?.abort();
  }

  private pump() {
    while (this.activeCount < 2 && this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) return;

      this.activeCount += 1;
      this.active.set(task.id, task.controller);
      task.run(task.controller.signal)
        .then(task.resolve)
        .catch(task.reject)
        .finally(() => {
          this.active.delete(task.id);
          this.activeCount -= 1;
          this.pump();
        });
    }
  }
}

export const aiUploadQueue = new AiUploadQueue();
