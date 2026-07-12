// TODO: This utility should be part of a global routing/workflow service
// that understands the application's workflow routing patterns.
export const buildWorkflowRoute = (workflowId: string, entityId: string): string => {
  // Example: /je/workflow/dpr-review/dpr-xyz-123
  // In a real app, this might involve looking up routes from a centralized route config.
  return `/je/workflow/${workflowId}/${entityId}`;
};