import type { LucideIcon } from 'lucide-react';

export interface Section {
  id: string;
  title: string;
  icon: LucideIcon;
}

export interface Role {
  role: string;
  can: string;
  daily: string;
  review: string;
  cannot: string;
}

export interface RouteInfoItem {
  route: string;
  purpose: string;
  users: string;
  data: string;
  steps: string[];
  result: string;
}

export interface UploadInfoItem {
  name: string;
  route: string;
  upload: string;
  who: string;
  verification: string;
  review: string;
}

export interface ProblemFixItem {
  problem: string;
  fix: string;
}

export interface ChecklistItem {
  title: string;
  items: string[];
}

export interface PilotDayItem {
  day: string;
  task: string;
  usage: string;
}

export interface FAQItem {
  q: string;
  a: string;
}
