import { createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '../types';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  authError: string | null;
  profileError: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; user?: User | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshSession: () => Promise<void>;
  lastActivity: number;
  updateActivity: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);
