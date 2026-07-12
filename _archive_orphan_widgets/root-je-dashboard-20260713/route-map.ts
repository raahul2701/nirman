/**
 * Centralized mapping of action IDs to their corresponding routes.
 *
 * TODO: This is a temporary, module-level route map. It should be replaced
 * with a global route constants file/object once available to ensure a single
 * source of truth for all application routes.
 * This decouples the action configuration from the routing implementation.
 */
export const jeRouteMap: Record<string, string> = {
  dpr: '/je/dpr',
  sitePhotos: '/je/photos',
  survey: '/je/survey',
  materialReceipt: '/je/material/receipt',
  diesel: '/je/diesel',
  labour: '/je/labour/attendance',
  equipment: '/je/equipment/log',
  hindrance: '/je/hindrance',
  inspection: '/je/inspections/new',
  mb: '/je/mb',
  raiseIssue: '/je/issues/new',
};