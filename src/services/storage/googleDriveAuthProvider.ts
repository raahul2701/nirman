import { configureDriveAuthProvider, type DriveAuthProvider, type DriveAuthState } from './driveAuth';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const gisScriptUrl = 'https://accounts.google.com/gsi/client';
const driveScope = 'https://www.googleapis.com/auth/drive.file';
const expirySkewMs = 60 * 1000;

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type GoogleTokenClient = {
  callback?: (response: GoogleTokenResponse) => void;
  error_callback?: (error: unknown) => void;
  requestAccessToken: (options?: { prompt?: string; scope?: string }) => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
            error_callback?: (error: unknown) => void;
          }) => GoogleTokenClient;
        };
      };
    };
  }
}

let scriptPromise: Promise<void> | null = null;
let provider: GoogleDriveAuthProvider | null = null;

function loadGoogleIdentityServices() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${gisScriptUrl}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Google Identity Services failed to load.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = gisScriptUrl;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Identity Services failed to load.'));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

class GoogleDriveAuthProvider implements DriveAuthProvider {
  private accessToken: string | null = null;
  private expiresAt = 0;
  private tokenClient: GoogleTokenClient | null = null;
  private connected = false;
  private lastError: string | null = null;
  private initPromise: Promise<void> | null = null;
  private tokenRequestPromise: Promise<string> | null = null;
  private refreshTimer: number | null = null;

  getState(): DriveAuthState {
    return {
      enabled: Boolean(clientId),
      connected: this.connected && this.hasUsableToken(),
      expiresAt: this.expiresAt || undefined,
      lastError: this.lastError,
    };
  }

  async getAccessToken() {
    if (!clientId) return null;
    if (this.hasUsableToken()) return this.accessToken;
    if (!this.connected && !this.accessToken) return null;

    try {
      return await this.requestToken('');
    } catch {
      return null;
    }
  }

  async connect() {
    if (!clientId) {
      throw new Error('VITE_GOOGLE_CLIENT_ID is not configured.');
    }
    if (this.hasUsableToken()) return this.getState();
    await this.requestToken('consent');
    return this.getState();
  }

  private hasUsableToken() {
    return Boolean(this.accessToken && Date.now() < this.expiresAt - expirySkewMs);
  }

  private scheduleRefresh() {
    if (this.refreshTimer) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    const refreshInMs = Math.max(this.expiresAt - Date.now() - expirySkewMs, 5 * 1000);
    this.refreshTimer = window.setTimeout(() => {
      void this.requestToken('').catch(() => {
        this.accessToken = null;
        this.expiresAt = 0;
        this.connected = false;
      });
    }, refreshInMs);
  }

  private async initialize() {
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      await loadGoogleIdentityServices();
      const oauth2 = window.google?.accounts?.oauth2;
      if (!oauth2 || !clientId) {
        throw new Error('Google Identity Services OAuth is unavailable.');
      }
      this.tokenClient = oauth2.initTokenClient({
        client_id: clientId,
        scope: driveScope,
        callback: () => undefined,
      });
    })();
    return this.initPromise;
  }

  private async requestToken(prompt: '' | 'consent') {
    if (this.tokenRequestPromise) return this.tokenRequestPromise;

    this.tokenRequestPromise = new Promise<string>((resolve, reject) => {
      void this.initialize()
        .then(() => {
          if (!this.tokenClient) {
            throw new Error('Google Drive OAuth client is not initialized.');
          }

          this.tokenClient.callback = (response) => {
            this.tokenRequestPromise = null;
            if (response.error || !response.access_token) {
              this.accessToken = null;
              this.expiresAt = 0;
              this.connected = false;
              if (this.refreshTimer) window.clearTimeout(this.refreshTimer);
              this.lastError = response.error_description || response.error || 'Google Drive authorization failed.';
              reject(new Error(this.lastError));
              return;
            }

            this.accessToken = response.access_token;
            this.expiresAt = Date.now() + Number(response.expires_in || 3600) * 1000;
            this.connected = true;
            this.lastError = null;
            this.scheduleRefresh();
            resolve(response.access_token);
          };
          this.tokenClient.error_callback = (error) => {
            this.tokenRequestPromise = null;
            this.lastError = error instanceof Error ? error.message : 'Google Drive authorization was cancelled or blocked.';
            reject(new Error(this.lastError));
          };
          this.tokenClient.requestAccessToken({ prompt, scope: driveScope });
        })
        .catch((error) => {
          this.tokenRequestPromise = null;
          this.lastError = error instanceof Error ? error.message : 'Google Drive authorization failed.';
          reject(error);
        });
    });

    return this.tokenRequestPromise;
  }
}

export function initializeGoogleDriveAuthProvider() {
  if (!provider) {
    provider = new GoogleDriveAuthProvider();
    configureDriveAuthProvider(provider);
  }
  return provider;
}

export async function connectGoogleDrive() {
  return initializeGoogleDriveAuthProvider().connect();
}
