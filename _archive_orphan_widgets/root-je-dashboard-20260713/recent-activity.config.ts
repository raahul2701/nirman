import type { LucideIcon } from 'lucide-react';

/**
 * Data Transfer Object (DTO) for a single activity event from the API.
 */
export type RecentActivityDTO = {
  id: string;
  eventType: 'DPR_SUBMITTED' | 'MATERIAL_RECEIVED' | 'INSPECTION_COMPLETED' | 'WORKFLOW_MOVED' | 'PHOTO_UPLOADED' | 'SURVEY_UPDATED';
  timestamp: string; // ISO 8601 string
  user: {
    name: string;
    role: string;
  };
  details: string;
};

/**
 * View Model for a single activity event, shaped for the UI.
 */
export interface RecentActivityViewModel {
  id: string;
  title: string;
  description: string;
  time: string;
  icon: LucideIcon;
  color: string;
}