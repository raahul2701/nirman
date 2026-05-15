import { createContext } from 'react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

export interface ToastContextType {
  toast: (message: string, type?: Toast['type']) => void;
}

export const ToastContext = createContext<ToastContextType | null>(null);
