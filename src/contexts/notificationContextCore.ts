import { createContext } from 'react';
import type { Notification } from '../types';

export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (title: string, message: string, type?: Notification['type'], category?: string) => Promise<void>;
}

export const NotificationContext = createContext<NotificationContextType | null>(null);
