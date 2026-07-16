import { trackEvent } from '../../lib/telemetry';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type RecoveryMarker = {
  startedAt: number;
  path: string;
};

const RECOVERY_STARTED_KEY = 'nirman:pwa:recoveryStarted';
const RECOVERY_CONSUMED_KEY = 'nirman:pwa:recoveryConsumed';
const RECOVERY_TTL_MS = 10 * 60 * 1000;
const STALE_ASSET_KEYS = ['nirman:stale-assets', 'nirman:chunk-failure', 'nirman:pwa:update-available'];

function readRecoveryMarker(key: string): RecoveryMarker | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(key) || window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RecoveryMarker>;
    if (typeof parsed.startedAt !== 'number') return null;
    if (Date.now() - parsed.startedAt > RECOVERY_TTL_MS) return null;
    return { startedAt: parsed.startedAt, path: parsed.path || '/' };
  } catch {
    return null;
  }
}

function writeRecoveryMarker(key: string, marker: RecoveryMarker) {
  if (typeof window === 'undefined') return;
  const value = JSON.stringify(marker);
  window.sessionStorage.setItem(key, value);
  window.localStorage.setItem(key, value);
}

function clearRecoveryMarker(key: string) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(key);
  window.localStorage.removeItem(key);
}

function clearStaleAssetFlags() {
  if (typeof window === 'undefined') return;
  STALE_ASSET_KEYS.forEach((key) => {
    window.sessionStorage.removeItem(key);
    window.localStorage.removeItem(key);
  });
}

class PwaManager {
  private installPrompt: BeforeInstallPromptEvent | null = null;
  private initialized = false;
  private controllerChangeNotified = false;
  private updateListeners = new Set<() => void>();
  private networkListeners = new Set<(online: boolean, effectiveType?: string) => void>();
  private recoveryInProgress = false;

  init() {
    if (typeof window === 'undefined' || this.initialized) return;
    this.initialized = true;
    this.consumeRecoveryMarker();

    window.addEventListener('beforeinstallprompt', (event) => {
      this.installPrompt = null;
      trackEvent({ name: 'pwa:install-prompt-available', properties: { defaultPrevented: event.defaultPrevented } });
    });

    window.addEventListener('online', () => this.emitNetworkState());
    window.addEventListener('offline', () => this.emitNetworkState());
    this.emitNetworkState();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (this.controllerChangeNotified || this.hasActiveRecoveryMarker() || this.wasRecoveryConsumedRecently()) return;
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

  hasActiveRecoveryMarker() {
    return Boolean(readRecoveryMarker(RECOVERY_STARTED_KEY));
  }

  wasRecoveryConsumedRecently() {
    return Boolean(readRecoveryMarker(RECOVERY_CONSUMED_KEY));
  }

  isAuthRoute(pathname = typeof window === 'undefined' ? '' : window.location.pathname) {
    return pathname === '/login' || pathname.startsWith('/auth/callback');
  }

  shouldShowManualRecoveryMessage(pathname = typeof window === 'undefined' ? '' : window.location.pathname) {
    return this.isAuthRoute(pathname) && this.wasRecoveryConsumedRecently();
  }

  consumeRecoveryMarker() {
    const marker = readRecoveryMarker(RECOVERY_STARTED_KEY);
    if (!marker) {
      clearRecoveryMarker(RECOVERY_STARTED_KEY);
      return false;
    }

    clearRecoveryMarker(RECOVERY_STARTED_KEY);
    writeRecoveryMarker(RECOVERY_CONSUMED_KEY, { startedAt: Date.now(), path: marker.path });
    clearStaleAssetFlags();
    return true;
  }

  async recoverFromStaleAssets() {
    if (this.recoveryInProgress || typeof window === 'undefined') return;
    if (this.hasActiveRecoveryMarker()) return;
    this.recoveryInProgress = true;
    writeRecoveryMarker(RECOVERY_STARTED_KEY, { startedAt: Date.now(), path: window.location.pathname });
    clearRecoveryMarker(RECOVERY_CONSUMED_KEY);

    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const origin = window.location.origin;
      await Promise.all(registrations
        .filter((registration) => registration.scope.startsWith(origin))
        .map((registration) => registration.unregister()));
    }

    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.filter((name) => name.startsWith('nirman-')).map((name) => caches.delete(name)));
    }

    clearStaleAssetFlags();
    window.location.reload();
  }

  private emitNetworkState() {
    const state = this.getNetworkState();
    this.networkListeners.forEach((listener) => listener(state.online, state.effectiveType));
  }
}

export const pwaManager = new PwaManager();
