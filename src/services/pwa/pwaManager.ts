import { trackEvent } from '../../lib/telemetry';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

class PwaManager {
  private installPrompt: BeforeInstallPromptEvent | null = null;
  private initialized = false;
  private controllerChangeNotified = false;
  private updateListeners = new Set<() => void>();
  private networkListeners = new Set<(online: boolean, effectiveType?: string) => void>();

  init() {
    if (typeof window === 'undefined' || this.initialized) return;
    this.initialized = true;

    window.addEventListener('beforeinstallprompt', (event) => {
      this.installPrompt = null;
      trackEvent({ name: 'pwa:install-prompt-available', properties: { defaultPrevented: event.defaultPrevented } });
    });

    window.addEventListener('online', () => this.emitNetworkState());
    window.addEventListener('offline', () => this.emitNetworkState());
    this.emitNetworkState();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (this.controllerChangeNotified) return;
        this.controllerChangeNotified = true;
        this.updateListeners.forEach((listener) => listener());
      });
    }
  }

  async promptInstall() {
    if (!this.installPrompt) return 'unavailable';
    await this.installPrompt.prompt();
    const choice = await this.installPrompt.userChoice;
    trackEvent({ name: 'pwa:install-choice', properties: { outcome: choice.outcome, platform: choice.platform } });
    this.installPrompt = null;
    return choice.outcome;
  }

  async requestCameraPermission() {
    if (!navigator.mediaDevices?.getUserMedia) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      stream.getTracks().forEach((track) => track.stop());
      trackEvent({ name: 'pwa:camera-permission', properties: { granted: true } });
      return true;
    } catch (error) {
      trackEvent({ name: 'pwa:camera-permission', failed: true, properties: { message: error instanceof Error ? error.message : 'unknown' } });
      return false;
    }
  }

  async registerBackgroundSync(tag = 'nirman-offline-sync') {
    const registration = await navigator.serviceWorker?.ready;
    const sync = registration && 'sync' in registration ? (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync : null;
    if (!sync) return false;
    await sync.register(tag);
    trackEvent({ name: 'pwa:background-sync-registered', properties: { tag } });
    return true;
  }

  onUpdate(listener: () => void) {
    this.updateListeners.add(listener);
    return () => this.updateListeners.delete(listener);
  }

  onNetworkChange(listener: (online: boolean, effectiveType?: string) => void) {
    this.networkListeners.add(listener);
    this.emitNetworkState();
    return () => this.networkListeners.delete(listener);
  }

  getNetworkState() {
    const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
    return { online: navigator.onLine, effectiveType: connection?.effectiveType };
  }

  private emitNetworkState() {
    const state = this.getNetworkState();
    this.networkListeners.forEach((listener) => listener(state.online, state.effectiveType));
  }
}

export const pwaManager = new PwaManager();
