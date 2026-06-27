export interface DriveAuthState {
  enabled: boolean;
  accessToken?: string;
  expiresAt?: number;
}

export interface DriveAuthProvider {
  getAccessToken: () => Promise<string | null>;
  getState?: () => DriveAuthState;
}

const disabledDriveAuthProvider: DriveAuthProvider = {
  async getAccessToken() {
    return null;
  },
  getState() {
    return { enabled: false };
  },
};

let activeDriveAuthProvider: DriveAuthProvider = disabledDriveAuthProvider;

export function configureDriveAuthProvider(provider?: DriveAuthProvider) {
  activeDriveAuthProvider = provider || disabledDriveAuthProvider;
}

export function getDriveAuthState(): DriveAuthState {
  return activeDriveAuthProvider.getState?.() || { enabled: false };
}

export async function getOptionalDriveAccessToken() {
  try {
    return await activeDriveAuthProvider.getAccessToken();
  } catch {
    return null;
  }
}
