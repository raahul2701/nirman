function isEnabled(value: unknown, fallback = true) {
  if (typeof value !== 'string') return fallback;
  return value.toLowerCase() !== 'false';
}

export const featureFlags = {
  blacklist: isEnabled(import.meta.env.VITE_ENABLE_BLACKLIST),
  disputes: isEnabled(import.meta.env.VITE_ENABLE_DISPUTES),
  contractorBilling: isEnabled(import.meta.env.VITE_ENABLE_CONTRACTOR_BILLING),
  eeWorkspaceIsolation: isEnabled(import.meta.env.VITE_ENABLE_EE_WORKSPACE_ISOLATION),
  googleDrivePerEe: isEnabled(import.meta.env.VITE_ENABLE_GOOGLE_DRIVE_PER_EE),
  pilotMode: isEnabled(import.meta.env.VITE_ENABLE_PILOT_MODE, false),
} as const;
